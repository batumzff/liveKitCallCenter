"""
LiveKit Agent for Call Center
Modern implementation using updated LiveKit Agents framework
"""

import asyncio
import logging
import os
from typing import Annotated

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    JobRequest,
    JobType,
)
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.agents.llm import (
    ChatContext,
    ChatMessage,
    ChatRole,
)
from livekit.agents.stt import StreamAdapter as STTStreamAdapter
from livekit.agents.tts import StreamAdapter as TTSStreamAdapter
from livekit.agents.vad import VADEventType
from livekit import rtc
from dotenv import load_dotenv

# Import AI providers (install with updated versions)
try:
    from livekit.plugins.openai import LLM, STT, TTS
except ImportError:
    logging.warning("OpenAI plugin not available")
    LLM = STT = TTS = None

try:
    from livekit.plugins.elevenlabs import TTS as ElevenLabsTTS
except ImportError:
    logging.warning("ElevenLabs plugin not available")
    ElevenLabsTTS = None

# Database imports for agent management
from database import init_db
from models import AIAgent, Call

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CallCenterAgent:
    """Enhanced Call Center Agent with database integration"""
    
    def __init__(self, agent_config: AIAgent):
        self.agent_config = agent_config
        self.current_call = None
        
    async def create_llm(self):
        """Create LLM instance with agent-specific configuration"""
        if not LLM:
            raise RuntimeError("OpenAI plugin not available")
            
        return LLM(
            model="gpt-4-turbo-preview",
            temperature=self.agent_config.behavior_settings.get("temperature", 0.7),
            max_tokens=self.agent_config.behavior_settings.get("max_tokens", 500),
        )
    
    async def create_tts(self):
        """Create TTS instance with agent-specific voice settings"""
        voice_provider = self.agent_config.voice_settings.get("provider", "openai")
        
        if voice_provider == "elevenlabs" and ElevenLabsTTS:
            return ElevenLabsTTS(
                voice_id=self.agent_config.voice_settings.get("voice_id", "21m00Tcm4TlvDq8ikWAM"),
                model_id=self.agent_config.voice_settings.get("model_id", "eleven_turbo_v2"),
                api_key=os.getenv("ELEVENLABS_API_KEY"),
            )
        elif TTS:
            return TTS(
                voice=self.agent_config.voice_settings.get("voice", "alloy"),
                model=self.agent_config.voice_settings.get("model", "tts-1"),
            )
        else:
            raise RuntimeError("No TTS provider available")
    
    async def create_stt(self):
        """Create STT instance"""
        if not STT:
            raise RuntimeError("STT not available")
        return STT()
    
    async def get_initial_chat_context(self, room_name: str, participant_identity: str) -> ChatContext:
        """Create initial chat context with agent prompt"""
        initial_ctx = ChatContext()
        
        # Add system prompt from agent configuration
        system_prompt = self.agent_config.prompt
        
        # Add context information
        context_info = f"""
Room: {room_name}
Participant: {participant_identity}
Agent: {self.agent_config.name}

Additional Instructions:
- Be helpful and professional
- Keep responses concise but informative
- Use the voice settings configured for this agent
- Handle call center scenarios appropriately
"""
        
        initial_ctx.messages.append(
            ChatMessage(
                role=ChatRole.SYSTEM,
                content=system_prompt + context_info
            )
        )
        
        return initial_ctx


