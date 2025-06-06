"""Ollama local model provider."""

from typing import AsyncGenerator, List
import os
import httpx
from .base import AIProvider, ChatMessage

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")


class OllamaProvider(AIProvider):
    def __init__(self, config=None):
        self._models = {}
        if config and "models" in config:
            for m in config["models"]:
                self._models[m] = True

    @property
    def models(self):
        return self._models

    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={"model": model, "messages": [m.dict() for m in messages]},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "")

    async def chat_stream(
        self, messages: List[ChatMessage], model: str, **kwargs
    ) -> AsyncGenerator[str, None]:
        async def _stream():
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/chat",
                    json={
                        "model": model,
                        "stream": True,
                        "messages": [m.dict() for m in messages],
                    },
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            yield line[6:]

        return _stream()

    async def list_models(self) -> List[str]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            models = [m["name"] for m in data.get("models", [])]
            # Update self._models
            self._models = {name: True for name in models}
            return models

    async def load_model(self, model: str) -> None:
        # Ollama models are always available if listed
        return None

    async def unload_model(self, model: str) -> None:
        return None
