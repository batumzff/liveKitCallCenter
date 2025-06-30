"""
Agent Worker Management System
Handles multiple agent instances and routing
"""

import asyncio
import logging
import os
from typing import Dict, Optional, List
from dataclasses import dataclass
from datetime import datetime

from livekit.agents import WorkerOptions, cli
from livekit.agents.ipc import job_request_pb2 as proto
from livekit import api, rtc
from dotenv import load_dotenv

from database import init_db
from models import AIAgent, Call, Project, Campaign
from agent import entrypoint as agent_entrypoint

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class AgentInstance:
    """Represents a running agent instance"""
    agent_id: str
    project_id: str
    room_name: str
    participant_count: int
    started_at: datetime
    status: str  # 'active', 'idle', 'stopping'


class AgentWorkerManager:
    """Manages multiple agent workers and routing"""
    
    def __init__(self):
        self.active_agents: Dict[str, AgentInstance] = {}
        self.livekit_api = None
        
    async def initialize(self):
        """Initialize the worker manager"""
        try:
            await init_db()
            logger.info("Database initialized")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            
        # Initialize LiveKit API client
        self.livekit_api = api.LiveKitAPI(
            url=os.getenv("LIVEKIT_URL"),
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET")
        )
        
        logger.info("Agent Worker Manager initialized")
    
    async def route_job(self, job_request) -> bool:
        """Route job to appropriate agent based on room metadata"""
        try:
            room_name = job_request.room.name
            metadata = job_request.room.metadata or {}
            
            # Extract routing information
            agent_id = metadata.get("agent_id")
            project_id = metadata.get("project_id")
            call_id = metadata.get("call_id")
            
            logger.info(f"Routing job for room {room_name}, agent: {agent_id}, project: {project_id}")
            
            if agent_id:
                # Load agent configuration
                agent_config = await AIAgent.get(agent_id)
                if not agent_config or not agent_config.is_active:
                    logger.error(f"Agent {agent_id} not found or inactive")
                    return False
                
                # Update call record
                if call_id:
                    await self.update_call_status(call_id, "agent_assigned", room_name)
                
                # Create agent instance record
                self.active_agents[room_name] = AgentInstance(
                    agent_id=agent_id,
                    project_id=project_id or agent_config.project_id,
                    room_name=room_name,
                    participant_count=0,
                    started_at=datetime.utcnow(),
                    status="active"
                )
                
                return True
            else:
                logger.warning(f"No agent_id in room metadata for {room_name}")
                return True  # Allow default agent to handle
                
        except Exception as e:
            logger.error(f"Error routing job: {e}")
            return False
    
    async def update_call_status(self, call_id: str, status: str, room_name: str = None):
        """Update call status in database"""
        try:
            call = await Call.get(call_id)
            if call:
                call.call_status = status
                if room_name:
                    call.room_name = room_name
                await call.save()
                logger.info(f"Updated call {call_id} status to {status}")
        except Exception as e:
            logger.error(f"Failed to update call status: {e}")
    
    async def handle_room_event(self, room_name: str, event_type: str, data: dict = None):
        """Handle room events for monitoring"""
        try:
            if room_name in self.active_agents:
                agent_instance = self.active_agents[room_name]
                
                if event_type == "participant_joined":
                    agent_instance.participant_count += 1
                elif event_type == "participant_left":
                    agent_instance.participant_count -= 1
                    
                    # Clean up if no participants
                    if agent_instance.participant_count <= 1:  # Only agent left
                        await self.cleanup_agent_instance(room_name)
                
                logger.info(f"Room {room_name} event: {event_type}, participants: {agent_instance.participant_count}")
                
        except Exception as e:
            logger.error(f"Error handling room event: {e}")
    
    async def cleanup_agent_instance(self, room_name: str):
        """Clean up agent instance when room is empty"""
        try:
            if room_name in self.active_agents:
                agent_instance = self.active_agents[room_name]
                agent_instance.status = "stopping"
                
                # Update any related call records
                calls = await Call.find(Call.room_name == room_name, Call.call_status == "answered").to_list()
                for call in calls:
                    call.call_status = "completed"
                    call.ended_at = datetime.utcnow()
                    if call.answered_at:
                        duration = (call.ended_at - call.answered_at).total_seconds()
                        call.duration_seconds = int(duration)
                    await call.save()
                
                # Remove from active agents
                del self.active_agents[room_name]
                logger.info(f"Cleaned up agent instance for room {room_name}")
                
        except Exception as e:
            logger.error(f"Error cleaning up agent instance: {e}")
    
    async def get_agent_stats(self) -> Dict:
        """Get statistics about active agents"""
        try:
            stats = {
                "active_agents": len(self.active_agents),
                "total_participants": sum(a.participant_count for a in self.active_agents.values()),
                "agents_by_project": {},
                "agents_by_status": {"active": 0, "idle": 0, "stopping": 0}
            }
            
            for agent in self.active_agents.values():
                # Count by project
                if agent.project_id not in stats["agents_by_project"]:
                    stats["agents_by_project"][agent.project_id] = 0
                stats["agents_by_project"][agent.project_id] += 1
                
                # Count by status
                stats["agents_by_status"][agent.status] += 1
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting agent stats: {e}")
            return {}
    
    async def start_campaign_agents(self, campaign_id: str) -> bool:
        """Start agents for a campaign"""
        try:
            campaign = await Campaign.get(campaign_id)
            if not campaign:
                logger.error(f"Campaign {campaign_id} not found")
                return False
            
            if not campaign.ai_agent_id:
                logger.error(f"Campaign {campaign_id} has no assigned agent")
                return False
            
            # Get pending calls for this campaign
            calls = await Call.find(
                Call.campaign_id == campaign_id,
                Call.call_status == "pending"
            ).to_list()
            
            logger.info(f"Starting agents for {len(calls)} calls in campaign {campaign_id}")
            
            for call in calls:
                try:
                    await self.initiate_outbound_call(call)
                except Exception as e:
                    logger.error(f"Failed to initiate call {call.id}: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error starting campaign agents: {e}")
            return False
    
    async def initiate_outbound_call(self, call: Call):
        """Initiate an outbound call with agent"""
        try:
            room_name = f"call-{call.id}"
            
            # Create room
            room_request = api.CreateRoomRequest(
                name=room_name,
                metadata=f'{{"agent_id": "{call.ai_agent_id}", "project_id": "{call.project_id}", "call_id": "{call.id}"}}'
            )
            room = await self.livekit_api.room.create_room(room_request)
            
            # Create SIP participant
            sip_request = api.CreateSIPParticipantRequest(
                sip_trunk_id=os.getenv("SIP_TRUNK_ID"),
                sip_call_to=call.phone_number,
                room_name=room_name,
                participant_identity=f"caller-{call.id}",
                participant_name=f"Call to {call.phone_number}"
            )
            
            sip_participant = await self.livekit_api.sip.create_sip_participant(sip_request)
            
            # Update call record
            call.room_name = room_name
            call.sip_call_id = sip_participant.sip_call_id
            call.participant_id = sip_participant.participant_identity
            call.call_status = "ringing"
            await call.save()
            
            logger.info(f"Initiated outbound call {call.id} to {call.phone_number}")
            
        except Exception as e:
            logger.error(f"Failed to initiate outbound call: {e}")
            call.call_status = "failed"
            call.call_outcome = f"Failed to initiate: {str(e)}"
            await call.save()


