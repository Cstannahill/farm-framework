# packages/core/src/ai/ollama/model_manager.py
import asyncio
import httpx
import json
from typing import Dict, List, Optional, Callable, AsyncIterator
from datetime import datetime


class OllamaModelManager:
    """Manages Ollama model lifecycle: download, cache, load, and unload"""

    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.base_url = self.config.get("url", "http://localhost:11434")
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(300.0),  # 5 minutes for model operations
        )

        # Model cache and state
        self.loaded_models = {}
        self.model_cache = {}
        self.pull_progress = {}

    async def list_models(self) -> List[Dict]:
        """List all available models"""
        try:
            response = await self.client.get("/api/tags")
            response.raise_for_status()

            data = response.json()
            models = data.get("models", [])

            # Cache model information
            for model in models:
                self.model_cache[model["name"]] = {
                    "name": model["name"],
                    "size": model.get("size", 0),
                    "digest": model.get("digest", ""),
                    "modified_at": model.get("modified_at", ""),
                    "cached_at": datetime.now().isoformat(),
                }

            return models

        except Exception as e:
            print(f"❌ Failed to list models: {e}")
            return []

    async def has_model(self, model_name: str) -> bool:
        """Check if a model is available locally"""
        try:
            models = await self.list_models()
            return any(model["name"] == model_name for model in models)
        except:
            return False

    async def pull_model(self, model_name: str) -> bool:
        """Pull a model without progress tracking"""
        try:
            response = await self.client.post(
                "/api/pull", json={"name": model_name, "stream": False}
            )
            response.raise_for_status()

            result = response.json()
            return (
                result.get("status") == "success"
                or "successfully" in result.get("status", "").lower()
            )

        except Exception as e:
            print(f"❌ Failed to pull model {model_name}: {e}")
            return False

    async def pull_model_with_progress(
        self, model_name: str, progress_callback: Optional[Callable] = None
    ) -> bool:
        """Pull a model with real-time progress tracking"""
        try:
            self.pull_progress[model_name] = {
                "status": "starting",
                "progress": 0,
                "total": 0,
                "completed": 0,
            }

            if progress_callback:
                progress_callback(self.pull_progress[model_name])

            async with self.client.stream(
                "POST", "/api/pull", json={"name": model_name, "stream": True}
            ) as response:

                response.raise_for_status()

                async for chunk in response.aiter_lines():
                    if chunk:
                        try:
                            data = json.loads(chunk)
                            await self._process_pull_progress(
                                model_name, data, progress_callback
                            )

                            # Check if completed
                            if (
                                data.get("status") == "success"
                                or "successfully" in data.get("status", "").lower()
                            ):
                                self.pull_progress[model_name]["status"] = "complete"
                                if progress_callback:
                                    progress_callback(self.pull_progress[model_name])
                                return True

                        except json.JSONDecodeError:
                            continue

            return False

        except Exception as e:
            self.pull_progress[model_name] = {"status": "error", "error": str(e)}
            if progress_callback:
                progress_callback(self.pull_progress[model_name])
            return False

    async def _process_pull_progress(
        self, model_name: str, data: Dict, progress_callback: Optional[Callable]
    ):
        """Process pull progress data"""
        status = data.get("status", "")

        # Update progress tracking
        progress_info = self.pull_progress[model_name]
        progress_info["status"] = status

        # Handle different progress types
        if "total" in data and "completed" in data:
            progress_info["total"] = data["total"]
            progress_info["completed"] = data["completed"]

            if data["total"] > 0:
                progress_info["progress"] = (data["completed"] / data["total"]) * 100

        # Handle digest information
        if "digest" in data:
            progress_info["digest"] = data["digest"]

        # Call progress callback
        if progress_callback:
            progress_callback(progress_info)

    async def remove_model(self, model_name: str) -> bool:
        """Remove a model from local storage"""
        try:
            response = await self.client.request(
                "DELETE", "/api/delete", json={"name": model_name}
            )
            response.raise_for_status()

            # Remove from cache
            if model_name in self.model_cache:
                del self.model_cache[model_name]

            if model_name in self.loaded_models:
                del self.loaded_models[model_name]

            return True

        except Exception as e:
            print(f"❌ Failed to remove model {model_name}: {e}")
            return False

    async def load_model(self, model_name: str) -> bool:
        """Load a model into memory (if not already loaded)"""
        try:
            # Check if model exists
            if not await self.has_model(model_name):
                print(f"⚠️ Model {model_name} not found locally")
                return False

            # Test model loading with a simple request
            response = await self.client.post(
                "/api/generate",
                json={
                    "model": model_name,
                    "prompt": "test",
                    "stream": False,
                    "options": {"num_predict": 1},
                },
            )

            if response.status_code == 200:
                self.loaded_models[model_name] = {
                    "loaded_at": datetime.now().isoformat(),
                    "status": "ready",
                }
                return True
            else:
                return False

        except Exception as e:
            print(f"❌ Failed to load model {model_name}: {e}")
            return False

    async def generate_test_response(
        self, model_name: str, prompt: str = "Hello"
    ) -> Optional[str]:
        """Generate a test response to verify model is working"""
        try:
            response = await self.client.post(
                "/api/generate",
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": 10, "temperature": 0.1},
                },
            )

            if response.status_code == 200:
                result = response.json()
                return result.get("response", "")
            else:
                return None

        except Exception as e:
            print(f"❌ Test generation failed for {model_name}: {e}")
            return None

    async def get_model_info(self, model_name: str) -> Optional[Dict]:
        """Get detailed information about a specific model"""
        try:
            # Check cache first
            if model_name in self.model_cache:
                cached_info = self.model_cache[model_name].copy()

                # Add loading status
                if model_name in self.loaded_models:
                    cached_info["loaded"] = True
                    cached_info["loaded_at"] = self.loaded_models[model_name][
                        "loaded_at"
                    ]
                else:
                    cached_info["loaded"] = False

                return cached_info

            # Fetch from API
            models = await self.list_models()
            for model in models:
                if model["name"] == model_name:
                    return model

            return None

        except Exception as e:
            print(f"❌ Failed to get model info for {model_name}: {e}")
            return None

    async def get_model_size_formatted(self, model_name: str) -> str:
        """Get human-readable model size"""
        info = await self.get_model_info(model_name)
        if not info or "size" not in info:
            return "Unknown size"

        size_bytes = info["size"]

        # Convert to human-readable format
        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0

        return f"{size_bytes:.1f} PB"

    async def check_model_health(self, model_name: str) -> Dict:
        """Comprehensive model health check"""
        health_status = {
            "model": model_name,
            "exists": False,
            "loaded": False,
            "responsive": False,
            "size": "unknown",
            "last_modified": "unknown",
            "test_response": None,
            "errors": [],
        }

        try:
            # Check if model exists
            if await self.has_model(model_name):
                health_status["exists"] = True

                # Get model info
                info = await self.get_model_info(model_name)
                if info:
                    health_status["size"] = await self.get_model_size_formatted(
                        model_name
                    )
                    health_status["last_modified"] = info.get("modified_at", "unknown")

                # Test responsiveness
                test_response = await self.generate_test_response(model_name, "Hi")
                if test_response:
                    health_status["responsive"] = True
                    health_status["loaded"] = True
                    health_status["test_response"] = test_response
                else:
                    health_status["errors"].append(
                        "Model not responding to test prompt"
                    )
            else:
                health_status["errors"].append("Model not found locally")

        except Exception as e:
            health_status["errors"].append(f"Health check failed: {str(e)}")

        return health_status

    async def auto_pull_missing_models(self, required_models: List[str]) -> Dict:
        """Auto-pull any missing models from required list"""
        results = {
            "required": required_models,
            "already_available": [],
            "successfully_pulled": [],
            "failed_to_pull": [],
            "errors": {},
        }

        for model_name in required_models:
            try:
                if await self.has_model(model_name):
                    results["already_available"].append(model_name)
                    continue

                print(f"📥 Auto-pulling missing model: {model_name}")
                success = await self.pull_model_with_progress(model_name)

                if success:
                    results["successfully_pulled"].append(model_name)
                else:
                    results["failed_to_pull"].append(model_name)

            except Exception as e:
                results["failed_to_pull"].append(model_name)
                results["errors"][model_name] = str(e)

        return results

    async def cleanup_old_models(
        self, keep_models: List[str], max_age_days: int = 30
    ) -> Dict:
        """Clean up old models not in keep list"""
        # This would implement model cleanup logic
        # For now, return empty result to avoid accidental deletions
        return {"cleaned": [], "kept": keep_models, "errors": []}

    def get_pull_progress(self, model_name: str) -> Optional[Dict]:
        """Get current pull progress for a model"""
        return self.pull_progress.get(model_name)

    async def close(self):
        """Clean up resources"""
        await self.client.aclose()


# Convenience functions for common operations
async def quick_model_check(
    model_name: str, ollama_url: str = "http://localhost:11434"
) -> bool:
    """Quick check if a model is available and responsive"""
    manager = OllamaModelManager({"url": ollama_url})
    try:
        health = await manager.check_model_health(model_name)
        return health["exists"] and health["responsive"]
    finally:
        await manager.close()


async def ensure_models_available(
    required_models: List[str],
    ollama_url: str = "http://localhost:11434",
    progress_callback: Optional[Callable] = None,
) -> bool:
    """Ensure all required models are available, pull if missing"""
    manager = OllamaModelManager({"url": ollama_url})
    try:
        results = await manager.auto_pull_missing_models(required_models)

        if progress_callback:
            progress_callback(results)

        # Return True if all models are now available
        total_required = len(required_models)
        total_available = len(results["already_available"]) + len(
            results["successfully_pulled"]
        )

        return total_available == total_required

    finally:
        await manager.close()
