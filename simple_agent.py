"""
Simple LiveKit Agent - No OpenAI API key required
Based on LiveKit examples for testing
"""

import asyncio
import logging
import os
from dotenv import load_dotenv

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit import rtc

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SimpleEchoAgent:
    """Simple echo agent that repeats what it hears"""
    
    def __init__(self):
        self.is_speaking = False
    
    async def say_text(self, room: rtc.Room, text: str):
        """Convert text to audio and play it"""
        # For now, just log what we would say
        logger.info(f"Agent would say: {text}")
        
        # In a real implementation, you'd use TTS here
        # For testing, we can just acknowledge
        if not self.is_speaking:
            self.is_speaking = True
            # Simulate speaking for 2 seconds
            await asyncio.sleep(2)
            self.is_speaking = False


async def entrypoint(ctx: JobContext):
    """Main entrypoint for simple agent"""
    logger.info(f"Simple agent started for room: {ctx.room.name}")
    
    agent = SimpleEchoAgent()
    
    # Subscribe to all audio tracks
    async def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        logger.info(f"Subscribed to track: {track.kind} from {participant.identity}")
        
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            # Listen to audio and respond
            audio_stream = rtc.AudioStream(track)
            async for audio_frame in audio_stream:
                # Process audio frame (in real implementation)
                # For now, just log that we received audio
                if not agent.is_speaking:
                    logger.info("Received audio, responding...")
                    await agent.say_text(ctx.room, "Sizi duyuyorum!")
    
    # Handle participant events
    @ctx.room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        logger.info(f"Participant connected: {participant.identity}")
        
        # Subscribe to tracks
        for track_pub in participant.tracks.values():
            if track_pub.track:
                asyncio.create_task(
                    on_track_subscribed(track_pub.track, track_pub, participant)
                )
    
    @ctx.room.on("track_published")
    def on_track_published(publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        logger.info(f"Track published: {publication.kind} by {participant.identity}")
    
    @ctx.room.on("track_subscribed")
    def on_track_subscribed_event(
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        asyncio.create_task(on_track_subscribed(track, publication, participant))
    
    # Wait for existing participants
    try:
        participants = getattr(ctx.room, 'remote_participants', {})
        for participant in participants.values():
            logger.info(f"Existing participant: {participant.identity}")
            for track_pub in participant.tracks.values():
                if track_pub.track:
                    asyncio.create_task(
                        on_track_subscribed(track_pub.track, track_pub, participant)
                    )
    except Exception as e:
        logger.info(f"No existing participants or error: {e}")
    
    # Send welcome message by publishing audio
    await asyncio.sleep(1)
    await agent.say_text(ctx.room, "Merhaba! Test agent'ı çalışıyor.")
    
    # Keep agent running
    logger.info("Agent is running and listening...")


if __name__ == "__main__":
    worker_options = WorkerOptions(
        entrypoint_fnc=entrypoint,
    )
    
    cli.run_app(worker_options)