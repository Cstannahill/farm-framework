"""AI Configuration module."""

from __future__ import annotations
from typing import Dict, Any, Optional, Union, List
from pydantic import BaseModel


class ProviderConfig(BaseModel):
    """Configuration for an AI provider."""

    enabled: bool = True
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    timeout: Optional[int] = None
    max_retries: Optional[int] = None


class OllamaConfig(ProviderConfig):
    """Configuration for Ollama provider."""

    base_url: Optional[str] = "http://localhost:11434"
    model: Optional[str] = "llama2"
    autoStart: bool = True
    autoPull: List[str] = []


class OpenAIConfig(ProviderConfig):
    """Configuration for OpenAI provider."""

    base_url: Optional[str] = "https://api.openai.com/v1"
    model: Optional[str] = "gpt-3.5-turbo"


class HuggingFaceConfig(ProviderConfig):
    """Configuration for HuggingFace provider."""

    base_url: Optional[str] = None
    model: Optional[str] = "microsoft/DialoGPT-medium"


class RoutingConfig(BaseModel):
    """Configuration for request routing."""

    strategy: str = "round_robin"  # round_robin, least_loaded, weighted
    health_check_interval: int = 30
    fallback_enabled: bool = True


class FeaturesConfig(BaseModel):
    """Configuration for AI features."""

    streaming: bool = True
    caching: bool = False
    rate_limiting: bool = False
    metrics: bool = True


class AIConfig(BaseModel):
    """Main AI configuration class."""

    providers: Dict[str, Union[OllamaConfig, OpenAIConfig, HuggingFaceConfig]] = {
        "ollama": OllamaConfig(),
        "openai": OpenAIConfig(enabled=False),
        "huggingface": HuggingFaceConfig(enabled=False),
    }
    routing: RoutingConfig = RoutingConfig()
    features: FeaturesConfig = FeaturesConfig()
    default_provider: str = "ollama"

    @property
    def ollama(self) -> Dict[str, Any]:
        """Backward compatibility: access ollama config as dict."""
        ollama_config = self.providers.get("ollama")
        if ollama_config:
            return ollama_config.model_dump()
        return {}

    def update_ollama(self, new_config: Dict[str, Any]) -> None:
        """Update ollama configuration."""
        if "ollama" in self.providers:
            current_config = self.providers["ollama"].model_dump()
            current_config.update(new_config)
            self.providers["ollama"] = OllamaConfig(**current_config)

    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "AIConfig":
        """Create AIConfig from dictionary."""
        return cls(**config_dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert AIConfig to dictionary."""
        return self.model_dump()

    def get_provider_config(self, provider_name: str) -> Optional[ProviderConfig]:
        """Get configuration for a specific provider."""
        return self.providers.get(provider_name)

    def is_provider_enabled(self, provider_name: str) -> bool:
        """Check if a provider is enabled."""
        provider_config = self.get_provider_config(provider_name)
        return provider_config.enabled if provider_config else False
