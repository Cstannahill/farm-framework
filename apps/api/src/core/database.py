# apps/api/src/core/database.py
"""
Database connection and initialization - Updated for AI models
Supports MongoDB (primary) with flexible database options
"""

import asyncio
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from .config import settings
import logging

logger = logging.getLogger(__name__)


class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None


database = Database()


async def connect_to_database():
    """Create database connection"""
    try:
        logger.info(f"🔌 Connecting to {settings.database.type} database...")

        if settings.database.type == "mongodb":
            # MongoDB connection
            database.client = AsyncIOMotorClient(
                settings.database.url, serverSelectionTimeoutMS=5000
            )

            # Test connection
            await database.client.admin.command("ping")
            database.database = database.client[settings.database.name]

            logger.info(f"✅ Connected to MongoDB: {settings.database.name}")

        else:
            raise ValueError(f"Unsupported database type: {settings.database.type}")

    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        raise


async def close_database_connection():
    """Close database connection"""
    if database.client:
        database.client.close()
        logger.info("🔐 Database connection closed")


async def init_models():
    """Initialize Beanie models"""
    try:
        # Import all AI models
        from ..models.ai import AIModel, Conversation, AIInferenceLog, AIModelUsage

        if database.database is None:
            raise RuntimeError("Database is not connected")

        # Initialize Beanie with all AI models
        await init_beanie(
            database=database.database,
            document_models=[
                AIModel,
                Conversation,
                AIInferenceLog,
                AIModelUsage,
                # Add other models here as you create them
            ],
        )

        logger.info("📋 Database models initialized")
        logger.info(f"   • AIModel - AI model registry")
        logger.info(f"   • Conversation - Chat conversations")
        logger.info(f"   • AIInferenceLog - AI API call logs")
        logger.info(f"   • AIModelUsage - Usage analytics")

    except Exception as e:
        logger.error(f"❌ Failed to initialize models: {e}")
        raise


async def seed_initial_data():
    """Seed database with initial AI models and data"""
    try:
        from ..models.ai import AIModel, get_available_models

        # Check if we already have models
        existing_models = await get_available_models()
        if existing_models:
            logger.info(f"📋 Found {len(existing_models)} existing AI models")
            return

        # Seed initial Ollama models
        initial_models = [
            AIModel(
                name="llama3.1",
                provider="ollama",
                family="llama",
                size="8B",
                description="Meta's Llama 3.1 8B model for general conversation",
                capabilities=["text-generation", "chat", "code-generation"],
                context_length=131072,
                max_tokens=4096,
                status="available",
            ),
            AIModel(
                name="codestral",
                provider="ollama",
                family="codestral",
                size="22B",
                description="Mistral's Codestral model optimized for code generation",
                capabilities=["code-generation", "text-generation"],
                context_length=32768,
                max_tokens=2048,
                status="available",
            ),
            AIModel(
                name="phi3",
                provider="ollama",
                family="phi",
                size="3.8B",
                description="Microsoft's Phi-3 small but capable model",
                capabilities=["text-generation", "chat"],
                context_length=128000,
                max_tokens=2048,
                status="available",
            ),
        ]

        # Seed OpenAI models
        openai_models = [
            AIModel(
                name="gpt-3.5-turbo",
                provider="openai",
                family="gpt",
                description="OpenAI's GPT-3.5 Turbo for fast, cost-effective responses",
                capabilities=["text-generation", "chat", "function-calling"],
                context_length=4096,
                max_tokens=4096,
                status="available",
            ),
            AIModel(
                name="gpt-4",
                provider="openai",
                family="gpt",
                description="OpenAI's GPT-4 for advanced reasoning and complex tasks",
                capabilities=["text-generation", "chat", "function-calling", "vision"],
                context_length=8192,
                max_tokens=4096,
                status="available",
            ),
        ]

        # Insert models
        all_models = initial_models + openai_models
        await AIModel.insert_many(all_models)

        logger.info(f"🌱 Seeded {len(all_models)} initial AI models")
        logger.info(f"   • {len(initial_models)} Ollama models")
        logger.info(f"   • {len(openai_models)} OpenAI models")

    except Exception as e:
        logger.error(f"❌ Failed to seed initial data: {e}")
        # Don't raise - seeding is optional


# Database dependency for FastAPI
async def get_database():
    """FastAPI dependency to get database instance"""
    return database.database


# Export commonly used functions
__all__ = [
    "connect_to_database",
    "close_database_connection",
    "init_models",
    "seed_initial_data",
    "get_database",
    "database",
]
