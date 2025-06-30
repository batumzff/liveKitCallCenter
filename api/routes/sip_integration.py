"""
Enhanced SIP Integration for LiveKit Call Center
Modern SIP handling with improved error handling and monitoring
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os
import json
import logging
from datetime import datetime

from livekit import api
from models import Call, AIAgent, Project, Contact
from database import get_database

router = APIRouter()
logger = logging.getLogger(__name__)


class SIPCallRequest(BaseModel):
    project_id: str
    agent_id: str
    phone_number: str
    contact_id: Optional[str] = None
    campaign_id: Optional[str] = None
    call_options: Optional[Dict[str, Any]] = None


class SIPCallResponse(BaseModel):
    call_id: str
    sip_call_id: str
    room_name: str
    participant_identity: str
    status: str
    estimated_cost: Optional[float] = None


class SIPTrunkInfo(BaseModel):
    trunk_id: str
    name: str
    status: str
    inbound_number: str
    outbound_enabled: bool
    concurrent_calls: int
    max_concurrent_calls: int


class SIPCallEvent(BaseModel):
    call_id: str
    event_type: str  # 'ringing', 'answered', 'ended', 'failed'
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None


@router.post("/outbound/initiate", response_model=SIPCallResponse)
async def initiate_sip_call(
    request: SIPCallRequest,
    background_tasks: BackgroundTasks
):
    """Initiate an enhanced SIP outbound call with comprehensive monitoring"""
    
    try:
        # Validate project and agent
        project = await Project.get(request.project_id)
        if not project or not project.is_active:
            raise HTTPException(status_code=404, detail="Project not found or inactive")
        
        agent = await AIAgent.get(request.agent_id)
        if not agent or not agent.is_active:
            raise HTTPException(status_code=404, detail="Agent not found or inactive")
        
        # Validate contact if provided
        contact = None
        if request.contact_id:
            contact = await Contact.get(request.contact_id)
            if not contact:
                raise HTTPException(status_code=404, detail="Contact not found")
        
        # Initialize LiveKit API
        livekit_api = api.LiveKitAPI(
            url=os.getenv("LIVEKIT_URL"),
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET")
        )
        
        # Create call record
        call = Call(
            project_id=request.project_id,
            campaign_id=request.campaign_id,
            contact_id=request.contact_id,
            ai_agent_id=request.agent_id,
            call_type="outbound",
            phone_number=request.phone_number,
            call_status="initiating"
        )
        await call.save()
        
        # Prepare room configuration
        room_name = f"sip-call-{call.id}"
        room_metadata = {
            "call_id": call.id,
            "agent_id": request.agent_id,
            "project_id": request.project_id,
            "phone_number": request.phone_number,
            "call_type": "outbound",
            "agent_config": {
                "name": agent.name,
                "prompt": agent.prompt,
                "voice_settings": agent.voice_settings,
                "behavior_settings": agent.behavior_settings
            }
        }
        
        if contact:
            room_metadata["contact_info"] = {
                "id": contact.id,
                "name": contact.name,
                "email": contact.email,
                "notes": contact.notes,
                "tags": contact.tags
            }
        
        # Create room with enhanced configuration
        room_request = api.CreateRoomRequest(
            name=room_name,
            metadata=json.dumps(room_metadata),
            max_participants=5,  # Agent + customer + potential transfers
            empty_timeout=600,   # 10 minutes
            departure_timeout=120,  # 2 minutes
        )
        
        room = await livekit_api.room.create_room(room_request)
        
        # Configure SIP participant with enhanced options
        call_options = request.call_options or {}
        
        sip_participant_request = api.CreateSIPParticipantRequest(
            sip_trunk_id=os.getenv("SIP_TRUNK_ID"),
            sip_call_to=request.phone_number,
            room_name=room_name,
            participant_identity=f"customer-{call.id}",
            participant_name=contact.name if contact else f"Caller {request.phone_number}",
            participant_metadata=json.dumps({
                "call_id": call.id,
                "phone_number": request.phone_number,
                "type": "sip_participant"
            }),
            # Enhanced SIP options
            auto_subscribe=True,
            auto_publish=True,
            # Add custom headers if needed
            headers=call_options.get("sip_headers", {}),
            # Set call timeout
            ringing_timeout=call_options.get("ringing_timeout", 30),
            max_call_duration=call_options.get("max_duration", 3600)  # 1 hour max
        )
        
        sip_participant = await livekit_api.sip.create_sip_participant(sip_participant_request)
        
        # Update call record with SIP details
        call.room_name = room_name
        call.sip_call_id = sip_participant.sip_call_id
        call.participant_id = sip_participant.participant_identity
        call.call_status = "ringing"
        await call.save()
        
        # Schedule monitoring task
        background_tasks.add_task(monitor_sip_call, call.id, room_name)
        
        # Calculate estimated cost (mock calculation)
        estimated_cost = calculate_call_cost(request.phone_number)
        
        return SIPCallResponse(
            call_id=call.id,
            sip_call_id=sip_participant.sip_call_id,
            room_name=room_name,
            participant_identity=sip_participant.participant_identity,
            status="ringing",
            estimated_cost=estimated_cost
        )
        
    except Exception as e:
        logger.error(f"Failed to initiate SIP call: {e}")
        
        # Update call record if it was created
        if 'call' in locals():
            call.call_status = "failed"
            call.call_outcome = f"Initiation failed: {str(e)}"
            call.ended_at = datetime.utcnow()
            await call.save()
        
        raise HTTPException(status_code=500, detail=f"Failed to initiate SIP call: {str(e)}")


@router.get("/trunk/status", response_model=SIPTrunkInfo)
async def get_sip_trunk_status():
    """Get current SIP trunk status and capacity"""
    
    try:
        livekit_api = api.LiveKitAPI(
            url=os.getenv("LIVEKIT_URL"),
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET")
        )
        
        # Get SIP trunk information
        trunk_id = os.getenv("SIP_TRUNK_ID")
        
        # In a real implementation, you would call the LiveKit SIP API
        # For now, we'll return mock data
        
        # Count active SIP calls
        active_calls = await Call.find(
            Call.call_status.in_(["ringing", "answered"]),
            Call.sip_call_id != None
        ).count()
        
        return SIPTrunkInfo(
            trunk_id=trunk_id,
            name="Main SIP Trunk",
            status="active",
            inbound_number="+1234567890",  # This would come from trunk config
            outbound_enabled=True,
            concurrent_calls=active_calls,
            max_concurrent_calls=100  # This would come from trunk limits
        )
        
    except Exception as e:
        logger.error(f"Failed to get SIP trunk status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get trunk status")


@router.post("/webhook/events")
async def handle_sip_webhook(event_data: Dict[str, Any]):
    """Handle SIP events from LiveKit webhooks"""
    
    try:
        event_type = event_data.get("event")
        room_name = event_data.get("room", {}).get("name")
        participant = event_data.get("participant", {})
        
        if not room_name or not room_name.startswith("sip-call-"):
            return {"status": "ignored", "reason": "not a SIP call room"}
        
        # Extract call ID from room name
        call_id = room_name.replace("sip-call-", "")
        
        call = await Call.get(call_id)
        if not call:
            logger.warning(f"Call {call_id} not found for SIP event")
            return {"status": "error", "reason": "call not found"}
        
        # Process different event types
        if event_type == "participant_joined":
            await handle_participant_joined(call, participant)
        elif event_type == "participant_left":
            await handle_participant_left(call, participant)
        elif event_type == "room_finished":
            await handle_room_finished(call)
        elif event_type == "track_published":
            await handle_track_event(call, "track_published", event_data)
        elif event_type == "track_unpublished":
            await handle_track_event(call, "track_unpublished", event_data)
        
        # Log event for analytics
        await log_sip_event(call_id, event_type, event_data)
        
        return {"status": "processed", "call_id": call_id}
        
    except Exception as e:
        logger.error(f"Error handling SIP webhook: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/calls/active")
async def get_active_sip_calls():
    """Get all currently active SIP calls"""
    
    try:
        active_calls = await Call.find(
            Call.call_status.in_(["ringing", "answered"]),
            Call.sip_call_id != None
        ).to_list()
        
        call_summaries = []
        for call in active_calls:
            # Get agent info
            agent = await AIAgent.get(call.ai_agent_id) if call.ai_agent_id else None
            
            call_summaries.append({
                "call_id": call.id,
                "phone_number": call.phone_number,
                "status": call.call_status,
                "started_at": call.started_at,
                "duration": (datetime.utcnow() - call.started_at).total_seconds() if call.started_at else 0,
                "agent_name": agent.name if agent else "Unknown",
                "room_name": call.room_name,
                "sip_call_id": call.sip_call_id
            })
        
        return {
            "active_calls": len(call_summaries),
            "calls": call_summaries
        }
        
    except Exception as e:
        logger.error(f"Error getting active SIP calls: {e}")
        raise HTTPException(status_code=500, detail="Failed to get active calls")


@router.post("/calls/{call_id}/transfer")
async def transfer_sip_call(
    call_id: str,
    destination: str,
    transfer_type: str = "attended"  # "attended" or "blind"
):
    """Transfer an active SIP call to another number or agent"""
    
    try:
        call = await Call.get(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        if call.call_status not in ["answered", "ringing"]:
            raise HTTPException(status_code=400, detail="Call is not active")
        
        livekit_api = api.LiveKitAPI(
            url=os.getenv("LIVEKIT_URL"),
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET")
        )
        
        # Implementation would depend on LiveKit SIP transfer capabilities
        # For now, we'll update the call record
        
        call.call_outcome = f"Transferred to {destination} ({transfer_type})"
        call.call_status = "transferred"
        await call.save()
        
        return {
            "call_id": call_id,
            "status": "transfer_initiated",
            "destination": destination,
            "transfer_type": transfer_type
        }
        
    except Exception as e:
        logger.error(f"Error transferring SIP call: {e}")
        raise HTTPException(status_code=500, detail="Failed to transfer call")


# Helper functions

async def monitor_sip_call(call_id: str, room_name: str):
    """Background task to monitor SIP call progress"""
    import asyncio
    
    try:
        # Wait for call to be answered or fail
        max_wait = 60  # 1 minute
        wait_time = 0
        
        while wait_time < max_wait:
            call = await Call.get(call_id)
            if not call:
                break
                
            if call.call_status in ["answered", "failed", "completed"]:
                break
                
            await asyncio.sleep(5)
            wait_time += 5
        
        # If call is still ringing after max wait, mark as no answer
        if wait_time >= max_wait:
            call = await Call.get(call_id)
            if call and call.call_status == "ringing":
                call.call_status = "no_answer"
                call.call_outcome = "No answer"
                call.ended_at = datetime.utcnow()
                await call.save()
                logger.info(f"Call {call_id} marked as no answer after {max_wait}s")
        
    except Exception as e:
        logger.error(f"Error monitoring SIP call {call_id}: {e}")


def calculate_call_cost(phone_number: str) -> float:
    """Calculate estimated call cost based on destination"""
    # Mock implementation - in reality, this would use rate tables
    if phone_number.startswith("+1"):  # US/Canada
        return 0.02  # $0.02 per minute
    elif phone_number.startswith("+44"):  # UK
        return 0.05  # $0.05 per minute
    else:
        return 0.10  # $0.10 per minute for international


async def handle_participant_joined(call: Call, participant: Dict[str, Any]):
    """Handle participant joined event"""
    try:
        if participant.get("identity", "").startswith("customer-"):
            call.call_status = "answered"
            call.answered_at = datetime.utcnow()
            await call.save()
            logger.info(f"Call {call.id} answered")
    except Exception as e:
        logger.error(f"Error handling participant joined: {e}")


async def handle_participant_left(call: Call, participant: Dict[str, Any]):
    """Handle participant left event"""
    try:
        if participant.get("identity", "").startswith("customer-"):
            call.call_status = "completed"
            call.ended_at = datetime.utcnow()
            
            if call.answered_at:
                duration = (call.ended_at - call.answered_at).total_seconds()
                call.duration_seconds = int(duration)
            
            await call.save()
            logger.info(f"Call {call.id} completed")
    except Exception as e:
        logger.error(f"Error handling participant left: {e}")


async def handle_room_finished(call: Call):
    """Handle room finished event"""
    try:
        if call.call_status not in ["completed", "failed"]:
            call.call_status = "completed"
            call.ended_at = datetime.utcnow()
            await call.save()
            logger.info(f"Room finished for call {call.id}")
    except Exception as e:
        logger.error(f"Error handling room finished: {e}")


async def handle_track_event(call: Call, event_type: str, event_data: Dict[str, Any]):
    """Handle track published/unpublished events"""
    try:
        track = event_data.get("track", {})
        track_type = track.get("type")
        
        if track_type == "audio":
            logger.info(f"Audio track {event_type} for call {call.id}")
            # Could update call analytics here
        
    except Exception as e:
        logger.error(f"Error handling track event: {e}")


async def log_sip_event(call_id: str, event_type: str, event_data: Dict[str, Any]):
    """Log SIP events for analytics and debugging"""
    try:
        # In a production system, you might want to store these in a separate events table
        event = SIPCallEvent(
            call_id=call_id,
            event_type=event_type,
            timestamp=datetime.utcnow(),
            details=event_data
        )
        
        # For now, just log it
        logger.info(f"SIP Event - Call: {call_id}, Type: {event_type}, Data: {json.dumps(event_data, default=str)}")
        
    except Exception as e:
        logger.error(f"Error logging SIP event: {e}")