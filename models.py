from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from beanie import Document, Indexed
from pymongo import IndexModel
import uuid


class Project(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    name: str
    description: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Settings:
        name = "projects"
        indexes = [
            IndexModel([("created_by", 1)]),
            IndexModel([("created_at", -1)]),
            IndexModel([("is_active", 1)])
        ]


class AIAgent(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    project_id: Indexed(str)
    name: str
    prompt: str
    voice_settings: Dict[str, Any] = Field(default_factory=dict)
    behavior_settings: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Settings:
        name = "ai_agents"
        indexes = [
            IndexModel([("project_id", 1)]),
            IndexModel([("is_active", 1)])
        ]


class Contact(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    project_id: Indexed(str)
    name: str
    phone_number: str
    email: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "contacts"
        indexes = [
            IndexModel([("project_id", 1), ("phone_number", 1)], unique=True),
            IndexModel([("project_id", 1)]),
            IndexModel([("phone_number", 1)])
        ]


class Campaign(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    project_id: Indexed(str)
    ai_agent_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    campaign_type: str  # 'individual', 'group', 'batch'
    status: str = "pending"  # 'pending', 'active', 'paused', 'completed'
    scheduled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "campaigns"
        indexes = [
            IndexModel([("project_id", 1)]),
            IndexModel([("status", 1)]),
            IndexModel([("campaign_type", 1)])
        ]


class Call(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    project_id: Indexed(str)
    campaign_id: Optional[str] = None
    contact_id: Optional[str] = None
    ai_agent_id: Optional[str] = None
    
    # LiveKit info
    room_name: Optional[str] = None
    participant_id: Optional[str] = None
    sip_call_id: Optional[str] = None
    
    # Call details
    call_type: str  # 'inbound', 'outbound'
    phone_number: str
    call_status: str = "initiated"  # 'initiated', 'ringing', 'answered', 'completed', 'failed', 'no_answer'
    
    # Timing
    started_at: datetime = Field(default_factory=datetime.utcnow)
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    
    # Recording and transcript
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    
    # Analysis
    sentiment_score: Optional[float] = None  # -1.00 to 1.00
    call_summary: Optional[str] = None
    key_points: List[str] = Field(default_factory=list)
    action_items: List[str] = Field(default_factory=list)
    call_outcome: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "calls"
        indexes = [
            IndexModel([("project_id", 1)]),
            IndexModel([("contact_id", 1)]),
            IndexModel([("campaign_id", 1)]),
            IndexModel([("started_at", -1)]),
            IndexModel([("call_status", 1)]),
            IndexModel([("phone_number", 1)])
        ]


class CallAnalytics(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    call_id: Indexed(str)
    project_id: Indexed(str)
    
    # Conversation metrics
    total_words: Optional[int] = None
    agent_talk_time_seconds: Optional[int] = None
    caller_talk_time_seconds: Optional[int] = None
    silence_duration_seconds: Optional[int] = None
    interruptions_count: Optional[int] = None
    
    # Sentiment analysis
    emotions: Dict[str, float] = Field(default_factory=dict)
    confidence_scores: Dict[str, float] = Field(default_factory=dict)
    
    # Performance metrics
    response_time_avg_ms: Optional[int] = None
    task_completion_rate: Optional[float] = None
    customer_satisfaction_score: Optional[int] = None  # 1-5 scale
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "call_analytics"
        indexes = [
            IndexModel([("call_id", 1)], unique=True),
            IndexModel([("project_id", 1)])
        ]


class GroupCall(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    campaign_id: Indexed(str)
    room_name: str
    max_participants: int = 10
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    status: str = "active"  # 'active', 'ended'
    
    class Settings:
        name = "group_calls"
        indexes = [
            IndexModel([("campaign_id", 1)]),
            IndexModel([("room_name", 1)]),
            IndexModel([("status", 1)])
        ]


class GroupCallParticipant(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    group_call_id: Indexed(str)
    contact_id: Optional[str] = None
    participant_id: Optional[str] = None
    phone_number: str
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    left_at: Optional[datetime] = None
    participation_duration_seconds: Optional[int] = None
    
    class Settings:
        name = "group_call_participants"
        indexes = [
            IndexModel([("group_call_id", 1)]),
            IndexModel([("contact_id", 1)]),
            IndexModel([("phone_number", 1)])
        ]


# Pydantic models for API requests/responses
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AIAgentCreate(BaseModel):
    project_id: str
    name: str
    prompt: str
    voice_settings: Optional[Dict[str, Any]] = None
    behavior_settings: Optional[Dict[str, Any]] = None


class AIAgentUpdate(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None
    voice_settings: Optional[Dict[str, Any]] = None
    behavior_settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ContactCreate(BaseModel):
    project_id: str
    name: str
    phone_number: str
    email: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class CampaignCreate(BaseModel):
    project_id: str
    ai_agent_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    campaign_type: str
    scheduled_at: Optional[datetime] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    ai_agent_id: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class CallCreate(BaseModel):
    project_id: str
    campaign_id: Optional[str] = None
    contact_id: Optional[str] = None
    ai_agent_id: Optional[str] = None
    call_type: str
    phone_number: str


class CallUpdate(BaseModel):
    call_status: Optional[str] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    sentiment_score: Optional[float] = None
    call_summary: Optional[str] = None
    key_points: Optional[List[str]] = None
    action_items: Optional[List[str]] = None
    call_outcome: Optional[str] = None