"""
Agent Lifecycle Management API
Enhanced agent deployment, scaling, and monitoring
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime, timedelta
import asyncio
import logging
import os
import subprocess
import signal

from models import AIAgent, Project, Call
from database import get_database

router = APIRouter()
logger = logging.getLogger(__name__)


class AgentDeployment(BaseModel):
    agent_id: str
    project_id: str
    deployment_type: str = "worker"  # "worker", "multimodal", "basic"
    replicas: int = 1
    auto_scale: bool = False
    min_replicas: int = 1
    max_replicas: int = 5
    cpu_limit: Optional[str] = None
    memory_limit: Optional[str] = None
    environment_vars: Optional[Dict[str, str]] = None


class AgentInstance(BaseModel):
    instance_id: str
    agent_id: str
    project_id: str
    deployment_type: str
    status: str  # "starting", "running", "stopping", "stopped", "error"
    started_at: datetime
    process_id: Optional[int] = None
    resource_usage: Optional[Dict[str, Any]] = None
    last_heartbeat: Optional[datetime] = None


class AgentStats(BaseModel):
    agent_id: str
    total_calls: int
    active_calls: int
    completed_calls: int
    failed_calls: int
    average_duration: float
    success_rate: float
    last_24h_calls: int
    current_load: float


class ScalingRule(BaseModel):
    agent_id: str
    metric_type: str  # "cpu", "memory", "call_queue", "response_time"
    threshold_up: float
    threshold_down: float
    scale_up_replicas: int = 1
    scale_down_replicas: int = 1
    cooldown_minutes: int = 5


# In-memory storage for agent instances (in production, use Redis or database)
agent_instances: Dict[str, AgentInstance] = {}
scaling_rules: Dict[str, ScalingRule] = {}


@router.post("/deploy", response_model=Dict[str, Any])
async def deploy_agent(
    deployment: AgentDeployment,
    background_tasks: BackgroundTasks
):
    """Deploy an AI agent with specified configuration"""
    
    try:
        # Validate agent exists
        agent = await AIAgent.get(deployment.agent_id)
        if not agent or not agent.is_active:
            raise HTTPException(status_code=404, detail="Agent not found or inactive")
        
        # Validate project exists
        project = await Project.get(deployment.project_id)
        if not project or not project.is_active:
            raise HTTPException(status_code=404, detail="Project not found or inactive")
        
        # Check if agent is already deployed
        existing_instances = [
            inst for inst in agent_instances.values() 
            if inst.agent_id == deployment.agent_id and inst.status in ["starting", "running"]
        ]
        
        if existing_instances and not deployment.auto_scale:
            raise HTTPException(
                status_code=400, 
                detail=f"Agent {deployment.agent_id} is already deployed. Use scale endpoint to modify."
            )
        
        # Deploy instances
        deployed_instances = []
        for i in range(deployment.replicas):
            instance_id = f"{deployment.agent_id}-{int(datetime.utcnow().timestamp())}-{i}"
            
            instance = await deploy_agent_instance(
                instance_id=instance_id,
                deployment=deployment
            )
            
            agent_instances[instance_id] = instance
            deployed_instances.append(instance)
        
        # Set up auto-scaling if enabled
        if deployment.auto_scale:
            background_tasks.add_task(
                setup_auto_scaling,
                deployment.agent_id,
                deployment.min_replicas,
                deployment.max_replicas
            )
        
        # Start monitoring
        background_tasks.add_task(monitor_agent_instances, deployment.agent_id)
        
        return {
            "deployment_id": f"deploy-{deployment.agent_id}-{int(datetime.utcnow().timestamp())}",
            "agent_id": deployment.agent_id,
            "instances_deployed": len(deployed_instances),
            "instances": [
                {
                    "instance_id": inst.instance_id,
                    "status": inst.status,
                    "started_at": inst.started_at
                }
                for inst in deployed_instances
            ],
            "auto_scale_enabled": deployment.auto_scale
        }
        
    except Exception as e:
        logger.error(f"Failed to deploy agent: {e}")
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")


@router.get("/instances", response_model=List[AgentInstance])
async def get_agent_instances(agent_id: Optional[str] = None):
    """Get all agent instances or instances for a specific agent"""
    
    try:
        if agent_id:
            instances = [
                inst for inst in agent_instances.values()
                if inst.agent_id == agent_id
            ]
        else:
            instances = list(agent_instances.values())
        
        # Update instance status with real-time data
        for instance in instances:
            await update_instance_status(instance)
        
        return instances
        
    except Exception as e:
        logger.error(f"Failed to get agent instances: {e}")
        raise HTTPException(status_code=500, detail="Failed to get instances")


@router.post("/scale/{agent_id}")
async def scale_agent(
    agent_id: str,
    target_replicas: int,
    background_tasks: BackgroundTasks
):
    """Scale an agent to target number of replicas"""
    
    try:
        if target_replicas < 0:
            raise HTTPException(status_code=400, detail="Target replicas must be >= 0")
        
        # Get current instances
        current_instances = [
            inst for inst in agent_instances.values()
            if inst.agent_id == agent_id and inst.status in ["starting", "running"]
        ]
        
        current_count = len(current_instances)
        
        if target_replicas > current_count:
            # Scale up
            scale_up_count = target_replicas - current_count
            
            # Get agent config for deployment
            agent = await AIAgent.get(agent_id)
            if not agent:
                raise HTTPException(status_code=404, detail="Agent not found")
            
            deployment = AgentDeployment(
                agent_id=agent_id,
                project_id=agent.project_id,
                replicas=scale_up_count
            )
            
            for i in range(scale_up_count):
                instance_id = f"{agent_id}-scale-{int(datetime.utcnow().timestamp())}-{i}"
                instance = await deploy_agent_instance(instance_id, deployment)
                agent_instances[instance_id] = instance
            
        elif target_replicas < current_count:
            # Scale down
            scale_down_count = current_count - target_replicas
            
            # Select instances to terminate (oldest first)
            instances_to_stop = sorted(
                current_instances, 
                key=lambda x: x.started_at
            )[:scale_down_count]
            
            for instance in instances_to_stop:
                background_tasks.add_task(stop_agent_instance, instance.instance_id)
        
        return {
            "agent_id": agent_id,
            "previous_replicas": current_count,
            "target_replicas": target_replicas,
            "action": "scale_up" if target_replicas > current_count else "scale_down" if target_replicas < current_count else "no_change"
        }
        
    except Exception as e:
        logger.error(f"Failed to scale agent: {e}")
        raise HTTPException(status_code=500, detail=f"Scaling failed: {str(e)}")


@router.delete("/instances/{instance_id}")
async def stop_agent_instance_endpoint(instance_id: str):
    """Stop a specific agent instance"""
    
    try:
        if instance_id not in agent_instances:
            raise HTTPException(status_code=404, detail="Instance not found")
        
        instance = agent_instances[instance_id]
        
        # Stop the instance
        await stop_agent_instance(instance_id)
        
        return {
            "instance_id": instance_id,
            "status": "stopping",
            "message": "Instance stop initiated"
        }
        
    except Exception as e:
        logger.error(f"Failed to stop instance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop instance: {str(e)}")


@router.get("/stats/{agent_id}", response_model=AgentStats)
async def get_agent_stats(agent_id: str, days: int = 7):
    """Get comprehensive stats for an agent"""
    
    try:
        # Get call statistics
        start_date = datetime.utcnow() - timedelta(days=days)
        
        calls = await Call.find(
            Call.ai_agent_id == agent_id,
            Call.started_at >= start_date
        ).to_list()
        
        total_calls = len(calls)
        active_calls = len([c for c in calls if c.call_status in ["ringing", "answered"]])
        completed_calls = len([c for c in calls if c.call_status == "completed"])
        failed_calls = len([c for c in calls if c.call_status == "failed"])
        
        # Calculate average duration
        completed_with_duration = [c for c in calls if c.duration_seconds and c.call_status == "completed"]
        avg_duration = sum(c.duration_seconds for c in completed_with_duration) / len(completed_with_duration) if completed_with_duration else 0
        
        # Calculate success rate
        finished_calls = completed_calls + failed_calls
        success_rate = completed_calls / finished_calls if finished_calls > 0 else 0
        
        # Last 24 hours
        last_24h = datetime.utcnow() - timedelta(hours=24)
        last_24h_calls = len([c for c in calls if c.started_at >= last_24h])
        
        # Current load (based on active instances)
        current_instances = [
            inst for inst in agent_instances.values()
            if inst.agent_id == agent_id and inst.status == "running"
        ]
        current_load = active_calls / len(current_instances) if current_instances else 0
        
        return AgentStats(
            agent_id=agent_id,
            total_calls=total_calls,
            active_calls=active_calls,
            completed_calls=completed_calls,
            failed_calls=failed_calls,
            average_duration=avg_duration,
            success_rate=success_rate,
            last_24h_calls=last_24h_calls,
            current_load=current_load
        )
        
    except Exception as e:
        logger.error(f"Failed to get agent stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get stats")


@router.post("/auto-scale/rules/{agent_id}")
async def set_scaling_rule(agent_id: str, rule: ScalingRule):
    """Set auto-scaling rules for an agent"""
    
    try:
        # Validate agent exists
        agent = await AIAgent.get(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        rule.agent_id = agent_id
        scaling_rules[agent_id] = rule
        
        return {
            "agent_id": agent_id,
            "rule_set": True,
            "metric_type": rule.metric_type,
            "thresholds": {
                "scale_up": rule.threshold_up,
                "scale_down": rule.threshold_down
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to set scaling rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to set scaling rule")


@router.get("/health")
async def get_system_health():
    """Get overall system health and capacity"""
    
    try:
        total_instances = len(agent_instances)
        running_instances = len([inst for inst in agent_instances.values() if inst.status == "running"])
        
        # Get active calls across all agents
        active_calls = await Call.find(
            Call.call_status.in_(["ringing", "answered"])
        ).count()
        
        # Calculate system load
        system_load = active_calls / running_instances if running_instances > 0 else 0
        
        return {
            "timestamp": datetime.utcnow(),
            "total_instances": total_instances,
            "running_instances": running_instances,
            "active_calls": active_calls,
            "system_load": system_load,
            "health_status": "healthy" if system_load < 0.8 else "warning" if system_load < 1.0 else "critical"
        }
        
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get health status")


# Helper functions

async def deploy_agent_instance(instance_id: str, deployment: AgentDeployment) -> AgentInstance:
    """Deploy a single agent instance"""
    
    try:
        # Determine which agent script to use
        if deployment.deployment_type == "multimodal":
            script_path = "multimodal_agent.py"
        elif deployment.deployment_type == "worker":
            script_path = "agent_worker.py"
        else:
            script_path = "agent.py"
        
        # Prepare environment variables
        env_vars = os.environ.copy()
        if deployment.environment_vars:
            env_vars.update(deployment.environment_vars)
        
        # Add agent-specific environment variables
        env_vars.update({
            "AGENT_ID": deployment.agent_id,
            "PROJECT_ID": deployment.project_id,
            "INSTANCE_ID": instance_id,
            "DEPLOYMENT_TYPE": deployment.deployment_type
        })
        
        # Start the process
        process = subprocess.Popen(
            ["python3", script_path],
            env=env_vars,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=os.setsid  # Create new process group for clean termination
        )
        
        instance = AgentInstance(
            instance_id=instance_id,
            agent_id=deployment.agent_id,
            project_id=deployment.project_id,
            deployment_type=deployment.deployment_type,
            status="starting",
            started_at=datetime.utcnow(),
            process_id=process.pid,
            last_heartbeat=datetime.utcnow()
        )
        
        logger.info(f"Started agent instance {instance_id} with PID {process.pid}")
        
        return instance
        
    except Exception as e:
        logger.error(f"Failed to deploy instance {instance_id}: {e}")
        raise


async def stop_agent_instance(instance_id: str):
    """Stop a specific agent instance"""
    
    try:
        if instance_id not in agent_instances:
            return
        
        instance = agent_instances[instance_id]
        instance.status = "stopping"
        
        if instance.process_id:
            try:
                # Graceful termination
                os.killpg(os.getpgid(instance.process_id), signal.SIGTERM)
                
                # Wait for graceful shutdown
                await asyncio.sleep(5)
                
                # Force termination if still running
                try:
                    os.killpg(os.getpgid(instance.process_id), signal.SIGKILL)
                except ProcessLookupError:
                    pass  # Process already terminated
                    
            except ProcessLookupError:
                pass  # Process doesn't exist
        
        instance.status = "stopped"
        
        # Remove from active instances after a delay
        await asyncio.sleep(10)
        if instance_id in agent_instances:
            del agent_instances[instance_id]
        
        logger.info(f"Stopped agent instance {instance_id}")
        
    except Exception as e:
        logger.error(f"Failed to stop instance {instance_id}: {e}")


async def update_instance_status(instance: AgentInstance):
    """Update instance status based on process health"""
    
    try:
        if instance.process_id:
            try:
                # Check if process is still running
                os.kill(instance.process_id, 0)
                
                # Process exists, update heartbeat
                instance.last_heartbeat = datetime.utcnow()
                
                if instance.status == "starting":
                    # Check if it's been running long enough to be considered "running"
                    if (datetime.utcnow() - instance.started_at).total_seconds() > 30:
                        instance.status = "running"
                
            except ProcessLookupError:
                # Process doesn't exist
                instance.status = "stopped"
                
        else:
            # No process ID, might be an error
            if instance.status not in ["stopped", "error"]:
                instance.status = "error"
        
    except Exception as e:
        logger.error(f"Failed to update instance status: {e}")
        instance.status = "error"


async def monitor_agent_instances(agent_id: str):
    """Background task to monitor agent instances"""
    
    try:
        while True:
            instances = [
                inst for inst in agent_instances.values()
                if inst.agent_id == agent_id
            ]
            
            for instance in instances:
                await update_instance_status(instance)
                
                # Check for unhealthy instances
                if instance.last_heartbeat:
                    time_since_heartbeat = (datetime.utcnow() - instance.last_heartbeat).total_seconds()
                    if time_since_heartbeat > 300:  # 5 minutes
                        logger.warning(f"Instance {instance.instance_id} hasn't responded in {time_since_heartbeat}s")
                        instance.status = "error"
            
            await asyncio.sleep(30)  # Check every 30 seconds
            
    except Exception as e:
        logger.error(f"Error monitoring agent instances: {e}")


async def setup_auto_scaling(agent_id: str, min_replicas: int, max_replicas: int):
    """Set up auto-scaling for an agent"""
    
    try:
        logger.info(f"Auto-scaling enabled for agent {agent_id}: {min_replicas}-{max_replicas} replicas")
        
        while True:
            # Check if we should scale based on rules
            if agent_id in scaling_rules:
                rule = scaling_rules[agent_id]
                
                # Get current metrics (simplified example)
                stats = await get_agent_stats(agent_id)
                
                current_instances = len([
                    inst for inst in agent_instances.values()
                    if inst.agent_id == agent_id and inst.status == "running"
                ])
                
                # Simple load-based scaling
                if rule.metric_type == "call_queue" and stats.current_load > rule.threshold_up:
                    if current_instances < max_replicas:
                        await scale_agent(agent_id, current_instances + rule.scale_up_replicas, BackgroundTasks())
                        logger.info(f"Auto-scaled up agent {agent_id} due to high load: {stats.current_load}")
                
                elif rule.metric_type == "call_queue" and stats.current_load < rule.threshold_down:
                    if current_instances > min_replicas:
                        await scale_agent(agent_id, max(min_replicas, current_instances - rule.scale_down_replicas), BackgroundTasks())
                        logger.info(f"Auto-scaled down agent {agent_id} due to low load: {stats.current_load}")
            
            await asyncio.sleep(60)  # Check every minute
            
    except Exception as e:
        logger.error(f"Error in auto-scaling for agent {agent_id}: {e}")