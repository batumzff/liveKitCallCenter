from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query
from models import Call, CallAnalytics, Project, AIAgent, Campaign
from pymongo import DESCENDING

router = APIRouter()


@router.get("/calls/{call_id}", response_model=CallAnalytics)
async def get_call_analytics(call_id: str):
    """Get analytics for a specific call"""
    analytics = await CallAnalytics.find_one(CallAnalytics.call_id == call_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Call analytics not found")
    return analytics


@router.post("/calls/{call_id}/analyze")
async def analyze_call(call_id: str):
    """Analyze a call and generate analytics"""
    call = await Call.get(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Check if analytics already exists
    existing_analytics = await CallAnalytics.find_one(CallAnalytics.call_id == call_id)
    if existing_analytics:
        return {"message": "Analytics already exists", "analytics_id": existing_analytics.id}
    
    # Mock analysis - in real implementation, this would use AI services
    analytics_data = {
        "call_id": call_id,
        "project_id": call.project_id,
        "total_words": 150 if call.transcript else 0,
        "agent_talk_time_seconds": call.duration_seconds // 2 if call.duration_seconds else 0,
        "caller_talk_time_seconds": call.duration_seconds // 2 if call.duration_seconds else 0,
        "silence_duration_seconds": 5,
        "interruptions_count": 2,
        "emotions": {
            "positive": 0.7,
            "neutral": 0.2,
            "negative": 0.1
        },
        "confidence_scores": {
            "speech_recognition": 0.85,
            "sentiment_analysis": 0.78
        },
        "response_time_avg_ms": 1200,
        "task_completion_rate": 0.8,
        "customer_satisfaction_score": 4
    }
    
    analytics = CallAnalytics(**analytics_data)
    await analytics.save()
    
    return {"message": "Call analyzed successfully", "analytics_id": analytics.id}


@router.get("/project/{project_id}/summary")
async def get_project_analytics_summary(
    project_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze")
):
    """Get analytics summary for a project"""
    # Verify project exists
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get calls in date range
    calls = await Call.find(
        Call.project_id == project_id,
        Call.started_at >= start_date,
        Call.started_at <= end_date
    ).to_list()
    
    # Calculate basic metrics
    total_calls = len(calls)
    completed_calls = len([c for c in calls if c.call_status == "completed"])
    failed_calls = len([c for c in calls if c.call_status == "failed"])
    answered_calls = len([c for c in calls if c.answered_at is not None])
    
    # Calculate durations
    total_duration = sum([c.duration_seconds or 0 for c in calls])
    avg_duration = total_duration / completed_calls if completed_calls > 0 else 0
    
    # Get analytics for completed calls
    call_ids = [c.id for c in calls if c.call_status == "completed"]
    analytics_list = await CallAnalytics.find(
        {"call_id": {"$in": call_ids}}
    ).to_list()
    
    # Calculate advanced metrics
    avg_sentiment = 0
    avg_satisfaction = 0
    total_interruptions = 0
    
    if analytics_list:
        positive_emotions = [a.emotions.get("positive", 0) for a in analytics_list]
        avg_sentiment = sum(positive_emotions) / len(positive_emotions)
        
        satisfaction_scores = [a.customer_satisfaction_score for a in analytics_list if a.customer_satisfaction_score]
        avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores) if satisfaction_scores else 0
        
        total_interruptions = sum([a.interruptions_count or 0 for a in analytics_list])
    
    return {
        "project_id": project_id,
        "period_days": days,
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "call_metrics": {
            "total_calls": total_calls,
            "completed_calls": completed_calls,
            "failed_calls": failed_calls,
            "answered_calls": answered_calls,
            "answer_rate": answered_calls / total_calls if total_calls > 0 else 0,
            "completion_rate": completed_calls / total_calls if total_calls > 0 else 0
        },
        "duration_metrics": {
            "total_duration_seconds": total_duration,
            "average_duration_seconds": int(avg_duration),
            "total_duration_hours": round(total_duration / 3600, 2)
        },
        "quality_metrics": {
            "average_sentiment_score": round(avg_sentiment, 2),
            "average_satisfaction_score": round(avg_satisfaction, 1),
            "total_interruptions": total_interruptions,
            "avg_interruptions_per_call": round(total_interruptions / completed_calls, 1) if completed_calls > 0 else 0
        }
    }


@router.get("/project/{project_id}/trends")
async def get_project_trends(
    project_id: str,
    days: int = Query(30, ge=7, le=365, description="Number of days for trend analysis")
):
    """Get trend data for a project"""
    # Verify project exists
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get calls grouped by day
    calls = await Call.find(
        Call.project_id == project_id,
        Call.started_at >= start_date,
        Call.started_at <= end_date
    ).sort([("started_at", 1)]).to_list()
    
    # Group calls by date
    daily_stats = {}
    for call in calls:
        date_key = call.started_at.strftime("%Y-%m-%d")
        if date_key not in daily_stats:
            daily_stats[date_key] = {
                "date": date_key,
                "total_calls": 0,
                "completed_calls": 0,
                "failed_calls": 0,
                "total_duration": 0
            }
        
        daily_stats[date_key]["total_calls"] += 1
        if call.call_status == "completed":
            daily_stats[date_key]["completed_calls"] += 1
            daily_stats[date_key]["total_duration"] += call.duration_seconds or 0
        elif call.call_status == "failed":
            daily_stats[date_key]["failed_calls"] += 1
    
    # Convert to list and sort by date
    trend_data = list(daily_stats.values())
    trend_data.sort(key=lambda x: x["date"])
    
    return {
        "project_id": project_id,
        "period_days": days,
        "trends": trend_data
    }


@router.get("/project/{project_id}/agent-performance")
async def get_agent_performance(
    project_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze")
):
    """Get performance metrics for all agents in a project"""
    # Verify project exists
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all agents for the project
    agents = await AIAgent.find(
        AIAgent.project_id == project_id,
        AIAgent.is_active == True
    ).to_list()
    
    if not agents:
        return {"project_id": project_id, "agents": []}
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    agent_performance = []
    
    for agent in agents:
        # Get calls for this agent
        calls = await Call.find(
            Call.project_id == project_id,
            Call.ai_agent_id == agent.id,
            Call.started_at >= start_date,
            Call.started_at <= end_date
        ).to_list()
        
        if not calls:
            agent_performance.append({
                "agent_id": agent.id,
                "agent_name": agent.name,
                "metrics": {
                    "total_calls": 0,
                    "completed_calls": 0,
                    "completion_rate": 0,
                    "average_duration": 0,
                    "average_sentiment": 0,
                    "average_satisfaction": 0
                }
            })
            continue
        
        # Calculate metrics
        total_calls = len(calls)
        completed_calls = len([c for c in calls if c.call_status == "completed"])
        completion_rate = completed_calls / total_calls if total_calls > 0 else 0
        
        total_duration = sum([c.duration_seconds or 0 for c in calls if c.call_status == "completed"])
        avg_duration = total_duration / completed_calls if completed_calls > 0 else 0
        
        # Get analytics for this agent's calls
        call_ids = [c.id for c in calls if c.call_status == "completed"]
        analytics_list = await CallAnalytics.find(
            {"call_id": {"$in": call_ids}}
        ).to_list()
        
        avg_sentiment = 0
        avg_satisfaction = 0
        if analytics_list:
            positive_emotions = [a.emotions.get("positive", 0) for a in analytics_list]
            avg_sentiment = sum(positive_emotions) / len(positive_emotions)
            
            satisfaction_scores = [a.customer_satisfaction_score for a in analytics_list if a.customer_satisfaction_score]
            avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores) if satisfaction_scores else 0
        
        agent_performance.append({
            "agent_id": agent.id,
            "agent_name": agent.name,
            "metrics": {
                "total_calls": total_calls,
                "completed_calls": completed_calls,
                "completion_rate": round(completion_rate, 2),
                "average_duration": int(avg_duration),
                "average_sentiment": round(avg_sentiment, 2),
                "average_satisfaction": round(avg_satisfaction, 1)
            }
        })
    
    return {
        "project_id": project_id,
        "period_days": days,
        "agents": agent_performance
    }


