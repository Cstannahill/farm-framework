# apps/api/src/core/config.py
"""
FastAPI application configuration - WORKING Pydantic v2
Fixed environment variable handling for nested settings
"""

import os
from typing import Dict, Any, Optional, List
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


class DatabaseSettings(BaseSettings):
    """Database configuration"""

    type: str = Field(default="mongodb")
    url: str = Field(default="mongodb://localhost:27017/farmapp")
    name: str = Field(default="farmapp")

    model_config = {"env_prefix": "DATABASE_"}


class OllamaSettings(BaseSettings):
    """Ollama AI provider settings"""

    enabled: bool = Field(default=True)
    url: str = Field(default="http://localhost:11434")
    models: List[str] = Field(default_factory=lambda: ["llama3.1"])
    default_model: str = Field(default="llama3.1")
    auto_start: bool = Field(default=True)
    auto_pull: List[str] = Field(default_factory=lambda: ["llama3.1"])
    gpu: bool = Field(default=True)

    model_config = {"env_prefix": "OLLAMA_"}


class OpenAISettings(BaseSettings):
    """OpenAI provider settings"""

    enabled: bool = Field(default=True)
    api_key: Optional[str] = Field(default=None)
    models: List[str] = Field(default_factory=lambda: ["gpt-4", "gpt-3.5-turbo"])
    default_model: str = Field(default="gpt-3.5-turbo")

    model_config = {"env_prefix": "OPENAI_"}


class HuggingFaceSettings(BaseSettings):
    """HuggingFace provider settings"""

    enabled: bool = Field(default=False)
    token: Optional[str] = Field(default=None)
    models: List[str] = Field(default_factory=lambda: ["microsoft/DialoGPT-medium"])
    device: str = Field(default="auto")

    model_config = {"env_prefix": "HUGGINGFACE_"}


class AISettings(BaseSettings):
    """AI configuration - Simplified for env var handling"""

    # Nested settings initialized independently
    ollama: OllamaSettings = Field(default_factory=OllamaSettings)
    openai: OpenAISettings = Field(default_factory=OpenAISettings)
    huggingface: HuggingFaceSettings = Field(default_factory=HuggingFaceSettings)

    # Simple routing dict
    routing: Dict[str, str] = Field(
        default_factory=lambda: {
            "development": "ollama",
            "staging": "openai",
            "production": "openai",
        }
    )

    # Feature flags - can be overridden by env vars
    streaming: bool = Field(default=True)
    caching: bool = Field(default=True)
    rate_limiting: bool = Field(default=True)
    fallback: bool = Field(default=True)

    model_config = {"env_prefix": "AI_"}


class DevelopmentSettings(BaseSettings):
    """Development server settings"""

    frontend_port: int = Field(default=3000)
    backend_port: int = Field(default=8000)
    proxy_port: int = Field(default=4000)
    hot_reload: bool = Field(default=True)
    type_generation: bool = Field(default=True)

    model_config = {"env_prefix": "DEV_"}


class Settings(BaseSettings):
    """Main application settings - SIMPLIFIED"""

    # App metadata
    app_name: str = Field(default="FARM App")
    version: str = Field(default="1.0.0")
    environment: str = Field(default="development")
    debug: bool = Field(default=True)

    # API settings
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    reload: bool = Field(default=True)

    # Security
    secret_key: str = Field(default="dev-secret-key-change-in-production")
    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:4000"]
    )

    # Nested settings - created independently to avoid env var conflicts
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    ai: AISettings = Field(default_factory=AISettings)
    development: DevelopmentSettings = Field(default_factory=DevelopmentSettings)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        # ✅ FIXED: Allow extra fields to handle nested env vars gracefully
        "extra": "ignore",  # Changed from "forbid" to "ignore"
        "validate_assignment": True,
        "str_strip_whitespace": True,
    }


def get_ai_provider_for_environment(environment: Optional[str] = None) -> str:
    """Get the appropriate AI provider for the current environment"""
    if environment is None:
        environment = os.getenv("FARM_ENV", "development")

    routing = {"development": "ollama", "staging": "openai", "production": "openai"}

    return routing.get(environment, "ollama")


# ✅ FIXED: Create settings with better error handling
try:
    settings = Settings()

    # Print configuration info on import (development only)
    if settings.environment == "development":
        print(f"🌾 FARM API Configuration Loaded")
        print(f"📍 Environment: {settings.environment}")
        print(f"🗄️ Database: {settings.database.type}")
        print(
            f"🤖 AI Providers: Ollama({settings.ai.ollama.enabled}), OpenAI({settings.ai.openai.enabled})"
        )
        print(f"🎯 Default AI: {get_ai_provider_for_environment()}")

except Exception as e:
    print(f"❌ Configuration validation failed: {e}")
    print("💡 Using fallback configuration")

    # Fallback configuration if validation fails
    class FallbackSettings:
        app_name = "FARM App (Fallback)"
        version = "1.0.0"
        environment = "development"
        debug = True
        api_host = "0.0.0.0"
        api_port = 8000
        reload = True
        secret_key = "dev-secret-key"
        cors_origins = ["http://localhost:3000", "http://localhost:4000"]

        class Database:
            type = "mongodb"
            url = "mongodb://localhost:27017/farmapp"
            name = "farmapp"

        class AI:
            class Ollama:
                enabled = True
                url = "http://localhost:11434"
                models = ["llama3.1", "devstral"]
                default_model = "llama3.1"
                auto_start = True
                auto_pull = ["llama3.1"]
                gpu = True

            class OpenAI:
                enabled = True
                api_key = None
                models = ["gpt-4o", "gpt-3.5-turbo"]
                default_model = "gpt-3.5-turbo"

            class HuggingFace:
                enabled = False
                token = None
                models = ["microsoft/DialoGPT-medium"]
                device = "auto"

            ollama = Ollama()
            openai = OpenAI()
            huggingface = HuggingFace()

            routing = {
                "development": "ollama",
                "staging": "openai",
                "production": "openai",
            }

            streaming = True
            caching = True
            rate_limiting = True
            fallback = True

        class Development:
            frontend_port = 3000
            backend_port = 8000
            proxy_port = 4000
            hot_reload = True
            type_generation = True

        database = Database()
        ai = AI()
        development = Development()

    settings = FallbackSettings()

# Export commonly used settings
__all__ = [
    "settings",
    "Settings",
    "AISettings",
    "DatabaseSettings",
    "get_ai_provider_for_environment",
]
