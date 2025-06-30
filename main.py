import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, close_mongo_connection
from api.routes import projects, agents, campaigns, calls, analytics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager"""
    # Startup
    await init_db()
    logger.info("Database initialized")
    
    yield
    
    # Shutdown
    await close_mongo_connection()
    logger.info("Application shutting down")


# FastAPI app for REST API
app = FastAPI(
    title="LiveKit Call Center",
    description="AI-powered call center with project-based call management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["agents"])
app.include_router(campaigns.router, prefix="/api/v1/campaigns", tags=["campaigns"])
app.include_router(calls.router, prefix="/api/v1/calls", tags=["calls"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])

# Include SIP integration routes (commented out until livekit is installed)
# from api.routes import sip_integration
# app.include_router(sip_integration.router, prefix="/api/v1/sip", tags=["sip"])

# Include agent management routes (commented out until livekit is installed)
# from api.routes import agent_management
# app.include_router(agent_management.router, prefix="/api/v1/agent-management", tags=["agent-management"])


@app.get("/")
async def root():
    return {"message": "LiveKit Call Center API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)