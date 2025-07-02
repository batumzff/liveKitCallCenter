import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

from models import (
    Project, AIAgent, Contact, Campaign, Call, 
    CallAnalytics, CallAnalysis, GroupCall, GroupCallParticipant
)

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/livekit_callcenter")


class Database:
    client: AsyncIOMotorClient = None
    database = None


db = Database()


async def connect_to_mongo():
    """Create database connection"""
    db.client = AsyncIOMotorClient(MONGODB_URL)
    db.database = db.client.get_default_database()
    
    # Initialize beanie with the document models
    await init_beanie(
        database=db.database,
        document_models=[
            Project,
            AIAgent,
            Contact,
            Campaign,
            Call,
            CallAnalytics,
            CallAnalysis,
            GroupCall,
            GroupCallParticipant,
        ]
    )


async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()


async def init_db():
    """Initialize database connection"""
    await connect_to_mongo()


def get_database():
    """Get database instance"""
    return db.database