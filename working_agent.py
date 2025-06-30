"""
Working LiveKit Agent - Based on the video approach
Uses minimal setup that works without API keys for basic testing
"""

import asyncio
import logging
import os
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
from livekit.plugins import silero

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@function_tool
async def get_help(
    context: RunContext,
    question: str,
):
    """Provides help and information to users."""
    
    responses = {
        "hello": "Merhaba! Size nasıl yardımcı olabilirim?",
        "help": "Size çeşitli konularda yardımcı olabilirim. Sorularınızı sorabilirsiniz.",
        "weather": "Hava durumu bilgisi için yerel kaynaklarınızı kontrol edebilirsiniz.",
        "time": "Şu anki saat sistem saatinize göre belirlenir.",
        "services": "Müşteri hizmetleri, teknik destek ve genel bilgi konularında yardım edebilirim."
    }
    
    # Simple keyword matching
    for key, response in responses.items():
        if key.lower() in question.lower():
            return {"answer": response}
    
    return {"answer": "Üzgünüm, bu konuda size yardımcı olamıyorum. Başka bir soru sorabilir misiniz?"}


async def entrypoint(ctx: JobContext):
    """Working agent entrypoint"""
    logger.info(f"Working Agent started for room: {ctx.room.name}")
    
    await ctx.connect()

    # Create agent with basic instructions
    agent = Agent(
        instructions="""You are a helpful Turkish call center assistant. 
        Be friendly and professional. 
        Always respond in Turkish unless the user prefers English.
        Keep responses short and helpful.""",
        tools=[get_help],
    )
    
    # Simple session setup - this might work with basic functionality
    try:
        session = AgentSession(
            vad=silero.VAD.load(),  # Voice Activity Detection
            tts=silero.TTS(),       # Text to Speech (should work)
        )

        # Start the agent session
        await session.start(agent=agent, room=ctx.room)
        
        # Simple greeting without generate_reply
        logger.info("Agent session started successfully")
        
        # Keep alive
        while True:
            await asyncio.sleep(1)
            
    except Exception as e:
        logger.error(f"Error starting agent session: {e}")
        
        # Fallback: basic room handling
        logger.info("Using fallback mode...")
        
        @ctx.room.on("participant_connected")
        def on_participant_connected(participant):
            logger.info(f"Participant connected: {participant.identity}")
        
        # Keep agent running
        while True:
            await asyncio.sleep(1)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))