# Global manager instance
agent_manager = AgentWorkerManager()


async def prewarm_function():
    """Prewarm function called before handling jobs"""
    await agent_manager.initialize()
    logger.info("Agent worker prewarmed")


async def enhanced_entrypoint(ctx):
    """Enhanced entrypoint with routing and management"""
    try:
        # Route the job
        routed = await agent_manager.route_job(ctx.job)
        if not routed:
            logger.error(f"Failed to route job for room {ctx.room.name}")
            return
        
        # Handle room events
        @ctx.room.on("participant_connected")
        def on_participant_connected(participant: rtc.RemoteParticipant):
            asyncio.create_task(
                agent_manager.handle_room_event(
                    ctx.room.name, 
                    "participant_joined",
                    {"participant_id": participant.identity}
                )
            )
        
        @ctx.room.on("participant_disconnected")
        def on_participant_disconnected(participant: rtc.RemoteParticipant):
            asyncio.create_task(
                agent_manager.handle_room_event(
                    ctx.room.name,
                    "participant_left", 
                    {"participant_id": participant.identity}
                )
            )
        
        # Call the original agent entrypoint
        await agent_entrypoint(ctx)
        
    except Exception as e:
        logger.error(f"Error in enhanced entrypoint: {e}")
        raise


if __name__ == "__main__":
    # Configure enhanced worker
    worker_options = WorkerOptions(
        entrypoint_fnc=enhanced_entrypoint,
        prewarm_fnc=prewarm_function,
        agent_name="livekit-call-center-worker",
    )
    
    # Run the worker
    cli.run_app(worker_options)