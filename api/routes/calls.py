from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from models import Call, CallCreate, CallUpdate, Project, Contact, Campaign

router = APIRouter()


@router.post("/", response_model=Call)
async def create_call(call_data: CallCreate):
    """Create a new call record"""
    # Verify project exists
    project = await Project.get(call_data.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify contact exists if provided
    if call_data.contact_id:
        contact = await Contact.get(call_data.contact_id)
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
    
    # Verify campaign exists if provided
    if call_data.campaign_id:
        campaign = await Campaign.get(call_data.campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
    
    call = Call(
        project_id=call_data.project_id,
        campaign_id=call_data.campaign_id,
        contact_id=call_data.contact_id,
        ai_agent_id=call_data.ai_agent_id,
        call_type=call_data.call_type,
        phone_number=call_data.phone_number
    )
    await call.save()
    return call


@router.get("/", response_model=List[Call])
async def get_calls(
    project_id: str = Query(..., description="Project ID"),
    contact_id: Optional[str] = Query(None, description="Filter by contact ID"),
    campaign_id: Optional[str] = Query(None, description="Filter by campaign ID"),
    call_status: Optional[str] = Query(None, description="Filter by call status"),
    call_type: Optional[str] = Query(None, description="Filter by call type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """Get calls for a project with optional filters"""
    query_filter = {"project_id": project_id}
    
    if contact_id:
        query_filter["contact_id"] = contact_id
    if campaign_id:
        query_filter["campaign_id"] = campaign_id
    if call_status:
        query_filter["call_status"] = call_status
    if call_type:
        query_filter["call_type"] = call_type
    
    calls = await Call.find(query_filter).sort([("started_at", -1)]).skip(skip).limit(limit).to_list()
    return calls


@router.get("/{call_id}", response_model=Call)
async def get_call(call_id: str):
    """Get a specific call by ID"""
    call = await Call.get(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.put("/{call_id}", response_model=Call)
async def update_call(call_id: str, call_update: CallUpdate):
    """Update a call record"""
    call = await Call.get(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    update_data = call_update.dict(exclude_unset=True)
    if update_data:
        for field, value in update_data.items():
            setattr(call, field, value)
        await call.save()
    
    return call


@router.delete("/{call_id}")
async def delete_call(call_id: str):
    """Delete a call record"""
    call = await Call.get(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    await call.delete()
    return {"message": "Call deleted successfully"}


@router.post("/{call_id}/start")
async def start_call(call_id: str, room_name: str, participant_id: Optional[str] = None):
    """Mark call as started and set LiveKit room info"""
    call = await Call.get(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call.call_status = "ringing"
    call.room_name = room_name
    call.participant_id = participant_id
    call.started_at = datetime.utcnow()
    await call.save()
    
    return {"message": "Call started", "call_id": call_id, "room_name": room_name}


@router.post("/{call_id}/answer")
async def answer_call(call_id: str):
    """Mark call as answered"""
    call = await Call.get(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call.call_status = "answered"
    call.answered_at = datetime.utcnow()
    await call.save()
    
    return {"message": "Call answered", "call_id": call_id}


@router.post("/{call_id}/end")
async def end_call(call_id: str, call_outcome: Optional[str] = None):
    """Mark call as ended"""
    call = await Call.get(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call.call_status = "completed"
    call.ended_at = datetime.utcnow()
    
    if call.answered_at:
        duration = (call.ended_at - call.answered_at).total_seconds()
        call.duration_seconds = int(duration)
    
    if call_outcome:
        call.call_outcome = call_outcome
    
    await call.save()
    
    return {"message": "Call ended", "call_id": call_id, "duration": call.duration_seconds}


@router.post("/{call_id}/fail")
async def fail_call(call_id: str, reason: Optional[str] = None):
    """Mark call as failed"""
    call = await Call.get(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call.call_status = "failed"
    call.ended_at = datetime.utcnow()
    
    if reason:
        call.call_outcome = f"Failed: {reason}"
    
    await call.save()
    
    return {"message": "Call marked as failed", "call_id": call_id}


@router.post("/outbound")
async def initiate_outbound_call(
    project_id: str,
    phone_number: str,
    ai_agent_id: str,
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None
):
    """Initiate an outbound call using LiveKit SIP with enhanced agent integration"""
    import os
    import json
    from livekit import api
    
    # Verify agent exists and is active
    agent = await AIAgent.get(ai_agent_id)
    if not agent or not agent.is_active:
        raise HTTPException(status_code=404, detail="AI agent not found or inactive")
    
    # Create call record first
    call_data = CallCreate(
        project_id=project_id,
        contact_id=contact_id,
        campaign_id=campaign_id,
        ai_agent_id=ai_agent_id,
        call_type="outbound",
        phone_number=phone_number
    )
    call = await create_call(call_data)
    
    try:
        # Initialize LiveKit API client
        livekit_api = api.LiveKitAPI(
            url=os.getenv("LIVEKIT_URL"),
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET")
        )
        
        # Create room for the call with enhanced metadata
        room_name = f"call-{call.id}"
        room_metadata = json.dumps({
            "agent_id": ai_agent_id,
            "project_id": project_id,
            "call_id": call.id,
            "call_type": "outbound",
            "phone_number": phone_number,
            "contact_id": contact_id,
            "campaign_id": campaign_id,
            "agent_name": agent.name
        })
        
        room_request = api.CreateRoomRequest(
            name=room_name,
            metadata=room_metadata,
            max_participants=10,  # Allow for potential transfers
            empty_timeout=300,    # 5 minutes timeout for empty rooms
            departure_timeout=60  # 1 minute timeout after participant leaves
        )
        room = await livekit_api.room.create_room(room_request)
        
        # Enhanced SIP participant configuration
        sip_request = api.CreateSIPParticipantRequest(
            sip_trunk_id=os.getenv("SIP_TRUNK_ID"),
            sip_call_to=phone_number,
            room_name=room_name,
            participant_identity=f"caller-{call.id}",
            participant_name=f"Call to {phone_number}",
            participant_metadata=json.dumps({
                "call_id": call.id,
                "phone_number": phone_number,
                "call_type": "outbound"
            }),
            # Enable audio and disable video for voice calls
            auto_subscribe=True,
            auto_publish=True
        )
        
        sip_participant = await livekit_api.sip.create_sip_participant(sip_request)
        
        # Update call with comprehensive LiveKit info
        call.room_name = room_name
        call.sip_call_id = sip_participant.sip_call_id
        call.participant_id = sip_participant.participant_identity
        call.call_status = "ringing"
        await call.save()
        
        return {
            "call_id": call.id,
            "room_name": room_name,
            "sip_call_id": sip_participant.sip_call_id,
            "participant_identity": sip_participant.participant_identity,
            "agent_id": ai_agent_id,
            "agent_name": agent.name,
            "status": "initiated",
            "room_url": f"{os.getenv('LIVEKIT_URL')}/rooms/{room_name}"
        }
        
    except Exception as e:
        # Mark call as failed with detailed error
        call.call_status = "failed"
        call.call_outcome = f"Failed to initiate: {str(e)}"
        call.ended_at = call.started_at
        await call.save()
        
        raise HTTPException(status_code=500, detail=f"Failed to initiate call: {str(e)}")


@router.get("/contact/{contact_id}/history")
async def get_contact_call_history(
    contact_id: str,
    project_id: str = Query(..., description="Project ID to filter calls"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Get call history for a specific contact within a project"""
    calls = await Call.find(
        Call.contact_id == contact_id,
        Call.project_id == project_id
    ).sort([("started_at", -1)]).skip(skip).limit(limit).to_list()
    
    return calls