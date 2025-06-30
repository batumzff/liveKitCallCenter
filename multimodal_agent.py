"""
Multimodal Assistant Implementation
Enhanced agent with voice, text, and data processing capabilities
"""

import asyncio
import logging
import os
import json
from typing import Dict, Any, Optional, List
from datetime import datetime

from livekit.agents import (
    JobContext,
    AutoSubscribe,
)
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.agents.llm import (
    ChatContext,
    ChatMessage,
    ChatRole,
    FunctionContext,
    TypeInfo,
)
from livekit.agents.tts import StreamAdapter as TTSStreamAdapter
from livekit.agents.stt import StreamAdapter as STTStreamAdapter
from livekit import rtc
from dotenv import load_dotenv

# AI provider imports
try:
    from livekit.plugins.openai import LLM, STT, TTS
except ImportError:
    LLM = STT = TTS = None

try:
    from livekit.plugins.elevenlabs import TTS as ElevenLabsTTS
except ImportError:
    ElevenLabsTTS = None

from database import init_db
from models import AIAgent, Call, Contact, CallAnalytics

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MultimodalCallCenterAgent:
    """Enhanced multimodal agent with advanced capabilities"""
    
    def __init__(self, agent_config: AIAgent):
        self.agent_config = agent_config
        self.current_call = None
        self.contact_info = None
        self.conversation_history = []
        self.call_analytics = {
            "sentiment_scores": [],
            "key_topics": [],
            "action_items": [],
            "customer_intent": None,
            "resolution_status": "pending"
        }
    
    async def create_enhanced_llm(self):
        """Create LLM with function calling capabilities"""
        if not LLM:
            raise RuntimeError("OpenAI plugin not available")
        
        # Enhanced system functions for call center operations
        fnc_ctx = FunctionContext()
        
        # Customer lookup function
        @fnc_ctx.function()
        async def lookup_customer(
            phone_number: Annotated[str, TypeInfo(description="Customer phone number")]
        ) -> str:
            """Look up customer information by phone number"""
            try:
                contact = await Contact.find_one(Contact.phone_number == phone_number)
                if contact:
                    self.contact_info = contact
                    return f"Customer found: {contact.name}, Email: {contact.email or 'N/A'}, Notes: {contact.notes or 'None'}"
                else:
                    return "Customer not found in our database"
            except Exception as e:
                logger.error(f"Error looking up customer: {e}")
                return "Unable to lookup customer information at this time"
        
        # Call outcome function
        @fnc_ctx.function()
        async def set_call_outcome(
            outcome: Annotated[str, TypeInfo(description="Call outcome: resolved, escalated, callback_requested, or not_resolved")],
            summary: Annotated[str, TypeInfo(description="Brief summary of the call")]
        ) -> str:
            """Set the outcome and summary for the current call"""
            try:
                if self.current_call:
                    self.current_call.call_outcome = outcome
                    self.current_call.call_summary = summary
                    await self.current_call.save()
                    self.call_analytics["resolution_status"] = outcome
                    return f"Call outcome set to: {outcome}"
                return "No active call to update"
            except Exception as e:
                logger.error(f"Error setting call outcome: {e}")
                return "Unable to set call outcome"
        
        # Add action item function
        @fnc_ctx.function()
        async def add_action_item(
            action: Annotated[str, TypeInfo(description="Action item to be completed")]
        ) -> str:
            """Add an action item for follow-up"""
            try:
                if self.current_call:
                    if not self.current_call.action_items:
                        self.current_call.action_items = []
                    self.current_call.action_items.append(action)
                    await self.current_call.save()
                    self.call_analytics["action_items"].append(action)
                    return f"Action item added: {action}"
                return "No active call to add action item"
            except Exception as e:
                logger.error(f"Error adding action item: {e}")
                return "Unable to add action item"
        
        # Schedule callback function
        @fnc_ctx.function()
        async def schedule_callback(
            callback_time: Annotated[str, TypeInfo(description="Preferred callback time")],
            reason: Annotated[str, TypeInfo(description="Reason for callback")]
        ) -> str:
            """Schedule a callback for the customer"""
            try:
                action = f"Schedule callback for {callback_time} - Reason: {reason}"
                await add_action_item(action)
                return f"Callback scheduled for {callback_time}"
            except Exception as e:
                logger.error(f"Error scheduling callback: {e}")
                return "Unable to schedule callback"
        
        # Transfer call function
        @fnc_ctx.function()
        async def transfer_call(
            department: Annotated[str, TypeInfo(description="Department to transfer to: technical, billing, sales, or manager")],
            reason: Annotated[str, TypeInfo(description="Reason for transfer")]
        ) -> str:
            """Transfer the call to another department"""
            try:
                if self.current_call:
                    transfer_note = f"Transferred to {department} - Reason: {reason}"
                    self.current_call.call_outcome = "transferred"
                    self.current_call.call_summary = transfer_note
                    await self.current_call.save()
                    return f"Call being transferred to {department}. Please hold while I connect you."
                return "No active call to transfer"
            except Exception as e:
                logger.error(f"Error transferring call: {e}")
                return "Unable to transfer call at this time"
        
        return LLM(
            model="gpt-4-turbo-preview",
            temperature=self.agent_config.behavior_settings.get("temperature", 0.7),
            max_tokens=self.agent_config.behavior_settings.get("max_tokens", 500),
            function_context=fnc_ctx,
        )
    
    async def create_enhanced_chat_context(self, room_name: str) -> ChatContext:
        """Create enhanced chat context with multimodal capabilities"""
        initial_ctx = ChatContext()
        
        # Enhanced system prompt
        system_prompt = f"""
{self.agent_config.prompt}

ADDITIONAL CAPABILITIES:
You have access to the following functions:
- lookup_customer(phone_number): Find customer information
- set_call_outcome(outcome, summary): Set call resolution status
- add_action_item(action): Add follow-up tasks
- schedule_callback(time, reason): Schedule customer callbacks
- transfer_call(department, reason): Transfer to other departments

CALL CENTER GUIDELINES:
1. Always be professional and empathetic
2. Listen actively and ask clarifying questions
3. Use available functions to provide better service
4. Document important information and action items
5. Resolve issues when possible or escalate appropriately
6. Summarize next steps clearly before ending calls

CONVERSATION FLOW:
1. Greet the customer warmly
2. Gather their phone number and look up their information
3. Listen to their inquiry or concern
4. Use available tools and knowledge to assist
5. Document outcomes and next steps
6. Ensure customer satisfaction before ending

Remember: Your goal is to provide excellent customer service while efficiently resolving inquiries.
"""
        
        initial_ctx.messages.append(
            ChatMessage(
                role=ChatRole.SYSTEM,
                content=system_prompt
            )
        )
        
        return initial_ctx
    
    async def analyze_conversation_sentiment(self, text: str) -> float:
        """Analyze sentiment of conversation text"""
        try:
            # Simple sentiment analysis (in production, use proper sentiment analysis)
            positive_words = ["good", "great", "excellent", "satisfied", "happy", "thanks", "appreciate"]
            negative_words = ["bad", "terrible", "awful", "angry", "frustrated", "upset", "disappointed"]
            
            text_lower = text.lower()
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            if positive_count + negative_count == 0:
                return 0.0  # Neutral
            
            sentiment = (positive_count - negative_count) / (positive_count + negative_count)
            self.call_analytics["sentiment_scores"].append(sentiment)
            
            return sentiment
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return 0.0
    
    async def extract_key_points(self, conversation_text: str) -> List[str]:
        """Extract key points from conversation"""
        try:
            # Simple keyword extraction (in production, use NLP libraries)
            key_phrases = []
            
            # Look for common call center patterns
            patterns = [
                "billing issue", "payment problem", "technical support", 
                "account access", "service inquiry", "complaint",
                "refund request", "upgrade", "cancellation"
            ]
            
            text_lower = conversation_text.lower()
            for pattern in patterns:
                if pattern in text_lower:
                    key_phrases.append(pattern)
                    
            self.call_analytics["key_topics"].extend(key_phrases)
            return key_phrases
            
        except Exception as e:
            logger.error(f"Error extracting key points: {e}")
            return []
    
    async def update_call_analytics(self):
        """Update call analytics in database"""
        try:
            if not self.current_call:
                return
            
            # Calculate average sentiment
            if self.call_analytics["sentiment_scores"]:
                avg_sentiment = sum(self.call_analytics["sentiment_scores"]) / len(self.call_analytics["sentiment_scores"])
                self.current_call.sentiment_score = avg_sentiment
            
            # Set key points
            if self.call_analytics["key_topics"]:
                self.current_call.key_points = list(set(self.call_analytics["key_topics"]))
            
            # Set action items
            if self.call_analytics["action_items"]:
                self.current_call.action_items = self.call_analytics["action_items"]
            
            await self.current_call.save()
            
            # Create detailed analytics record
            analytics_data = {
                "call_id": self.current_call.id,
                "project_id": self.current_call.project_id,
                "emotions": {
                    "average_sentiment": avg_sentiment if self.call_analytics["sentiment_scores"] else 0.0,
                    "sentiment_range": {
                        "min": min(self.call_analytics["sentiment_scores"]) if self.call_analytics["sentiment_scores"] else 0.0,
                        "max": max(self.call_analytics["sentiment_scores"]) if self.call_analytics["sentiment_scores"] else 0.0
                    }
                },
                "confidence_scores": {
                    "topic_extraction": 0.8,
                    "sentiment_analysis": 0.75
                },
                "task_completion_rate": 1.0 if self.call_analytics["resolution_status"] == "resolved" else 0.5,
                "customer_satisfaction_score": 5 if avg_sentiment > 0.3 else (3 if avg_sentiment > -0.3 else 1) if self.call_analytics["sentiment_scores"] else None
            }
            
            analytics = CallAnalytics(**analytics_data)
            await analytics.save()
            
            logger.info(f"Updated call analytics for call {self.current_call.id}")
            
        except Exception as e:
            logger.error(f"Error updating call analytics: {e}")
    
    async def handle_conversation_update(self, text: str, is_agent: bool):
        """Handle conversation updates for real-time analysis"""
        try:
            # Store conversation
            self.conversation_history.append({
                "speaker": "agent" if is_agent else "customer",
                "text": text,
                "timestamp": datetime.utcnow()
            })
            
            # Analyze customer messages
            if not is_agent:
                sentiment = await self.analyze_conversation_sentiment(text)
                key_points = await self.extract_key_points(text)
                
                logger.info(f"Conversation analysis - Sentiment: {sentiment:.2f}, Key points: {key_points}")
            
        except Exception as e:
            logger.error(f"Error handling conversation update: {e}")


