# apps/api/src/main.py
"""
FARM Framework FastAPI Application - Updated with AI model seeding
Main entry point with AI provider integration and database initialization
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import logging
from contextlib import asynccontextmanager

# Core imports
from .core.config import settings
from .core.database import (
    connect_to_database,
    close_database_connection,
    init_models,
    seed_initial_data,
)

# AI imports
from .ai.router import ai_router

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with database and AI initialization"""
    # Startup
    logger.info("🌾 Starting FARM API server...")

    try:
        # Connect to database
        await connect_to_database()
        await init_models()

        # Seed initial AI models if database is empty
        await seed_initial_data()

        # Initialize AI providers
        logger.info("🤖 Initializing AI providers...")
        health = await ai_router.health_check_all()
        healthy_providers = [name for name, status in health.items() if status]

        if healthy_providers:
            logger.info(f"✅ AI providers ready: {', '.join(healthy_providers)}")
        else:
            logger.warning("⚠️ No AI providers are healthy!")

        # Check if we have AI models in database
        try:
            from .models.ai import get_available_models

            models = await get_available_models()
            logger.info(f"📋 Found {len(models)} AI models in database")
        except Exception as e:
            logger.warning(f"⚠️ Could not check AI models: {e}")

        logger.info("🚀 FARM API server started successfully!")

    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        raise

    yield

    # Shutdown
    logger.info("🛑 Shutting down FARM API server...")
    await close_database_connection()
    logger.info("✅ Server shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="FARM Stack Framework API with AI Integration",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    try:
        # Check AI providers
        ai_health = await ai_router.health_check_all()

        # Check database and models
        db_status = "connected"
        model_count = 0
        try:
            from .models.ai import get_available_models

            models = await get_available_models()
            model_count = len(models)
        except Exception as e:
            db_status = f"error: {str(e)}"

        return {
            "status": "healthy",
            "app": settings.app_name,
            "version": settings.version,
            "environment": settings.environment,
            "ai_providers": ai_health,
            "database": db_status,
            "ai_models_count": model_count,
            "features": {
                "ai_enabled": len(ai_health) > 0,
                "streaming": settings.ai.streaming,
                "caching": settings.ai.caching,
            },
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")


# Root endpoint with comprehensive info
@app.get("/")
async def root():
    """Root endpoint with API information"""
    try:
        from .ai.router import ai_router

        available_providers = ai_router.get_available_providers()

        # Get model count
        model_count = 0
        try:
            from .models.ai import get_available_models

            models = await get_available_models()
            model_count = len(models)
        except:
            pass

    except:
        available_providers = []

    return {
        "message": "FARM Stack Framework API",
        "version": settings.version,
        "environment": settings.environment,
        "endpoints": {"docs": "/docs", "health": "/health", "ai": "/api/ai"},
        "ai": {
            "providers": available_providers,
            "models_available": model_count,
            "default_provider": (
                ai_router.default_provider if ai_router.is_configured() else None
            ),
        },
        "status": "running",
    }


# Try to include AI routes if available
try:
    from .routes import ai as ai_routes

    app.include_router(ai_routes.router, prefix="/api/ai", tags=["AI"])
    logger.info("✅ AI routes loaded")
except ImportError as e:
    logger.warning(f"⚠️ AI routes not available: {e}")

    # Create minimal AI status endpoint for testing
    @app.get("/api/ai/status")
    async def ai_status():
        return {
            "message": "AI routes not configured",
            "error": "Import failed - check your AI route configuration",
            "available_providers": (
                ai_router.get_available_providers() if ai_router.is_configured() else []
            ),
        }


# Model management endpoints
@app.get("/api/models")
async def list_models():
    """List all available AI models"""
    try:
        from .models.ai import get_available_models

        models = await get_available_models()
        return {
            "models": [
                {
                    "name": model.name,
                    "provider": model.provider,
                    "family": model.family,
                    "size": model.size,
                    "description": model.description,
                    "capabilities": model.capabilities,
                    "status": model.status,
                    "last_used": model.last_used,
                }
                for model in models
            ],
            "total": len(models),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")


@app.get("/api/models/{provider}")
async def list_models_by_provider(provider: str):
    """List models for a specific provider"""
    try:
        from .models.ai import get_available_models

        models = await get_available_models(provider=provider)
        return {
            "provider": provider,
            "models": [
                {
                    "name": model.name,
                    "family": model.family,
                    "size": model.size,
                    "description": model.description,
                    "capabilities": model.capabilities,
                    "status": model.status,
                }
                for model in models
            ],
            "total": len(models),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list {provider} models: {str(e)}"
        )


# Error handlers
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle ValueError exceptions"""
    return JSONResponse(
        status_code=400, content={"error": "Invalid request", "detail": str(exc)}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": "An unexpected error occurred",
            "type": type(exc).__name__,
        },
    )


# Development startup message
if settings.environment == "development":

    @app.on_event("startup")
    async def startup_message():
        """Print startup information in development"""
        print(
            f"""
🌾 FARM Framework API Server
================================
📍 Environment: {settings.environment}
🌐 Server: http://{settings.api_host}:{settings.api_port}
📚 Docs: http://{settings.api_host}:{settings.api_port}/docs
🔍 Health: http://{settings.api_host}:{settings.api_port}/health

🤖 AI Providers:
{chr(10).join(f"   • {provider}" for provider in ai_router.get_available_providers())}

🔧 Default AI Provider: {ai_router.default_provider}
📋 AI Models: /api/models
================================
        """
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.reload,
        log_level="info",
    )
