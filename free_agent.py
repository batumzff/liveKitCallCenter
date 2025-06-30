"""
Free LiveKit Agent using only Silero (no API keys required)
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
async def get_company_info(
    context: RunContext,
    info_type: str,
):
    """Get information about our company and services."""
    
    company_info = {
        "services": "We provide AI-powered call center solutions, customer support automation, and voice assistants.",
        "hours": "Our services are available 24/7 for maximum convenience.",
        "contact": "You can reach us through this voice interface or visit our website.",
        "location": "We operate globally with offices in major cities.",
        "pricing": "We offer flexible pricing plans to suit businesses of all sizes."
    }
    
    return {"information": company_info.get(info_type.lower(), "I can provide info about services, hours, contact, location, and pricing.")}


@function_tool
async def schedule_callback(
    context: RunContext,
    preferred_time: str,
    topic: str,
):
    """Schedule a callback for the customer."""
    
    return {
        "status": "scheduled",
        "message": f"I've scheduled a callback for {preferred_time} regarding {topic}. You'll receive a confirmation shortly.",
        "reference": f"CB-{hash(preferred_time + topic) % 10000:04d}"
    }


async def entrypoint(ctx: JobContext):
    """Free agent entrypoint using only Silero"""
    logger.info(f"Free Agent started for room: {ctx.room.name}")
    
    await ctx.connect()

    # Create agent with instructions and tools
    agent = Agent(
        instructions="""You are a helpful call center assistant. 
        You speak both Turkish and English fluently.
        Be professional, friendly, and helpful to all callers.
        You can provide company information and schedule callbacks.
        Always be courteous and try to assist customers with their needs.
        If you cannot help with something, politely explain and offer alternatives.""",
        tools=[get_company_info, schedule_callback],
    )
    
    # Create session using only Silero (completely free)
    session = AgentSession(
        vad=silero.VAD.load(),    # Voice Activity Detection
        stt=silero.STT(),         # Speech to Text
        llm=silero.LLM(),         # Large Language Model
        tts=silero.TTS(),         # Text to Speech
    )

    # Start the agent session
    await session.start(agent=agent, room=ctx.room)
    
    # Generate initial greeting
    await session.generate_reply(
        instructions="Merhaba! Ben müşteri hizmetleri asistanınızım. Size bugün nasıl yardımcı olabilirim? (Greet warmly in Turkish and ask how you can help today.)"
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))