async def entrypoint(ctx: JobContext):
    """Main entrypoint for LiveKit Agent"""
    logger.info(f"Starting agent for room: {ctx.room.name}")
    
    # Initialize database connection
    try:
        await init_db()
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        # Continue without database for basic functionality
    
    # Parse agent configuration from room metadata or use default
    agent_id = ctx.room.metadata.get("agent_id") if ctx.room.metadata else None
    
    if agent_id:
        try:
            agent_config = await AIAgent.get(agent_id)
            if not agent_config:
                raise ValueError(f"Agent {agent_id} not found")
        except Exception as e:
            logger.error(f"Failed to load agent config: {e}")
            # Use default configuration
            agent_config = create_default_agent_config()
    else:
        agent_config = create_default_agent_config()
    
    logger.info(f"Using agent: {agent_config.name}")
    
    # Create call center agent instance
    call_agent = CallCenterAgent(agent_config)
    
    try:
        # Initialize AI components
        llm = await call_agent.create_llm()
        tts = await call_agent.create_tts()
        stt = await call_agent.create_stt()
        
        # Create initial chat context
        initial_ctx = await call_agent.get_initial_chat_context(
            ctx.room.name, 
            "agent"
        )
        
        # Create voice assistant
        assistant = VoiceAssistant(
            vad=rtc.VAD.load(),
            stt=stt,
            llm=llm,
            tts=tts,
            chat_ctx=initial_ctx,
        )
        
        # Handle room events
        @ctx.room.on("participant_connected")
        def on_participant_connected(participant: rtc.RemoteParticipant):
            logger.info(f"Participant connected: {participant.identity}")
            asyncio.create_task(handle_participant_connected(participant, call_agent))
        
        @ctx.room.on("participant_disconnected")
        def on_participant_disconnected(participant: rtc.RemoteParticipant):
            logger.info(f"Participant disconnected: {participant.identity}")
            asyncio.create_task(handle_participant_disconnected(participant, call_agent))
        
        # Start the assistant
        assistant.start(ctx.room)
        
        # Wait a moment then greet
        await asyncio.sleep(1)
        
        # Get greeting from agent configuration or use default
        greeting = agent_config.behavior_settings.get(
            "greeting", 
            f"Merhaba! Ben {agent_config.name}. Size nasıl yardımcı olabilirim?"
        )
        
        await assistant.say(greeting, allow_interruptions=True)
        
        # Keep the agent running
        await asyncio.sleep(0.1)
        
    except Exception as e:
        logger.error(f"Error in agent entrypoint: {e}")
        raise


async def handle_participant_connected(participant: rtc.RemoteParticipant, agent: CallCenterAgent):
    """Handle new participant connection"""
    try:
        # Update call record if exists
        if agent.current_call:
            agent.current_call.participant_id = participant.identity
            agent.current_call.call_status = "answered"
            await agent.current_call.save()
            
        logger.info(f"Handled participant connection: {participant.identity}")
    except Exception as e:
        logger.error(f"Error handling participant connection: {e}")


async def handle_participant_disconnected(participant: rtc.RemoteParticipant, agent: CallCenterAgent):
    """Handle participant disconnection"""
    try:
        # Update call record if exists
        if agent.current_call:
            agent.current_call.call_status = "completed"
            agent.current_call.ended_at = agent.current_call.started_at  # Will be updated properly
            await agent.current_call.save()
            
        logger.info(f"Handled participant disconnection: {participant.identity}")
    except Exception as e:
        logger.error(f"Error handling participant disconnection: {e}")


def create_default_agent_config():
    """Create default agent configuration when database is not available"""
    from models import AIAgent
    from datetime import datetime
    
    return AIAgent(
        id="default",
        project_id="default",
        name="Default Call Center Agent",
        prompt="""You are a helpful AI assistant for a call center. 
        Be professional, courteous, and efficient in helping customers with their inquiries.
        Ask clarifying questions when needed and provide clear, actionable responses.""",
        voice_settings={
            "provider": "openai",
            "voice": "alloy",
            "model": "tts-1"
        },
        behavior_settings={
            "temperature": 0.7,
            "max_tokens": 500,
            "greeting": "Merhaba! Call center asistanınızım. Size nasıl yardımcı olabilirim?"
        },
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        is_active=True
    )


if __name__ == "__main__":
    # Configure worker options
    worker_options = WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=None,  # Optional: function to run before handling jobs
        agent_name="livekit-call-center-agent",
        # Auto-subscribe to all tracks for full functionality
        auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL,
        # Handle both SIP and regular room jobs
        job_types=[JobType.JT_ROOM, JobType.JT_PUBLISHER],
    )
    
    # Run the agent
    cli.run_app(worker_options)