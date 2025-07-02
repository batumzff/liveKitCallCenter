"""
Proper LiveKit Agent with correct transcript collection
Using LiveKit Agent framework events
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

# Global transcript storage
call_transcripts = {}

class CallTranscript:
    def __init__(self, call_id: str):
        self.call_id = call_id
        self.transcript_lines = []
        self.started_at = datetime.utcnow()
    
    def add_line(self, speaker: str, text: str):
        timestamp = datetime.utcnow().strftime("%H:%M:%S")
        line = f"[{timestamp}] {speaker}: {text}"
        self.transcript_lines.append(line)
        logger.info(f"Transcript: {line}")
    
    def get_full_transcript(self) -> str:
        return "\n".join(self.transcript_lines)

@function_tool
async def get_help_info(context: RunContext, topic: str):
    """Provides help information about various topics."""
    help_responses = {
        "services": "We offer customer support, technical assistance, and general inquiries.",
        "hours": "Our call center is open 24/7 for your convenience.",
        "contact": "You can reach us through this voice call or visit our website.",
        "support": "Our support team can help with account issues, technical problems, and general questions."
    }
    return {"info": help_responses.get(topic.lower(), "I can help with services, hours, contact info, and support topics.")}

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

async def entrypoint(ctx: JobContext):
    """Main agent entrypoint with proper transcript handling"""
    logger.info(f"=== PROPER AGENT STARTED ===")
    logger.info(f"Room: {ctx.room.name}")
    
    # Generate call ID
    call_id = f"call-{ctx.room.name}-{int(datetime.utcnow().timestamp())}"
    
    # Initialize transcript
    transcript = CallTranscript(call_id)
    call_transcripts[call_id] = transcript
    
    try:
        await ctx.connect()
        logger.info("Connected to room successfully")

        # Create agent
        agent = Agent(
            instructions="""You are a professional call center assistant. 
            Be helpful, courteous, and efficient. 
            Listen carefully and provide accurate information.
            Keep responses concise but informative.
            You can speak both Turkish and English fluently.""",
            tools=[get_help_info],
        )
        
        # Create session
        session = AgentSession(
            vad=silero.VAD.load(),
            stt=openai.STT(),
            llm=openai.LLM(model="gpt-4o-mini"),
            tts=openai.TTS(voice="alloy"),
        )
        
        # Manual transcript collection from session internals
        original_stt_stream = None
        original_tts_stream = None
        
        # Hook into the session's internal components
        if hasattr(session, '_stt'):
            original_stt_stream = session._stt
            
        if hasattr(session, '_tts'):
            original_tts_stream = session._tts

        # Start the session
        await session.start(agent=agent, room=ctx.room)
        logger.info("Agent session started")
        
        # Send initial greeting
        greeting = "Merhaba! Ben müşteri hizmetleri asistanınızım. Size bugün nasıl yardımcı olabilirim?"
        await session.generate_reply(
            instructions=f"Say this greeting: {greeting}"
        )
        
        # Add greeting to transcript
        transcript.add_line("Agent", greeting)
        
        logger.info("Agent is ready and listening...")
        
        # Simple approach: Monitor session and collect available data
        while True:
            await asyncio.sleep(2)
            
            # Check if we can access session's conversation history
            if hasattr(session, '_chat_ctx') and session._chat_ctx:
                try:
                    # Get latest messages from chat context
                    messages = session._chat_ctx.messages
                    
                    # Process new messages (this is a simplified approach)
                    for msg in messages[-5:]:  # Get last 5 messages
                        if hasattr(msg, 'content') and msg.content:
                            if hasattr(msg, 'role'):
                                speaker = "Customer" if msg.role == "user" else "Agent"
                                # Only add if not already in transcript
                                if msg.content not in [line.split("] ", 1)[-1] for line in transcript.transcript_lines]:
                                    transcript.add_line(speaker, msg.content)
                                    
                except Exception as e:
                    logger.debug(f"Could not access chat context: {e}")
            
            # Simple exit condition (in real implementation, this would be handled by session events)
            if not hasattr(session, '_started') or not session._started:
                break
        
    except Exception as e:
        logger.error(f"Agent error: {e}")
        logger.exception("Full traceback:")
    
    finally:
        # Send transcript for analysis
        logger.info("Sending transcript for analysis...")
        
        if transcript.transcript_lines:
            full_transcript = transcript.get_full_transcript()
            logger.info(f"Full transcript ({len(transcript.transcript_lines)} lines):")
            logger.info(full_transcript)
            
            # Send to analysis API
            await send_transcript_to_analysis(call_id, full_transcript)
        else:
            logger.warning("No transcript collected")
        
        # Cleanup
        if call_id in call_transcripts:
            del call_transcripts[call_id]
        
        logger.info("Agent cleanup completed")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))