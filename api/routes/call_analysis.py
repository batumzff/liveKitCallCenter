"""
Call Analysis API routes
Real-time call analysis, transcription, and sentiment analysis
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from models import Call, CallAnalysis
from database import get_database
import openai
import os

router = APIRouter()
logger = logging.getLogger(__name__)

# Analysis models
class CallTranscriptRequest(BaseModel):
    call_id: str
    transcript: str
    audio_url: Optional[str] = None
    speaker_labels: Optional[List[Dict]] = None

class CallAnalysisRequest(BaseModel):
    call_id: str
    force_reanalysis: bool = False

class SentimentAnalysisResult(BaseModel):
    sentiment: str  # positive, negative, neutral
    confidence: float
    emotions: Dict[str, float]  # anger, joy, sadness, etc.

class CallSuccessAnalysis(BaseModel):
    success_probability: float
    success_indicators: List[str]
    failure_indicators: List[str]
    voicemail_detected: bool
    call_outcome: str  # successful, failed, voicemail, no_answer

class CallQualityMetrics(BaseModel):
    clarity_score: float
    duration_analysis: Dict[str, Any]
    interruption_count: int
    dead_air_duration: float

# Analysis functions
async def analyze_sentiment(transcript: str) -> SentimentAnalysisResult:
    """Analyze sentiment using OpenAI API"""
    try:
        client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """You are a call center sentiment analyzer. Analyze the sentiment and emotions in call transcripts.
                    
                    Return a JSON response with:
                    {
                        "sentiment": "positive|negative|neutral",
                        "confidence": 0.0-1.0,
                        "emotions": {
                            "anger": 0.0-1.0,
                            "joy": 0.0-1.0,
                            "sadness": 0.0-1.0,
                            "frustration": 0.0-1.0,
                            "satisfaction": 0.0-1.0
                        }
                    }"""
                },
                {
                    "role": "user",
                    "content": f"Analyze this call transcript:\n\n{transcript}"
                }
            ],
            response_format={"type": "json_object"}
        )
        
        result = response.choices[0].message.content
        import json
        analysis = json.loads(result)
        
        return SentimentAnalysisResult(**analysis)
        
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        return SentimentAnalysisResult(
            sentiment="neutral",
            confidence=0.0,
            emotions={"error": 1.0}
        )

async def analyze_call_success(transcript: str, call_duration: int) -> CallSuccessAnalysis:
    """Analyze if the call was successful"""
    try:
        client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """You are a call center success analyzer. Determine if a call was successful based on transcript and duration.
                    
                    Return JSON:
                    {
                        "success_probability": 0.0-1.0,
                        "success_indicators": ["list", "of", "indicators"],
                        "failure_indicators": ["list", "of", "indicators"],
                        "voicemail_detected": true/false,
                        "call_outcome": "successful|failed|voicemail|no_answer"
                    }"""
                },
                {
                    "role": "user",
                    "content": f"Analyze this call (duration: {call_duration}s):\n\n{transcript}"
                }
            ],
            response_format={"type": "json_object"}
        )
        
        result = response.choices[0].message.content
        import json
        analysis = json.loads(result)
        
        return CallSuccessAnalysis(**analysis)
        
    except Exception as e:
        logger.error(f"Success analysis failed: {e}")
        return CallSuccessAnalysis(
            success_probability=0.5,
            success_indicators=[],
            failure_indicators=["Analysis failed"],
            voicemail_detected=False,
            call_outcome="failed"
        )

async def extract_key_insights(transcript: str) -> Dict[str, Any]:
    """Extract key insights and topics from call"""
    try:
        client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """Extract key insights from call transcripts.
                    
                    Return JSON:
                    {
                        "key_topics": ["topic1", "topic2"],
                        "customer_intent": "what customer wanted",
                        "agent_performance": "brief assessment",
                        "action_items": ["follow up tasks"],
                        "customer_satisfaction": 0.0-1.0
                    }"""
                },
                {
                    "role": "user",
                    "content": f"Extract insights from:\n\n{transcript}"
                }
            ],
            response_format={"type": "json_object"}
        )
        
        result = response.choices[0].message.content
        import json
        return json.loads(result)
        
    except Exception as e:
        logger.error(f"Insight extraction failed: {e}")
        return {"error": str(e)}

# API Endpoints
@router.post("/analyze/transcript")
async def process_call_transcript(
    request: CallTranscriptRequest,
    background_tasks: BackgroundTasks
):
    """Process and store call transcript"""
    try:
        # Find the call
        call = await Call.get(request.call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        # Update call with transcript
        call.transcript = request.transcript
        call.updated_at = datetime.utcnow()
        await call.save()
        
        # Start background analysis
        background_tasks.add_task(
            analyze_call_complete,
            request.call_id,
            request.transcript
        )
        
        return {
            "message": "Transcript processed, analysis started",
            "call_id": request.call_id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Transcript processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze/call/{call_id}")
async def analyze_call(call_id: str, background_tasks: BackgroundTasks):
    """Trigger comprehensive call analysis"""
    try:
        call = await Call.get(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        if not call.transcript:
            raise HTTPException(status_code=400, detail="No transcript available for analysis")
        
        # Start analysis
        background_tasks.add_task(
            analyze_call_complete,
            call_id,
            call.transcript
        )
        
        return {
            "message": "Call analysis started",
            "call_id": call_id,
            "status": "analyzing"
        }
        
    except Exception as e:
        logger.error(f"Call analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def analyze_call_complete(call_id: str, transcript: str):
    """Complete call analysis (background task)"""
    try:
        logger.info(f"Starting complete analysis for call {call_id}")
        
        # Get call
        call = await Call.get(call_id)
        if not call:
            logger.error(f"Call {call_id} not found during analysis")
            return
        
        # Calculate duration
        duration = 0
        if call.started_at and call.ended_at:
            duration = int((call.ended_at - call.started_at).total_seconds())
        elif call.duration_seconds:
            duration = call.duration_seconds
        
        # Run all analyses
        sentiment_result = await analyze_sentiment(transcript)
        success_result = await analyze_call_success(transcript, duration)
        insights = await extract_key_insights(transcript)
        
        # Create analysis record
        analysis = CallAnalysis(
            call_id=call_id,
            sentiment=sentiment_result.sentiment,
            sentiment_confidence=sentiment_result.confidence,
            emotions=sentiment_result.emotions,
            success_probability=success_result.success_probability,
            success_indicators=success_result.success_indicators,
            failure_indicators=success_result.failure_indicators,
            voicemail_detected=success_result.voicemail_detected,
            call_outcome=success_result.call_outcome,
            key_topics=insights.get("key_topics", []),
            customer_intent=insights.get("customer_intent", ""),
            agent_performance=insights.get("agent_performance", ""),
            action_items=insights.get("action_items", []),
            customer_satisfaction=insights.get("customer_satisfaction", 0.5),
            analysis_timestamp=datetime.utcnow()
        )
        
        await analysis.save()
        
        # Update call with analysis results
        call.call_outcome = success_result.call_outcome
        call.sentiment = sentiment_result.sentiment
        call.analysis_completed = True
        call.updated_at = datetime.utcnow()
        await call.save()
        
        logger.info(f"Analysis completed for call {call_id}")
        
    except Exception as e:
        logger.error(f"Complete analysis failed for call {call_id}: {e}")

@router.get("/analysis/{call_id}")
async def get_call_analysis(call_id: str):
    """Get analysis results for a call"""
    try:
        analysis = await CallAnalysis.find_one(CallAnalysis.call_id == call_id)
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return analysis
        
    except Exception as e:
        logger.error(f"Get analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis/project/{project_id}")
async def get_project_analysis_summary(project_id: str):
    """Get analysis summary for all calls in a project"""
    try:
        # Get all calls for project
        calls = await Call.find(Call.project_id == project_id).to_list()
        call_ids = [str(call.id) for call in calls]
        
        # Get all analyses
        analyses = await CallAnalysis.find(
            CallAnalysis.call_id.in_(call_ids)
        ).to_list()
        
        if not analyses:
            return {
                "project_id": project_id,
                "total_calls": len(calls),
                "analyzed_calls": 0,
                "summary": "No analyses available"
            }
        
        # Calculate summary statistics
        sentiments = [a.sentiment for a in analyses]
        success_rates = [a.success_probability for a in analyses]
        customer_satisfaction = [a.customer_satisfaction for a in analyses if a.customer_satisfaction > 0]
        
        sentiment_counts = {
            "positive": sentiments.count("positive"),
            "negative": sentiments.count("negative"),
            "neutral": sentiments.count("neutral")
        }
        
        return {
            "project_id": project_id,
            "total_calls": len(calls),
            "analyzed_calls": len(analyses),
            "sentiment_distribution": sentiment_counts,
            "average_success_rate": sum(success_rates) / len(success_rates) if success_rates else 0,
            "average_satisfaction": sum(customer_satisfaction) / len(customer_satisfaction) if customer_satisfaction else 0,
            "voicemail_rate": len([a for a in analyses if a.voicemail_detected]) / len(analyses),
            "success_rate": len([a for a in analyses if a.success_probability > 0.7]) / len(analyses)
        }
        
    except Exception as e:
        logger.error(f"Project analysis summary failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))