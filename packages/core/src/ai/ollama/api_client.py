# packages/core/src/ai/ollama/api_client.py
import asyncio
import httpx
import json
from typing import (
    Dict,
    List,
    Optional,
    AsyncIterator,
    Union,
    AsyncGenerator,
    Callable,
    Any,
)  # Added Callable, Any
from datetime import datetime
from ..providers.base import AIProvider, ChatMessage


class OllamaAPIClient(AIProvider):
    """Ollama REST API client implementing the AIProvider interface"""

    def __init__(self, config: Dict):
        super().__init__()  # Remove config argument if base does not accept it
        self.base_url = config.get("url", "http://localhost:11434")
        self.timeout = config.get("timeout", 60.0)
        self.models = {}

        # Initialize HTTP client
        self.client = httpx.AsyncClient(
            base_url=self.base_url, timeout=httpx.Timeout(self.timeout)
        )

    async def load_model(
        self, model: str
    ) -> None:  # Match base signature: param name and return type
        """Load a specific model (Ollama loads models on-demand)"""
        try:
            # Check if model exists
            models = await self.list_available_models()
            if not any(m["name"] == model for m in models):
                print(f"❌ Model {model} not found")
                return

            # Test model loading with a minimal request
            response = await self.client.post(
                "/api/generate",
                json={
                    "model": model,
                    "prompt": "test",
                    "stream": False,
                    "options": {"num_predict": 1},
                },
            )

            if response.status_code == 200:
                self.models[model] = {
                    "loaded_at": datetime.now().isoformat(),
                    "status": "ready",
                }
                print(f"✅ Model {model} loaded successfully")
            else:
                print(f"❌ Failed to load model {model}: HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ Failed to load model {model}: {e}")
        return

    async def generate(self, prompt: str, model: str, **kwargs) -> str:
        """Generate text completion using Ollama"""
        if model not in self.models:
            await self.load_model(model)

        try:
            response = await self.client.post(
                "/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": self._build_options(**kwargs),
                },
            )

            response.raise_for_status()
            result = response.json()

            return result.get("response", "")

        except Exception as e:
            raise Exception(f"Generation failed: {e}")

    async def generate_stream(
        self, prompt: str, model: str, **kwargs
    ) -> AsyncIterator[str]:
        """Generate streaming text completion from Ollama"""
        if model not in self.models:
            await self.load_model(model)

        try:
            async with self.client.stream(
                "POST",
                "/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": True,
                    "options": self._build_options(**kwargs),
                },
            ) as response:

                response.raise_for_status()

                async for chunk in response.aiter_lines():
                    if chunk:
                        try:
                            data = json.loads(chunk)
                            if "response" in data and data["response"]:
                                yield data["response"]

                            # Check if this is the final chunk
                            if data.get("done", False):
                                break

                        except json.JSONDecodeError:
                            continue

        except Exception as e:
            raise Exception(f"Streaming generation failed: {e}")

    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> str:
        """Chat completion using Ollama"""
        if model not in self.models:
            await self.load_model(model)

        try:
            response = await self.client.post(
                "/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {"role": msg.role, "content": msg.content} for msg in messages
                    ],
                    "stream": False,
                    "options": self._build_options(**kwargs),
                },
            )

            response.raise_for_status()
            result = response.json()

            message = result.get("message", {})
            return message.get("content", "")

        except Exception as e:
            raise Exception(f"Chat completion failed: {e}")

    async def chat_stream(self, messages: List[ChatMessage], model: str, **kwargs):
        async def _gen():
            if model not in self.models:
                if not await self.load_model(model):
                    raise Exception(f"Failed to load model: {model}")
            try:
                async with self.client.stream(
                    "POST",
                    "/api/chat",
                    json={
                        "model": model,
                        "messages": [
                            {"role": msg.role, "content": msg.content}
                            for msg in messages
                        ],
                        "stream": True,
                        "options": self._build_options(**kwargs),
                    },
                ) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_lines():
                        if chunk:
                            try:
                                data = json.loads(chunk)
                                if "message" in data and "content" in data["message"]:
                                    content = data["message"]["content"]
                                    if content:
                                        yield content
                                if data.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
            except Exception as e:
                raise Exception(f"Streaming chat failed: {e}")

        return _gen()

    async def embed(self, text: str, model: str) -> List[float]:
        """Generate embeddings using Ollama"""
        try:
            response = await self.client.post(
                "/api/embeddings", json={"model": model, "prompt": text}
            )

            response.raise_for_status()
            result = response.json()

            return result.get("embedding", [])

        except Exception as e:
            raise Exception(f"Embedding generation failed: {e}")

    async def list_available_models(self) -> List[Dict]:
        """List all available models"""
        try:
            response = await self.client.get("/api/tags")
            response.raise_for_status()

            data = response.json()
            return data.get("models", [])

        except Exception as e:
            print(f"❌ Failed to list models: {e}")
            return []

    async def health_check(self) -> bool:
        """Check if Ollama is running and responsive"""
        try:
            response = await self.client.get("/api/tags", timeout=5.0)
            return response.status_code == 200
        except:
            return False

    async def get_model_info(self, model_name: str) -> Optional[Dict]:
        """Get detailed information about a specific model"""
        try:
            models = await self.list_available_models()
            for model in models:
                if model["name"] == model_name:
                    return model
            return None
        except:
            return None

    def _build_options(self, **kwargs) -> Dict:
        """Build Ollama-specific options from kwargs"""
        options = {}

        # Map common parameters to Ollama options
        if "temperature" in kwargs:
            options["temperature"] = kwargs["temperature"]

        if "max_tokens" in kwargs:
            options["num_predict"] = kwargs["max_tokens"]

        if "top_p" in kwargs:
            options["top_p"] = kwargs["top_p"]

        if "top_k" in kwargs:
            options["top_k"] = kwargs["top_k"]

        if "repeat_penalty" in kwargs:
            options["repeat_penalty"] = kwargs["repeat_penalty"]

        # Add any custom Ollama options
        if "ollama_options" in kwargs:
            options.update(kwargs["ollama_options"])

        return options

    async def pull_model(
        self, model_name: str, progress_callback: Optional[Callable[[dict], Any]] = None
    ) -> bool:  # Remove problematic annotation, keep as is
        """Pull a model from Ollama registry"""
        try:
            if progress_callback:
                progress_callback({"status": "starting", "model": model_name})

            async with self.client.stream(
                "POST", "/api/pull", json={"name": model_name, "stream": True}
            ) as response:

                response.raise_for_status()

                async for chunk in response.aiter_lines():
                    if chunk:
                        try:
                            data = json.loads(chunk)

                            if progress_callback:
                                progress_callback(data)

                            # Check if completed successfully
                            status = data.get("status", "").lower()
                            if "success" in status or "complete" in status:
                                return True

                        except json.JSONDecodeError:
                            continue

            return False

        except Exception as e:
            if progress_callback:
                progress_callback({"status": "error", "error": str(e)})
            return False

    async def delete_model(self, model_name: str) -> bool:
        """Delete a model from local storage"""
        try:
            response = await self.client.request(
                "DELETE",
                "/api/delete",
                content=json.dumps({"name": model_name}),
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            if model_name in self.models:
                del self.models[model_name]
            return True
        except Exception as e:
            print(f"❌ Failed to delete model {model_name}: {e}")
            return False

    async def get_generation_stats(self, model: str, prompt: str, **kwargs) -> Dict:
        """Get generation statistics (tokens, time, etc.)"""
        start_time = datetime.now()

        try:
            response = await self.client.post(
                "/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": self._build_options(**kwargs),
                },
            )

            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            if response.status_code == 200:
                result = response.json()

                return {
                    "success": True,
                    "duration_seconds": duration,
                    "total_duration": result.get("total_duration", 0)
                    / 1e9,  # Convert to seconds
                    "load_duration": result.get("load_duration", 0) / 1e9,
                    "prompt_eval_count": result.get("prompt_eval_count", 0),
                    "prompt_eval_duration": result.get("prompt_eval_duration", 0) / 1e9,
                    "eval_count": result.get("eval_count", 0),
                    "eval_duration": result.get("eval_duration", 0) / 1e9,
                    "response_length": len(result.get("response", "")),
                    "model": model,
                }
            else:
                return {
                    "success": False,
                    "duration_seconds": duration,
                    "error": f"HTTP {response.status_code}",
                    "model": model,
                }

        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            return {
                "success": False,
                "duration_seconds": duration,
                "error": str(e),
                "model": model,
            }

    async def close(self):
        """Clean up HTTP client"""
        await self.client.aclose()

    def __del__(self):
        """Ensure client is closed on deletion"""
        if hasattr(self, "client") and not self.client.is_closed:
            # Note: This isn't ideal but provides cleanup
            # Better to explicitly call close() in application code
            asyncio.create_task(self.client.aclose())

    async def list_models(
        self,
    ) -> List[str]:  # Match base class: returns list of model names
        """List all available model names (abstract method implementation)"""
        try:
            models = await self.list_available_models()
            return [m["name"] for m in models if "name" in m]
        except Exception:
            return []


# Utility functions for convenient Ollama operations
async def quick_ollama_chat(
    messages: List[Union[ChatMessage, Dict]],
    model: str = "llama3.1",
    ollama_url: str = "http://localhost:11434",
    **kwargs,
) -> str:
    """Quick chat with Ollama - convenience function"""
    client = OllamaAPIClient({"url": ollama_url})

    try:
        # Convert dict messages to ChatMessage objects if needed
        chat_messages = []
        for msg in messages:
            if isinstance(msg, dict):
                chat_messages.append(
                    ChatMessage(role=msg["role"], content=msg["content"])
                )
            else:
                chat_messages.append(msg)

        response = await client.chat(chat_messages, model, **kwargs)
        return response

    finally:
        await client.close()


async def quick_ollama_generate(
    prompt: str,
    model: str = "llama3.1",
    ollama_url: str = "http://localhost:11434",
    **kwargs,
) -> str:
    """Quick generation with Ollama - convenience function"""
    client = OllamaAPIClient({"url": ollama_url})

    try:
        response = await client.generate(prompt, model, **kwargs)
        return response

    finally:
        await client.close()
