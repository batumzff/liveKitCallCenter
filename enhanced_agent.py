"""
Enhanced LiveKit Agent with call analysis integration
"""

import asyncio
import logging
import os
import httpx
from datetime import datetime
from dotenv import load_dotenv

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RunContext,
    WorkerOptions,
    cli,
    function_tool,
)
from livekit.plugins import openai, silero

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for call tracking
current_calls = {}
transcript_buffer = {}

@function_tool
async def get_help_info(
    context: RunContext,
    topic: str,
):
    """Provides help information about various topics."""
    logger.info(f"Function called: get_help_info with topic: {topic}")
    
    help_responses = {
        "services": "We offer customer support, technical assistance, and general inquiries.",
        "hours": "Our call center is open 24/7 for your convenience.",
        "contact": "You can reach us through this voice call or visit our website.",
        "support": "Our support team can help with account issues, technical problems, and general questions."
    }
    
    return {"info": help_responses.get(topic.lower(), "I can help with services, hours, contact info, and support topics.")}

@function_tool
async def schedule_callback(
    context: RunContext,
    time: str,
    reason: str,
):
    """Schedule a callback for the customer"""
    logger.info(f"Scheduling callback for {time}, reason: {reason}")
    
    return {
        "status": "scheduled",
        "message": f"I've scheduled a callback for {time}. Reason: {reason}",
        "reference": f"CB-{hash(time + reason) % 10000:04d}"
    }

