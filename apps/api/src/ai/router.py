# apps/api/src/ai/router.py
"""
AI Provider Router - Clean version with fixed encoding
Routes AI requests to appropriate providers based on configuration
"""

from typing import Dict, Any, Optional
from .providers.ollama import OllamaProvider
from .providers.openai import OpenAIProvider
from .providers.huggingface import HuggingFaceProvider
from ..core.config import settings, get_ai_provider_for_environment
import logging

logger = logging.getLogger(__name__)


class AIRouter:
    """Routes AI requests to appropriate providers"""

    def __init__(self):
        self.providers = {}
        self.default_provider = None
        self.setup_providers()

    def setup_providers(self):
        """Initialize AI providers based on configuration"""
        try:
            ai_config = settings.ai

            # Setup Ollama (local development)
            if ai_config.ollama.enabled:
                logger.info("Setting up Ollama provider...")
                self.providers["ollama"] = OllamaProvider(
                    {
                        "url": ai_config.ollama.url,
                        "models": ai_config.ollama.models,
                        "default_model": ai_config.ollama.default_model,
                        "auto_start": ai_config.ollama.auto_start,
                        "auto_pull": ai_config.ollama.auto_pull,
                        "gpu": ai_config.ollama.gpu,
                    }
                )
                logger.info(f"Ollama provider configured: {ai_config.ollama.url}")

            # Setup OpenAI (cloud)
            if ai_config.openai.enabled and ai_config.openai.api_key:
                logger.info("Setting up OpenAI provider...")
                self.providers["openai"] = OpenAIProvider(
                    {
                        "api_key": ai_config.openai.api_key,
                        "models": ai_config.openai.models,
                        "default_model": ai_config.openai.default_model,
                    }
                )
                logger.info("OpenAI provider configured")
            elif ai_config.openai.enabled and not ai_config.openai.api_key:
                logger.warning("OpenAI enabled but no API key provided")

            # Setup HuggingFace
            if ai_config.huggingface.enabled:
                logger.info("Setting up HuggingFace provider...")
                self.providers["huggingface"] = HuggingFaceProvider(
                    {
                        "token": ai_config.huggingface.token,
                        "models": ai_config.huggingface.models,
                        "device": ai_config.huggingface.device,
                    }
                )
                logger.info("HuggingFace provider configured")

            # Set default provider based on environment
            self.default_provider = get_ai_provider_for_environment(
                settings.environment
            )
            logger.info(
                f"Default AI provider for {settings.environment}: {self.default_provider}"
            )

            if not self.providers:
                logger.warning("No AI providers configured!")
            else:
                logger.info(f"Available AI providers: {list(self.providers.keys())}")

        except Exception as e:
            logger.error(f"Failed to setup AI providers: {e}")
            # Don't raise - allow app to start without AI
            logger.info("App will start without AI providers")

    def get_provider(self, provider_name: Optional[str] = None):
        """Get AI provider by name or use default"""
        provider_name = provider_name or self.default_provider

        if provider_name not in self.providers:
            available = list(self.providers.keys())
            raise ValueError(
                f"AI provider '{provider_name}' not configured. "
                f"Available providers: {available}"
            )

        return self.providers[provider_name]

    async def health_check_all(self) -> Dict[str, bool]:
        """Check health of all providers"""
        results = {}
        for name, provider in self.providers.items():
            try:
                results[name] = await provider.health_check()
                logger.debug(f"{name} provider: healthy")
            except Exception as e:
                results[name] = False
                logger.warning(f"{name} provider: unhealthy - {e}")

        return results

    def get_available_providers(self) -> list:
        """Get list of available provider names"""
        return list(self.providers.keys())

    def is_configured(self) -> bool:
        """Check if any providers are configured"""
        return len(self.providers) > 0


# Global router instance
ai_router = AIRouter()


# Convenience functions
def get_ai_provider(provider_name: Optional[str] = None):
    """Get AI provider instance"""
    return ai_router.get_provider(provider_name)


async def check_ai_health():
    """Check health of all AI providers"""
    return await ai_router.health_check_all()


def get_default_provider_name():
    """Get the name of the default provider"""
    return ai_router.default_provider


def list_available_providers():
    """List all available provider names"""
    return ai_router.get_available_providers()


# Export for use in FastAPI routes
__all__ = [
    "ai_router",
    "get_ai_provider",
    "check_ai_health",
    "get_default_provider_name",
    "list_available_providers",
]
