"""
Modern LiveKit Agent using new API (Agent + AgentSession)
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
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@function_tool
async def get_help_info(
    context: RunContext,
    topic: str,
):
    """Provides help information about various topics."""
    
    help_responses = {
        "services": "We offer customer support, technical assistance, and general inquiries.",
        "hours": "Our call center is open 24/7 for your convenience.",
        "contact": "You can reach us through this voice call or visit our website.",
        "support": "Our support team can help with account issues, technical problems, and general questions."
    }
    
    return {"info": help_responses.get(topic.lower(), "I can help with services, hours, contact info, and support topics.")}


@function_tool
async def check_weather(
    context: RunContext,
    location: str,
):
    """Check weather information for a location."""
    
    # Simulated weather data
    return {
        "location": location,
        "weather": "partly cloudy", 
        "temperature": "22°C",
        "forecast": "Pleasant day ahead!"
    }


async def entrypoint(ctx: JobContext):
    """Modern agent entrypoint"""
    logger.info(f"Modern Agent started for room: {ctx.room.name}")
    
    await ctx.connect()

    # Create agent with instructions and tools
    agent = Agent(
        instructions="""You are a helpful and friendly call center assistant built by LiveKit. 
        You can speak both Turkish and English fluently.
        Be professional, courteous, and helpful to all callers.
        Use the available tools to provide accurate information.
        Keep responses concise but informative.""",
        tools=[get_help_info, check_weather],
    )
    
    # Create session with AI components
    session = AgentSession(
        vad=silero.VAD.load(),  # Voice Activity Detection (works without API key)
        # Choose STT provider (comment/uncomment as needed)
        # stt=deepgram.STT(model="nova-2"),  # Requires Deepgram API key
        stt=openai.STT(),  # Requires OpenAI API key
        
        # Choose LLM provider
        llm=openai.LLM(model="gpt-4o-mini"),  # Requires OpenAI API key
        
        # Choose TTS provider
        # tts=silero.TTS(),  # Free option (not available)
        # tts=elevenlabs.TTS(),  # Requires ElevenLabs API key
        tts=openai.TTS(voice="alloy"),  # Requires OpenAI API key
    )

    # Start the agent session
    await session.start(agent=agent, room=ctx.room)
    
    # Generate initial greeting
    await session.generate_reply(
        instructions="Greet the user warmly in Turkish and ask how you can help them today. Be friendly and professional."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))