async def send_transcript_to_analysis(call_id: str, transcript: str):
    """Send transcript to analysis API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/api/v1/call-analysis/analyze/transcript",
                json={
                    "call_id": call_id,
                    "transcript": transcript
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                logger.info(f"Transcript sent for analysis: {call_id}")
                return response.json()
            else:
                logger.error(f"Failed to send transcript: {response.status_code}")
                return None
                
    except Exception as e:
        logger.error(f"Error sending transcript to analysis: {e}")
        return None

async def update_call_status(call_id: str, status: str, **kwargs):
    """Update call status in backend"""
    try:
        async with httpx.AsyncClient() as client:
            update_data = {"call_status": status}
            update_data.update(kwargs)
            
            response = await client.put(
                f"http://localhost:8000/api/v1/calls/{call_id}",
                json=update_data,
                timeout=10.0
            )
            
            if response.status_code == 200:
                logger.info(f"Call status updated: {call_id} -> {status}")
            else:
                logger.error(f"Failed to update call status: {response.status_code}")
                
    except Exception as e:
        logger.error(f"Error updating call status: {e}")

class TranscriptCollector:
    """Collects and manages call transcripts"""
    
    def __init__(self, call_id: str):
        self.call_id = call_id
        self.transcript_parts = []
        self.last_update = datetime.utcnow()
    
    def add_text(self, text: str, speaker: str = "unknown"):
        """Add text to transcript"""
        timestamp = datetime.utcnow().strftime("%H:%M:%S")
        self.transcript_parts.append(f"[{timestamp}] {speaker}: {text}")
        self.last_update = datetime.utcnow()
        logger.info(f"Added to transcript ({self.call_id}): {speaker}: {text[:50]}...")
    
    def get_full_transcript(self) -> str:
        """Get complete transcript"""
        return "\n".join(self.transcript_parts)
    
    async def send_for_analysis(self):
        """Send transcript for analysis"""
        if self.transcript_parts:
            full_transcript = self.get_full_transcript()
            await send_transcript_to_analysis(self.call_id, full_transcript)

async def entrypoint(ctx: JobContext):
    """Enhanced agent entrypoint with analysis integration"""
    logger.info(f"=== ENHANCED AGENT STARTED ===")
    logger.info(f"Room: {ctx.room.name}")
    
    # Extract call info from room metadata
    call_id = None
    project_id = None
    
    try:
        if ctx.room.metadata:
            import json
            metadata = json.loads(ctx.room.metadata)
            call_id = metadata.get("call_id")
            project_id = metadata.get("project_id")
            logger.info(f"Room metadata: call_id={call_id}, project_id={project_id}")
    except Exception as e:
        logger.warning(f"Could not parse room metadata: {e}")
    
    # If no call_id, generate one from room name
    if not call_id:
        call_id = f"call-{ctx.room.name}"
        logger.info(f"Generated call_id: {call_id}")
    
    # Initialize transcript collector
    transcript_collector = TranscriptCollector(call_id)
    current_calls[ctx.room.name] = {
        "call_id": call_id,
        "transcript_collector": transcript_collector,
        "started_at": datetime.utcnow()
    }
    
    try:
        await ctx.connect()
        logger.info("Successfully connected to room")

        # Create agent
        agent = Agent(
            instructions="""You are a professional call center assistant. 
            Be helpful, courteous, and efficient. 
            Listen carefully and provide accurate information.
            Keep responses concise but informative.
            You can speak both Turkish and English fluently.""",
            tools=[get_help_info, schedule_callback],
        )
        logger.info("Agent created successfully")
        
        # Create session
        session = AgentSession(
            vad=silero.VAD.load(),
            stt=openai.STT(),
            llm=openai.LLM(model="gpt-4o-mini"),
            tts=openai.TTS(voice="alloy"),
        )
        logger.info("Agent session created successfully")

        # Hook into session events for transcript collection
        @session.on("user_speech_committed")
        def on_user_speech(text: str):
            transcript_collector.add_text(text, "Customer")
        
        @session.on("agent_speech_committed") 
        def on_agent_speech(text: str):
            transcript_collector.add_text(text, "Agent")

        # Start the agent session
        await session.start(agent=agent, room=ctx.room)
        logger.info("Agent session started successfully")
        
        # Update call status to answered
        if call_id:
            await update_call_status(
                call_id, 
                "answered", 
                answered_at=datetime.utcnow().isoformat()
            )
        
        # Generate initial greeting
        try:
            await session.generate_reply(
                instructions="Greet the customer warmly in Turkish and ask how you can help them today. Be professional and friendly."
            )
            logger.info("Initial greeting sent successfully")
        except Exception as e:
            logger.error(f"Failed to generate initial greeting: {e}")
        
        logger.info("=== AGENT READY AND LISTENING ===")
        
        # Monitor session and handle cleanup
        async def monitor_session():
            try:
                while True:
                    await asyncio.sleep(10)  # Check every 10 seconds
                    
                    # Check if room is still active
                    if not session._started:
                        logger.info("Session ended, performing cleanup")
                        break
                        
            except asyncio.CancelledError:
                logger.info("Monitor task cancelled")
            except Exception as e:
                logger.error(f"Monitor error: {e}")
        
        # Start monitoring task
        monitor_task = asyncio.create_task(monitor_session())
        
        # Wait for session to end
        try:
            await monitor_task
        except asyncio.CancelledError:
            pass
        
    except Exception as e:
        logger.error(f"Fatal error in agent entrypoint: {e}")
        logger.exception("Full traceback:")
        raise
    
    finally:
        # Cleanup and send transcript for analysis
        logger.info("Agent cleanup started")
        
        if ctx.room.name in current_calls:
            call_data = current_calls[ctx.room.name]
            transcript_collector = call_data["transcript_collector"]
            
            # Update call status to completed
            if call_id:
                await update_call_status(
                    call_id,
                    "completed",
                    ended_at=datetime.utcnow().isoformat()
                )
            
            # Send transcript for analysis
            try:
                await transcript_collector.send_for_analysis()
                logger.info(f"Transcript sent for analysis: {call_id}")
            except Exception as e:
                logger.error(f"Failed to send transcript for analysis: {e}")
            
            # Cleanup
            del current_calls[ctx.room.name]
        
        logger.info("=== AGENT CLEANUP COMPLETED ===")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))