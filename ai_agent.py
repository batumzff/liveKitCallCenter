"""
Full-featured AI Agent with OpenAI integration
"""

import asyncio
import logging
import os
from dotenv import load_dotenv

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
)
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai, silero

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def entrypoint(ctx: JobContext):
    """Main entrypoint for AI Agent with OpenAI"""
    logger.info(f"AI Agent started for room: {ctx.room.name}")
    
    # Initialize AI components
    initial_ctx = openai.ChatContext().append(
        role="system",
        text=(
            "You are a helpful AI assistant in a call center. "
            "Be professional, courteous, and helpful. "
            "Keep responses concise but informative. "
            "You can speak Turkish and English fluently."
        ),
    )
    
    # Create voice assistant with OpenAI
    assistant = VoiceAssistant(
        vad=silero.VAD.load(),  # Voice Activity Detection
        stt=openai.STT(),       # Speech to Text
        llm=openai.LLM(),       # Large Language Model
        tts=openai.TTS(voice="alloy"),  # Text to Speech
        chat_ctx=initial_ctx,
    )
    
    # Start the assistant
    assistant.start(ctx.room)
    
    # Wait and greet
    await asyncio.sleep(1)
    await assistant.say("Merhaba! Ben AI asistanınızım. Size nasıl yardımcı olabilirim?", allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        ),
    )