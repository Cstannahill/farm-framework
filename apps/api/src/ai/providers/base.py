"""Base classes for AI providers."""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import AsyncGenerator, List
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class AIProvider(ABC):
    """Abstract AI provider interface."""

    @abstractmethod
    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> str:
        """Return a single chat completion."""

    @abstractmethod
    async def chat_stream(
        self, messages: List[ChatMessage], model: str, **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion chunks."""

    @abstractmethod
    async def list_models(self) -> List[str]:
        """Return available model names."""

    async def load_model(self, model: str) -> None:
        """Optional: load a model."""
        return None

    async def unload_model(self, model: str) -> None:
        """Optional: unload a model."""
        return None

    async def health_check(self) -> bool:
        """Check provider health."""
        return True

    @property
    def models(self) -> dict:
        """Return available models as a dict (name: True if loaded/available). Override in subclasses if needed."""
        return getattr(self, "_models", {})