@router.get("/project/{project_id}/call-outcomes")
async def get_call_outcomes_analysis(
    project_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze")
):
    """Get analysis of call outcomes for a project"""
    # Verify project exists
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get calls with outcomes
    calls = await Call.find(
        Call.project_id == project_id,
        Call.started_at >= start_date,
        Call.started_at <= end_date,
        Call.call_outcome != None
    ).to_list()
    
    # Group by outcome
    outcome_counts = {}
    for call in calls:
        outcome = call.call_outcome or "Unknown"
        outcome_counts[outcome] = outcome_counts.get(outcome, 0) + 1
    
    # Convert to list format
    outcomes = [
        {"outcome": outcome, "count": count, "percentage": round(count / len(calls) * 100, 1)}
        for outcome, count in outcome_counts.items()
    ]
    
    # Sort by count descending
    outcomes.sort(key=lambda x: x["count"], reverse=True)
    
    return {
        "project_id": project_id,
        "period_days": days,
        "total_calls_with_outcomes": len(calls),
        "outcomes": outcomes
    }


@router.get("/project/{project_id}/export")
async def export_project_data(
    project_id: str,
    format: str = Query("json", regex="^(json|csv)$", description="Export format"),
    days: int = Query(30, ge=1, le=365, description="Number of days to export"),
    include_transcripts: bool = Query(False, description="Include call transcripts")
):
    """Export project data in various formats"""
    # Verify project exists
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get calls
    calls = await Call.find(
        Call.project_id == project_id,
        Call.started_at >= start_date,
        Call.started_at <= end_date
    ).sort([("started_at", -1)]).to_list()
    
    # Prepare export data
    export_data = []
    for call in calls:
        call_data = {
            "call_id": call.id,
            "phone_number": call.phone_number,
            "call_type": call.call_type,
            "call_status": call.call_status,
            "started_at": call.started_at.isoformat() if call.started_at else None,
            "answered_at": call.answered_at.isoformat() if call.answered_at else None,
            "ended_at": call.ended_at.isoformat() if call.ended_at else None,
            "duration_seconds": call.duration_seconds,
            "call_outcome": call.call_outcome,
            "sentiment_score": call.sentiment_score,
            "call_summary": call.call_summary,
            "key_points": call.key_points,
            "action_items": call.action_items
        }
        
        if include_transcripts:
            call_data["transcript"] = call.transcript
        
        export_data.append(call_data)
    
    if format == "json":
        return {
            "project_id": project_id,
            "project_name": project.name,
            "export_date": datetime.utcnow().isoformat(),
            "period_days": days,
            "total_calls": len(export_data),
            "calls": export_data
        }
    elif format == "csv":
        # For CSV format, we'll return the data structure that can be converted to CSV
        # In a real implementation, you might want to use pandas or csv module
        return {
            "format": "csv",
            "headers": list(export_data[0].keys()) if export_data else [],
            "data": export_data,
            "metadata": {
                "project_id": project_id,
                "project_name": project.name,
                "export_date": datetime.utcnow().isoformat(),
                "period_days": days,
                "total_calls": len(export_data)
            }
        }