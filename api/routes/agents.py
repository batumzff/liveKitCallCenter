from typing import List
from fastapi import APIRouter, HTTPException, Query
from models import AIAgent, AIAgentCreate, AIAgentUpdate, Project

router = APIRouter()


@router.post("/", response_model=AIAgent)
async def create_ai_agent(agent_data: AIAgentCreate):
    """Create a new AI agent"""
    # Verify project exists
    project = await Project.get(agent_data.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    agent = AIAgent(
        project_id=agent_data.project_id,
        name=agent_data.name,
        prompt=agent_data.prompt,
        voice_settings=agent_data.voice_settings or {},
        behavior_settings=agent_data.behavior_settings or {}
    )
    await agent.save()
    return agent


@router.get("/", response_model=List[AIAgent])
async def get_ai_agents(
    project_id: str = Query(..., description="Project ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """Get all AI agents for a project"""
    agents = await AIAgent.find(
        AIAgent.project_id == project_id,
        AIAgent.is_active == True
    ).skip(skip).limit(limit).to_list()
    return agents


@router.get("/{agent_id}", response_model=AIAgent)
async def get_ai_agent(agent_id: str):
    """Get a specific AI agent by ID"""
    agent = await AIAgent.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="AI agent not found")
    return agent


@router.put("/{agent_id}", response_model=AIAgent)
async def update_ai_agent(agent_id: str, agent_update: AIAgentUpdate):
    """Update an AI agent"""
    agent = await AIAgent.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="AI agent not found")
    
    update_data = agent_update.dict(exclude_unset=True)
    if update_data:
        for field, value in update_data.items():
            setattr(agent, field, value)
        await agent.save()
    
    return agent


@router.delete("/{agent_id}")
async def delete_ai_agent(agent_id: str):
    """Soft delete an AI agent"""
    agent = await AIAgent.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="AI agent not found")
    
    agent.is_active = False
    await agent.save()
    return {"message": "AI agent deleted successfully"}


@router.post("/{agent_id}/test")
async def test_ai_agent(agent_id: str, test_message: str):
    """Test AI agent with a sample message"""
    agent = await AIAgent.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="AI agent not found")
    
    # This would integrate with your AI service (OpenAI, etc.)
    # For now, return a mock response
    return {
        "agent_id": agent_id,
        "test_message": test_message,
        "response": f"Test response from {agent.name}: I received your message '{test_message}'"
    }