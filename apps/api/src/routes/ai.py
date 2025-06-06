# apps/api/src/routes/ai.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
import json
import asyncio
from datetime import datetime

from ..ai.router import ai_router
from ..ai.providers.base import ChatMessage
from ..models.ai import (
    ChatRequest,
    ChatResponse,
    StreamChatRequest,
    GenerateRequest,
    GenerateResponse,
    ModelInfo,
    ProviderStatus,
    ProviderHealth,
    ModelLoadRequest,
    ModelLoadResponse,
    ConfigUpdateRequest,
    ConfigUpdateResponse,
)
from ..core.config import settings
from ..core.logger import logger

router = APIRouter(prefix="/ai", tags=["AI/ML"])

# ============================================================================
# Chat Completion Endpoints
# ============================================================================


@router.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """
    Generate chat completion using specified or default AI provider.

    Supports all providers: Ollama (local), OpenAI, HuggingFace
    Provider routing based on environment if not specified.
    """
    try:
        # Get provider (respects environment routing if not specified)
        provider = ai_router.get_provider(request.provider)

        # Validate model is available
        if request.model not in provider.models and not await provider.load_model(
            request.model
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Model '{request.model}' not available for provider '{request.provider or ai_router.default_provider}'",
            )

        # Generate chat completion
        start_time = datetime.utcnow()
        response_text = await provider.chat(
            messages=request.messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        end_time = datetime.utcnow()

        # Calculate response time
        response_time_ms = int((end_time - start_time).total_seconds() * 1000)

        return ChatResponse(
            response=response_text,
            model=request.model,
            provider=request.provider or ai_router.default_provider,
            usage={
                "response_time_ms": response_time_ms,
                "timestamp": start_time.isoformat(),
            },
        )

    except Exception as e:
        logger.error(f"Chat completion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat completion failed: {str(e)}")


@router.post("/chat/stream")
async def chat_completion_stream(request: StreamChatRequest):
    """
    Stream chat completion with real-time responses.

    Returns Server-Sent Events (SSE) stream for real-time AI responses.
    Compatible with EventSource API on frontend.
    """
    try:
        provider = ai_router.get_provider(request.provider)

        # Validate model
        if request.model not in provider.models and not await provider.load_model(
            request.model
        ):
            raise HTTPException(
                status_code=400, detail=f"Model '{request.model}' not available"
            )

        async def generate_stream():
            try:
                # Send initial metadata
                yield f"data: {json.dumps({'type': 'start', 'model': request.model, 'provider': request.provider or ai_router.default_provider})}\n\n"

                # Stream chat completion
                async for chunk in provider.chat_stream(
                    messages=request.messages,
                    model=request.model,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                ):
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"

                # Send completion signal
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"Streaming error: {str(e)}")
                yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            },
        )

    except Exception as e:
        logger.error(f"Stream setup error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Stream setup failed: {str(e)}")


