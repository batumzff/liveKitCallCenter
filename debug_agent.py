"""
Debug agent with better error handling and logging
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
from livekit.plugins import openai, silero

load_dotenv()
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


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


async def entrypoint(ctx: JobContext):
    """Debug agent entrypoint with detailed logging"""
    logger.info(f"=== DEBUG AGENT STARTED ===")
    logger.info(f"Room: {ctx.room.name}")
    logger.info(f"OpenAI API Key present: {'OPENAI_API_KEY' in os.environ}")
    logger.info(f"OpenAI API Key length: {len(os.getenv('OPENAI_API_KEY', ''))}")
    
    try:
        await ctx.connect()
        logger.info("Successfully connected to room")

        # Create agent with simple instructions
        agent = Agent(
            instructions="""You are a helpful assistant. Respond briefly and clearly. 
            Always greet users and be ready to help with their questions.""",
            tools=[get_help_info],
        )
        logger.info("Agent created successfully")
        
        # Test OpenAI connection first
        try:
            test_llm = openai.LLM(model="gpt-4o-mini")
            logger.info("OpenAI LLM initialized successfully")
        except Exception as e:
            logger.error(f"OpenAI LLM initialization failed: {e}")
            return
        
        try:
            test_stt = openai.STT()
            logger.info("OpenAI STT initialized successfully")
        except Exception as e:
            logger.error(f"OpenAI STT initialization failed: {e}")
            return
            
        try:
            test_tts = openai.TTS(voice="alloy")
            logger.info("OpenAI TTS initialized successfully")
        except Exception as e:
            logger.error(f"OpenAI TTS initialization failed: {e}")
            return
        
        # Create session with verified components
        session = AgentSession(
            vad=silero.VAD.load(),
            stt=test_stt,
            llm=test_llm,
            tts=test_tts,
        )
        logger.info("Agent session created successfully")

        # Start the agent session
        await session.start(agent=agent, room=ctx.room)
        logger.info("Agent session started successfully")
        
        # Generate initial greeting with error handling
        try:
            await session.generate_reply(
                instructions="Say hello in Turkish and ask how you can help today. Be brief and friendly."
            )
            logger.info("Initial greeting sent successfully")
        except Exception as e:
            logger.error(f"Failed to generate initial greeting: {e}")
        
        logger.info("=== AGENT READY AND LISTENING ===")
        
    except Exception as e:
        logger.error(f"Fatal error in agent entrypoint: {e}")
        logger.exception("Full traceback:")
        raise


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))