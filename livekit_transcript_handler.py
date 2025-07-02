"""
LiveKit Transcript Handler
Real transcript extraction from LiveKit recordings
"""

import asyncio
import logging
import os
import tempfile
from datetime import datetime
from typing import Optional

import openai
from livekit import api
import httpx

logger = logging.getLogger(__name__)

class LiveKitTranscriptHandler:
    """Handle transcript extraction from LiveKit recordings"""
    
    def __init__(self):
        self.livekit_api = api.LiveKitAPI(
            url=os.getenv("LIVEKIT_URL"),
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET")
        )
        self.openai_client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    async def start_recording(self, room_name: str, call_id: str) -> Optional[str]:
        """Start recording a room for transcript extraction"""
        try:
            # Create egress request for audio recording
            egress_request = api.RoomCompositeEgressRequest(
                room_name=room_name,
                output=api.DirectFileOutput(
                    filepath=f"/tmp/recordings/{call_id}.wav"
                ),
                audio_only=True,  # Only record audio for transcript
                options=api.RoomCompositeOptions(
                    audio_track_templates=[
                        api.AudioTrackTemplate(
                            track_source=api.TrackSource.SOURCE_MICROPHONE
                        )
                    ]
                )
            )
            
            egress = await self.livekit_api.egress.start_room_composite_egress(egress_request)
            logger.info(f"Started recording for room {room_name}, egress_id: {egress.egress_id}")
            
            return egress.egress_id
            
        except Exception as e:
            logger.error(f"Failed to start recording: {e}")
            return None
    
    async def stop_recording_and_get_transcript(self, egress_id: str, call_id: str) -> Optional[str]:
        """Stop recording and extract transcript"""
        try:
            # Stop recording
            egress = await self.livekit_api.egress.stop_egress(egress_id)
            
            if egress.status == api.EgressStatus.EGRESS_COMPLETE:
                # Download recording file
                recording_url = egress.file_results[0].download_url
                transcript = await self._extract_transcript_from_url(recording_url)
                
                # Send transcript for analysis
                await self._send_transcript_for_analysis(call_id, transcript)
                
                return transcript
            else:
                logger.error(f"Recording failed: {egress.status}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get transcript: {e}")
            return None
    
    async def _extract_transcript_from_url(self, audio_url: str) -> str:
        """Extract transcript from audio file URL using OpenAI Whisper"""
        try:
            # Download audio file
            async with httpx.AsyncClient() as client:
                response = await client.get(audio_url)
                
                if response.status_code == 200:
                    # Save to temporary file
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                        temp_file.write(response.content)
                        temp_file_path = temp_file.name
                    
                    # Use OpenAI Whisper for transcription
                    with open(temp_file_path, "rb") as audio_file:
                        transcript_response = await self.openai_client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file,
                            response_format="verbose_json",
                            timestamp_granularities=["segment"]
                        )
                    
                    # Clean up temp file
                    os.unlink(temp_file_path)
                    
                    # Format transcript with timestamps
                    formatted_transcript = self._format_transcript_with_timestamps(
                        transcript_response.segments
                    )
                    
                    return formatted_transcript
                else:
                    logger.error(f"Failed to download audio: {response.status_code}")
                    return ""
                    
        except Exception as e:
            logger.error(f"Transcript extraction failed: {e}")
            return ""
    
    def _format_transcript_with_timestamps(self, segments) -> str:
        """Format transcript segments with timestamps"""
        formatted_lines = []
        
        for segment in segments:
            start_time = self._format_timestamp(segment.start)
            text = segment.text.strip()
            formatted_lines.append(f"[{start_time}] {text}")
        
        return "\n".join(formatted_lines)
    
    def _format_timestamp(self, seconds: float) -> str:
        """Format seconds to MM:SS format"""
        minutes = int(seconds // 60)
        seconds = int(seconds % 60)
        return f"{minutes:02d}:{seconds:02d}"
    
    async def _send_transcript_for_analysis(self, call_id: str, transcript: str):
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
                else:
                    logger.error(f"Failed to send transcript: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Error sending transcript: {e}")


# Global transcript handler instance
transcript_handler = LiveKitTranscriptHandler()