async def multimodal_entrypoint(ctx: JobContext):
    """Enhanced multimodal agent entrypoint"""
    logger.info(f"Starting multimodal agent for room: {ctx.room.name}")
    
    try:
        # Initialize database
        await init_db()
        
        # Get agent configuration
        agent_id = ctx.room.metadata.get("agent_id") if ctx.room.metadata else None
        if agent_id:
            agent_config = await AIAgent.get(agent_id)
        else:
            # Create default config
            from agent import create_default_agent_config
            agent_config = create_default_agent_config()
        
        # Create multimodal agent
        multimodal_agent = MultimodalCallCenterAgent(agent_config)
        
        # Get call information if available
        call_id = ctx.room.metadata.get("call_id") if ctx.room.metadata else None
        if call_id:
            multimodal_agent.current_call = await Call.get(call_id)
        
        # Create enhanced AI components
        llm = await multimodal_agent.create_enhanced_llm()
        stt = STT() if STT else None
        tts = TTS() if TTS else None
        
        if not (llm and stt and tts):
            raise RuntimeError("Required AI components not available")
        
        # Create enhanced chat context
        chat_ctx = await multimodal_agent.create_enhanced_chat_context(ctx.room.name)
        
        # Create voice assistant
        assistant = VoiceAssistant(
            vad=rtc.VAD.load(),
            stt=stt,
            llm=llm,
            tts=tts,
            chat_ctx=chat_ctx,
        )
        
        # Enhanced event handlers
        @ctx.room.on("participant_connected")
        def on_participant_connected(participant: rtc.RemoteParticipant):
            logger.info(f"Participant connected: {participant.identity}")
            asyncio.create_task(handle_participant_connected(participant, multimodal_agent))
        
        @ctx.room.on("participant_disconnected")
        def on_participant_disconnected(participant: rtc.RemoteParticipant):
            logger.info(f"Participant disconnected: {participant.identity}")
            asyncio.create_task(handle_participant_disconnected(participant, multimodal_agent))
        
        # Monitor conversation for analytics
        original_say = assistant.say
        async def enhanced_say(text: str, **kwargs):
            await multimodal_agent.handle_conversation_update(text, is_agent=True)
            return await original_say(text, **kwargs)
        assistant.say = enhanced_say
        
        # Start the assistant
        assistant.start(ctx.room)
        
        # Wait and greet
        await asyncio.sleep(1)
        greeting = agent_config.behavior_settings.get(
            "greeting",
            f"Merhaba! Ben {agent_config.name}. Size nasıl yardımcı olabilirim? Öncelikle telefon numaranızı öğrenebilir miyim?"
        )
        await assistant.say(greeting, allow_interruptions=True)
        
    except Exception as e:
        logger.error(f"Error in multimodal entrypoint: {e}")
        raise


