from typing import List
from fastapi import APIRouter, HTTPException, Query
from models import Project, ProjectCreate, ProjectUpdate

router = APIRouter()


@router.post("/", response_model=Project)
async def create_project(project_data: ProjectCreate, created_by: str):
    """Create a new project"""
    project = Project(
        name=project_data.name,
        description=project_data.description,
        created_by=created_by
    )
    await project.save()
    return project


@router.get("/", response_model=List[Project])
async def get_projects(
    created_by: str = Query(..., description="User ID who created the projects"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """Get all projects for a user"""
    projects = await Project.find(
        Project.created_by == created_by,
        Project.is_active == True
    ).skip(skip).limit(limit).to_list()
    return projects


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a specific project by ID"""
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: ProjectUpdate):
    """Update a project"""
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_update.dict(exclude_unset=True)
    if update_data:
        for field, value in update_data.items():
            setattr(project, field, value)
        await project.save()
    
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Soft delete a project"""
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.is_active = False
    await project.save()
    return {"message": "Project deleted successfully"}


@router.get("/{project_id}/stats")
async def get_project_stats(project_id: str):
    """Get project statistics"""
    from models import Call, Contact, Campaign, AIAgent
    
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Count related documents
    total_contacts = await Contact.find(Contact.project_id == project_id).count()
    total_campaigns = await Campaign.find(Campaign.project_id == project_id).count()
    total_calls = await Call.find(Call.project_id == project_id).count()
    total_agents = await AIAgent.find(AIAgent.project_id == project_id).count()
    
    # Call statistics
    successful_calls = await Call.find(
        Call.project_id == project_id,
        Call.call_status == "completed"
    ).count()
    
    return {
        "project_id": project_id,
        "total_contacts": total_contacts,
        "total_campaigns": total_campaigns,
        "total_calls": total_calls,
        "total_agents": total_agents,
        "successful_calls": successful_calls,
        "success_rate": (successful_calls / total_calls * 100) if total_calls > 0 else 0
    }