from typing import List
from fastapi import APIRouter, HTTPException, Query
from models import Campaign, CampaignCreate, CampaignUpdate, Project, AIAgent

router = APIRouter()


@router.post("/", response_model=Campaign)
async def create_campaign(campaign_data: CampaignCreate):
    """Create a new campaign"""
    # Verify project exists
    project = await Project.get(campaign_data.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify AI agent exists if provided
    if campaign_data.ai_agent_id:
        agent = await AIAgent.get(campaign_data.ai_agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="AI agent not found")
    
    campaign = Campaign(
        project_id=campaign_data.project_id,
        ai_agent_id=campaign_data.ai_agent_id,
        name=campaign_data.name,
        description=campaign_data.description,
        campaign_type=campaign_data.campaign_type,
        scheduled_at=campaign_data.scheduled_at
    )
    await campaign.save()
    return campaign


@router.get("/", response_model=List[Campaign])
async def get_campaigns(
    project_id: str = Query(..., description="Project ID"),
    status: str = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """Get all campaigns for a project"""
    query_filter = {"project_id": project_id}
    if status:
        query_filter["status"] = status
    
    campaigns = await Campaign.find(query_filter).skip(skip).limit(limit).to_list()
    return campaigns


@router.get("/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str):
    """Get a specific campaign by ID"""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.put("/{campaign_id}", response_model=Campaign)
async def update_campaign(campaign_id: str, campaign_update: CampaignUpdate):
    """Update a campaign"""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    update_data = campaign_update.dict(exclude_unset=True)
    if update_data:
        for field, value in update_data.items():
            setattr(campaign, field, value)
        await campaign.save()
    
    return campaign


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign"""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    await campaign.delete()
    return {"message": "Campaign deleted successfully"}


@router.post("/{campaign_id}/start")
async def start_campaign(campaign_id: str):
    """Start a campaign"""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status != "pending":
        raise HTTPException(status_code=400, detail="Campaign is not in pending status")
    
    campaign.status = "active"
    await campaign.save()
    
    # Here you would trigger the actual campaign logic
    # For group calls, create LiveKit rooms
    # For individual calls, queue them for processing
    
    return {"message": "Campaign started successfully", "campaign_id": campaign_id}


@router.post("/{campaign_id}/pause")
async def pause_campaign(campaign_id: str):
    """Pause a campaign"""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status != "active":
        raise HTTPException(status_code=400, detail="Campaign is not active")
    
    campaign.status = "paused"
    await campaign.save()
    
    return {"message": "Campaign paused successfully", "campaign_id": campaign_id}


@router.post("/{campaign_id}/complete")
async def complete_campaign(campaign_id: str):
    """Mark campaign as completed"""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign.status = "completed"
    await campaign.save()
    
    return {"message": "Campaign completed successfully", "campaign_id": campaign_id}


@router.get("/{campaign_id}/stats")
async def get_campaign_stats(campaign_id: str):
    """Get campaign statistics"""
    from models import Call
    
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get call statistics for this campaign
    total_calls = await Call.find(Call.campaign_id == campaign_id).count()
    completed_calls = await Call.find(
        Call.campaign_id == campaign_id,
        Call.call_status == "completed"
    ).count()
    failed_calls = await Call.find(
        Call.campaign_id == campaign_id,
        Call.call_status.in_(["failed", "no_answer"])
    ).count()
    
    return {
        "campaign_id": campaign_id,
        "total_calls": total_calls,
        "completed_calls": completed_calls,
        "failed_calls": failed_calls,
        "success_rate": (completed_calls / total_calls * 100) if total_calls > 0 else 0,
        "status": campaign.status
    }