async def handle_participant_connected(participant: rtc.RemoteParticipant, agent: MultimodalCallCenterAgent):
    """Enhanced participant connection handler"""
    try:
        if agent.current_call:
            agent.current_call.participant_id = participant.identity
            agent.current_call.call_status = "answered"
            agent.current_call.answered_at = datetime.utcnow()
            await agent.current_call.save()
            
        logger.info(f"Enhanced handler - participant connected: {participant.identity}")
    except Exception as e:
        logger.error(f"Error in enhanced participant connection handler: {e}")


async def handle_participant_disconnected(participant: rtc.RemoteParticipant, agent: MultimodalCallCenterAgent):
    """Enhanced participant disconnection handler"""
    try:
        if agent.current_call:
            agent.current_call.call_status = "completed"
            agent.current_call.ended_at = datetime.utcnow()
            
            if agent.current_call.answered_at:
                duration = (agent.current_call.ended_at - agent.current_call.answered_at).total_seconds()
                agent.current_call.duration_seconds = int(duration)
            
            await agent.current_call.save()
            
            # Update analytics before ending
            await agent.update_call_analytics()
            
        logger.info(f"Enhanced handler - participant disconnected: {participant.identity}")
    except Exception as e:
        logger.error(f"Error in enhanced participant disconnection handler: {e}")