@router.post("/generate", response_model=GenerateResponse)
async def text_generation(request: GenerateRequest):
    """
    Generate text completion from prompt (non-chat format).

    Useful for simple text generation tasks.
    """
    try:
        provider = ai_router.get_provider(request.provider)

        if request.model not in provider.models and not await provider.load_model(
            request.model
        ):
            raise HTTPException(
                status_code=400, detail=f"Model '{request.model}' not available"
            )

        response_text = await provider.generate(
            prompt=request.prompt,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        return GenerateResponse(
            generated_text=response_text,
            model=request.model,
            provider=request.provider or ai_router.default_provider,
        )

    except Exception as e:
        logger.error(f"Text generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text generation failed: {str(e)}")


# ============================================================================
# Model Management Endpoints
# ============================================================================


@router.get("/models", response_model=List[ModelInfo])
async def list_models(provider: Optional[str] = None):
    """
    List available models for specified provider or all providers.

    Returns model information including availability status.
    """
    try:
        models = []

        if provider:
            # List models for specific provider
            if provider not in ai_router.providers:
                raise HTTPException(
                    status_code=404, detail=f"Provider '{provider}' not found"
                )

            ai_provider = ai_router.providers[provider]
            provider_models = await _get_provider_models(provider, ai_provider)
            models.extend(provider_models)
        else:
            # List models for all providers
            for provider_name, ai_provider in ai_router.providers.items():
                provider_models = await _get_provider_models(provider_name, ai_provider)
                models.extend(provider_models)

        return models

    except Exception as e:
        logger.error(f"Model listing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")


async def _get_provider_models(provider_name: str, provider) -> List[ModelInfo]:
    """Helper function to get models from a specific provider."""
    models = []

    if provider_name == "ollama":
        # Get Ollama models (both configured and available)
        try:
            # Get available models from Ollama API
            available_models = await provider.list_available_models()
            configured_models = getattr(provider, "configured_models", [])

            for model in configured_models:
                models.append(
                    ModelInfo(
                        name=model,
                        provider=provider_name,
                        status="loaded" if model in provider.models else "available",
                        description=f"Ollama model: {model}",
                    )
                )

            # Add other available models not in config
            for model in available_models:
                if model not in configured_models:
                    models.append(
                        ModelInfo(
                            name=model,
                            provider=provider_name,
                            status="available",
                            description=f"Available Ollama model: {model}",
                        )
                    )

        except Exception as e:
            logger.warning(f"Could not fetch Ollama models: {e}")

    elif provider_name in ["openai", "huggingface"]:
        # Get configured models for cloud providers
        configured_models = getattr(provider, "configured_models", [])
        for model in configured_models:
            models.append(
                ModelInfo(
                    name=model,
                    provider=provider_name,
                    status="available",
                    description=f"{provider_name.title()} model: {model}",
                )
            )

    return models


@router.post("/models/{model_name}/load", response_model=ModelLoadResponse)
async def load_model(
    model_name: str, request: ModelLoadRequest, background_tasks: BackgroundTasks
):
    """
    Load a specific model for a provider.

    For Ollama: Downloads and loads the model.
    For cloud providers: Validates model availability.
    """
    try:
        provider = ai_router.get_provider(request.provider)

        # For large models, load in background to avoid request timeout
        if request.provider == "ollama" or request.background:
            background_tasks.add_task(_load_model_background, provider, model_name)
            return ModelLoadResponse(
                message=f"Loading model {model_name} in background...",
                model=model_name,
                provider=request.provider or ai_router.default_provider,
                status="loading",
            )
        else:
            # Load synchronously for cloud providers (fast validation)
            success = await provider.load_model(model_name)

            return ModelLoadResponse(
                message=f"Model {model_name} {'loaded successfully' if success else 'failed to load'}",
                model=model_name,
                provider=request.provider or ai_router.default_provider,
                status="loaded" if success else "error",
            )

    except Exception as e:
        logger.error(f"Model loading error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")


async def _load_model_background(provider, model_name: str):
    """Background task for loading large models."""
    try:
        success = await provider.load_model(model_name)
        if success:
            logger.info(f"Background model loading completed: {model_name}")
        else:
            logger.error(f"Background model loading failed: {model_name}")
    except Exception as e:
        logger.error(f"Background model loading error for {model_name}: {e}")


@router.delete("/models/{model_name}")
async def unload_model(model_name: str, provider: Optional[str] = None):
    """
    Unload a model to free resources.

    Particularly useful for Ollama to manage GPU/CPU memory.
    """
    try:
        ai_provider = ai_router.get_provider(provider)

        if hasattr(ai_provider, "unload_model"):
            success = await ai_provider.unload_model(model_name)
            if success:
                return {"message": f"Model {model_name} unloaded successfully"}
            else:
                raise HTTPException(
                    status_code=400, detail=f"Failed to unload model {model_name}"
                )
        else:
            return {"message": f"Provider does not support model unloading"}

    except Exception as e:
        logger.error(f"Model unloading error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to unload model: {str(e)}")


# ============================================================================
# Health and Status Endpoints
# ============================================================================


@router.get("/health", response_model=Dict[str, ProviderHealth])
async def health_check():
    """
    Check health status of all AI providers.

    Returns detailed status for monitoring and debugging.
    """
    try:
        health_results = {}

        for name, provider in ai_router.providers.items():
            try:
                is_healthy = await provider.health_check()
                loaded_models = (
                    list(provider.models.keys()) if hasattr(provider, "models") else []
                )

                # Get additional provider-specific info
                additional_info = {}
                if name == "ollama":
                    additional_info = await _get_ollama_health_info(provider)
                elif name in ["openai", "huggingface"]:
                    additional_info = await _get_cloud_provider_health_info(provider)

                health_results[name] = ProviderHealth(
                    name=name,
                    status="healthy" if is_healthy else "unhealthy",
                    models=loaded_models,
                    last_check=datetime.utcnow().isoformat(),
                    **additional_info,
                )

            except Exception as e:
                health_results[name] = ProviderHealth(
                    name=name,
                    status="error",
                    models=[],
                    last_check=datetime.utcnow().isoformat(),
                    error=str(e),
                )

        return health_results

    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


async def _get_ollama_health_info(provider) -> Dict[str, Any]:
    """Get Ollama-specific health information."""
    try:
        info = {}

        # Get Ollama version and status
        if hasattr(provider, "get_version"):
            info["version"] = await provider.get_version()

        # Get GPU information
        if hasattr(provider, "get_gpu_info"):
            info["gpu_info"] = await provider.get_gpu_info()

        # Get available disk space
        if hasattr(provider, "get_disk_usage"):
            info["disk_usage"] = await provider.get_disk_usage()

        return info
    except:
        return {}


async def _get_cloud_provider_health_info(provider) -> Dict[str, Any]:
    """Get cloud provider-specific health information."""
    try:
        info = {}

        # Get rate limiting info
        if hasattr(provider, "get_rate_limit_status"):
            info["rate_limits"] = await provider.get_rate_limit_status()

        # Get API quota info
        if hasattr(provider, "get_quota_info"):
            info["quota"] = await provider.get_quota_info()

        return info
    except:
        return {}


@router.get("/status")
async def quick_status():
    """
    Quick status check for monitoring.

    Returns simplified status for load balancers and monitoring systems.
    """
    try:
        # Quick health check of default provider
        default_provider = ai_router.get_provider()
        is_healthy = await default_provider.health_check()

        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "default_provider": ai_router.default_provider,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


# ============================================================================
# Configuration Endpoints
# ============================================================================


@router.get("/config")
async def get_ai_config():
    """
    Get current AI configuration.

    Returns provider settings and routing configuration.
    """
    try:
        config = {
            "providers": {},
            "routing": ai_router.routing_config,
            "default_provider": ai_router.default_provider,
        }

        # Get provider configurations (excluding sensitive data)
        for name, provider in ai_router.providers.items():
            provider_config = {
                "enabled": True,
                "models": (
                    list(provider.models.keys()) if hasattr(provider, "models") else []
                ),
            }

            # Add provider-specific config
            if name == "ollama":
                provider_config.update(
                    {
                        "url": getattr(provider, "base_url", "http://localhost:11434"),
                        "configured_models": getattr(provider, "configured_models", []),
                    }
                )
            elif name in ["openai", "huggingface"]:
                provider_config.update(
                    {
                        "configured_models": getattr(provider, "configured_models", []),
                        "has_api_key": bool(getattr(provider, "api_key", None)),
                    }
                )

            config["providers"][name] = provider_config

        return config

    except Exception as e:
        logger.error(f"Config retrieval error: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get configuration: {str(e)}"
        )


@router.post("/config/update", response_model=ConfigUpdateResponse)
async def update_ai_config(request: ConfigUpdateRequest):
    """
    Update AI configuration at runtime.

    Allows dynamic provider configuration without server restart.
    """
    try:
        updated_settings = []

        # Update provider settings
        if request.provider_settings:
            for provider_name, settings in request.provider_settings.items():
                if provider_name in ai_router.providers:
                    provider = ai_router.providers[provider_name]

                    # Update provider configuration
                    if hasattr(provider, "update_config"):
                        await provider.update_config(settings)
                        updated_settings.append(
                            f"Updated {provider_name} configuration"
                        )

        # Update routing configuration
        if request.routing:
            ai_router.routing_config.update(request.routing)
            updated_settings.append("Updated routing configuration")

        # Update default provider
        if request.default_provider:
            if request.default_provider in ai_router.providers:
                ai_router.default_provider = request.default_provider
                updated_settings.append(
                    f"Set default provider to {request.default_provider}"
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Provider '{request.default_provider}' not available",
                )

        return ConfigUpdateResponse(
            message="Configuration updated successfully",
            updated_settings=updated_settings,
            timestamp=datetime.utcnow().isoformat(),
        )

    except Exception as e:
        logger.error(f"Config update error: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to update configuration: {str(e)}"
        )


@router.post("/config/reload")
async def reload_ai_config():
    """
    Reload AI configuration from farm.config.ts.

    Useful for applying configuration file changes without server restart.
    """
    try:
        # Reload configuration
        await ai_router.reload_configuration()

        return {
            "message": "AI configuration reloaded successfully",
            "providers": list(ai_router.providers.keys()),
            "default_provider": ai_router.default_provider,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Config reload error: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to reload configuration: {str(e)}"
        )


# ============================================================================
# Utility Endpoints
# ============================================================================


@router.post("/benchmark/{model_name}")
async def benchmark_model(
    model_name: str,
    provider: Optional[str] = None,
    test_prompt: str = "Hello, how are you?",
    iterations: int = 5,
):
    """
    Benchmark model performance.

    Useful for comparing providers and models.
    """
    try:
        ai_provider = ai_router.get_provider(provider)

        if model_name not in ai_provider.models:
            await ai_provider.load_model(model_name)

        results = []
        total_time = 0

        for i in range(iterations):
            start_time = datetime.utcnow()

            response = await ai_provider.generate(
                prompt=test_prompt, model=model_name, temperature=0.7, max_tokens=100
            )

            end_time = datetime.utcnow()
            response_time = (end_time - start_time).total_seconds() * 1000
            total_time += response_time

            results.append(
                {
                    "iteration": i + 1,
                    "response_time_ms": response_time,
                    "response_length": len(response),
                    "tokens_per_second": (
                        len(response.split()) / (response_time / 1000)
                        if response_time > 0
                        else 0
                    ),
                }
            )

        avg_time = total_time / iterations

        return {
            "model": model_name,
            "provider": provider or ai_router.default_provider,
            "test_prompt": test_prompt,
            "iterations": iterations,
            "results": results,
            "summary": {
                "average_response_time_ms": avg_time,
                "total_time_ms": total_time,
                "min_time_ms": min(r["response_time_ms"] for r in results),
                "max_time_ms": max(r["response_time_ms"] for r in results),
            },
        }

    except Exception as e:
        logger.error(f"Benchmark error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Benchmark failed: {str(e)}")


# ============================================================================
# Error Handlers
# ============================================================================


@router.exception_handler(Exception)
async def ai_exception_handler(request, exc):
    """Global exception handler for AI endpoints."""
    logger.error(f"Unexpected AI API error: {str(exc)}")
    return HTTPException(
        status_code=500, detail="An unexpected error occurred in the AI service"
    )
