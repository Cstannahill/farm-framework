# packages/core/src/ai/ollama/orchestration.py
import asyncio
from typing import Dict, List, Optional, Callable, Any
from .docker_manager import OllamaDockerManager
from .model_manager import OllamaModelManager
from ..config import AIConfig


class OllamaOrchestrationService:
    """Orchestrates Ollama service lifecycle within FARM development server"""

    def __init__(self, config: AIConfig, event_callback: Optional[Callable] = None):
        self.config = config
        self.event_callback = event_callback or self._default_event_callback

        # Initialize managers
        self.docker_manager = OllamaDockerManager(config.ollama)
        self.model_manager = OllamaModelManager(config.ollama)

        # Service state
        self.is_running = False
        self.startup_complete = False
        self.auto_pull_complete = False

    async def start_service(self) -> bool:
        """Start Ollama service with full orchestration"""
        try:
            self.emit_event(
                "ollama_startup_begin",
                {
                    "auto_start": self.config.ollama.get("autoStart", True),
                    "auto_pull": self.config.ollama.get("autoPull", []),
                },
            )

            # Phase 1: Start Docker container
            if not await self.start_docker_service():
                return False

            # Phase 2: Auto-pull configured models
            if not await self.auto_pull_models():
                # Non-blocking failure - service can still run
                self.emit_event("ollama_auto_pull_failed", {})

            # Phase 3: Verify service readiness
            if not await self.verify_service_ready():
                return False

            self.is_running = True
            self.startup_complete = True

            self.emit_event(
                "ollama_startup_complete",
                {
                    "port": self.docker_manager.port,
                    "models_pulled": self.auto_pull_complete,
                },
            )

            return True

        except Exception as e:
            self.emit_event("ollama_startup_error", {"error": str(e)})
            return False

    async def start_docker_service(self) -> bool:
        """Start Docker container phase"""
        self.emit_event("ollama_docker_starting", {})

        success = await self.docker_manager.start_service()

        if success:
            self.emit_event(
                "ollama_docker_ready",
                {
                    "port": self.docker_manager.port,
                    "gpu_enabled": self.docker_manager.gpu_enabled,
                },
            )
        else:
            self.emit_event("ollama_docker_failed", {})

        return success

    async def auto_pull_models(self) -> bool:
        """Auto-pull configured models"""
        auto_pull_models = self.config.ollama.get("autoPull", [])

        if not auto_pull_models:
            self.auto_pull_complete = True
            return True

        self.emit_event("ollama_models_pulling_start", {"models": auto_pull_models})

        try:
            success_count = 0

            for model_name in auto_pull_models:
                self.emit_event("ollama_model_pull_start", {"model": model_name})

                try:
                    # Check if model already exists
                    if await self.model_manager.has_model(model_name):
                        self.emit_event(
                            "ollama_model_already_exists", {"model": model_name}
                        )
                        success_count += 1
                        continue

                    # Pull the model
                    success = await self.model_manager.pull_model_with_progress(
                        model_name,
                        progress_callback=lambda progress: self.emit_event(
                            "ollama_model_pull_progress",
                            {"model": model_name, "progress": progress},
                        ),
                    )

                    if success:
                        self.emit_event(
                            "ollama_model_pull_success", {"model": model_name}
                        )
                        success_count += 1
                    else:
                        self.emit_event(
                            "ollama_model_pull_failed", {"model": model_name}
                        )

                except Exception as e:
                    self.emit_event(
                        "ollama_model_pull_error",
                        {"model": model_name, "error": str(e)},
                    )

            self.auto_pull_complete = success_count > 0

            self.emit_event(
                "ollama_models_pulling_complete",
                {
                    "total": len(auto_pull_models),
                    "successful": success_count,
                    "failed": len(auto_pull_models) - success_count,
                },
            )

            return success_count == len(auto_pull_models)

        except Exception as e:
            self.emit_event("ollama_models_pulling_error", {"error": str(e)})
            return False

    async def verify_service_ready(self) -> bool:
        """Verify service is fully ready for use"""
        try:
            # Test basic connectivity
            if not await self.docker_manager.verify_health():
                return False

            # Test model listing (validates API is working)
            models = await self.model_manager.list_models()

            self.emit_event(
                "ollama_service_verified",
                {
                    "available_models": len(models),
                    "models": [m.get("name", "unknown") for m in models],
                },
            )

            return True

        except Exception as e:
            self.emit_event("ollama_verification_error", {"error": str(e)})
            return False

    async def stop_service(self):
        """Stop Ollama service gracefully"""
        if not self.is_running:
            return

        self.emit_event("ollama_shutdown_start", {})

        try:
            await self.docker_manager.stop_service()
            self.is_running = False
            self.startup_complete = False
            self.auto_pull_complete = False

            self.emit_event("ollama_shutdown_complete", {})

        except Exception as e:
            self.emit_event("ollama_shutdown_error", {"error": str(e)})

    async def restart_service(self) -> bool:
        """Restart Ollama service"""
        self.emit_event("ollama_restart_start", {})

        await self.stop_service()
        success = await self.start_service()

        if success:
            self.emit_event("ollama_restart_complete", {})
        else:
            self.emit_event("ollama_restart_failed", {})

        return success

    async def get_service_status(self) -> Dict:
        """Get comprehensive service status"""
        docker_status = self.docker_manager.get_service_status()

        models = []
        if self.is_running:
            try:
                models = await self.model_manager.list_models()
            except:
                pass

        return {
            **docker_status,
            "is_running": self.is_running,
            "startup_complete": self.startup_complete,
            "auto_pull_complete": self.auto_pull_complete,
            "available_models": len(models),
            "models": models,
        }

    async def handle_config_change(self, new_config: Dict):
        """Handle configuration changes during development"""
        old_auto_pull = set(self.config.ollama.get("autoPull", []))
        new_auto_pull = set(new_config.get("autoPull", []))

        # Update config
        self.config.update_ollama(new_config)

        # Check for new models to pull
        new_models = new_auto_pull - old_auto_pull
        if new_models:
            self.emit_event("ollama_config_new_models", {"models": list(new_models)})

            for model_name in new_models:
                try:
                    if not await self.model_manager.has_model(model_name):
                        self.emit_event(
                            "ollama_model_pull_start", {"model": model_name}
                        )
                        success = await self.model_manager.pull_model_with_progress(
                            model_name
                        )

                        if success:
                            self.emit_event(
                                "ollama_model_pull_success", {"model": model_name}
                            )
                        else:
                            self.emit_event(
                                "ollama_model_pull_failed", {"model": model_name}
                            )

                except Exception as e:
                    self.emit_event(
                        "ollama_model_pull_error",
                        {"model": model_name, "error": str(e)},
                    )

    def emit_event(self, event_type: str, data: Optional[Dict[str, Any]] = None):
        """Emit orchestration event"""
        if self.event_callback:
            self.event_callback(event_type, data or {})

    def _default_event_callback(self, event_type: str, data: Dict):
        """Default event callback that prints to console"""
        if event_type == "ollama_startup_begin":
            print("🤖 Starting Ollama AI service...")

        elif event_type == "ollama_docker_starting":
            print("🐳 Starting Ollama Docker container...")

        elif event_type == "ollama_docker_ready":
            gpu_msg = " (GPU enabled)" if data.get("gpu_enabled") else " (CPU only)"
            print(f"✅ Ollama container ready on port {data.get('port')}{gpu_msg}")

        elif event_type == "ollama_models_pulling_start":
            models = ", ".join(data.get("models", []))
            print(f"📥 Auto-pulling Ollama models: {models}")

        elif event_type == "ollama_model_pull_start":
            print(f"📥 Pulling model: {data.get('model')}")

        elif event_type == "ollama_model_already_exists":
            print(f"✅ Model already available: {data.get('model')}")

        elif event_type == "ollama_model_pull_progress":
            # Progress updates can be verbose, so only show major milestones
            progress = data.get("progress", {})
            if progress.get("status") in ["downloading", "extracting", "complete"]:
                print(f"📦 {data.get('model')}: {progress.get('status')}")

        elif event_type == "ollama_model_pull_success":
            print(f"✅ Successfully pulled: {data.get('model')}")

        elif event_type == "ollama_model_pull_failed":
            print(f"❌ Failed to pull: {data.get('model')}")

        elif event_type == "ollama_startup_complete":
            print("🚀 Ollama AI service ready!")
            print(f"   📡 API: http://localhost:{data.get('port')}")
            if data.get("models_pulled"):
                print("   📚 Models ready for inference")

        elif event_type == "ollama_startup_error":
            print(f"❌ Ollama startup failed: {data.get('error')}")

        elif event_type.endswith("_error") or event_type.endswith("_failed"):
            print(f"⚠️ Ollama {event_type}: {data.get('error', 'Unknown error')}")


# Integration with FARM dev server
class OllamaDevServerIntegration:
    """Integration layer for FARM development server"""

    def __init__(self, farm_config: Dict):
        self.farm_config = farm_config
        self.ai_config = farm_config.get("ai", {})
        self.orchestration = None

    def should_start_ollama(self) -> bool:
        """Determine if Ollama should be started"""
        ollama_config = self.ai_config.get("providers", {}).get("ollama", {})

        # Check if Ollama is enabled
        if not ollama_config.get("enabled", False):
            return False

        # Check if auto-start is enabled
        if not ollama_config.get("autoStart", True):
            return False

        # Check if AI features are enabled
        features = self.farm_config.get("features", [])
        if "ai" not in features:
            return False

        return True

    async def start_if_needed(self) -> bool:
        """Start Ollama if configuration requires it"""
        if not self.should_start_ollama():
            print("⏭️ Ollama auto-start disabled, skipping...")
            return True

        # Create orchestration service
        ollama_config_dict = self.ai_config.get("providers", {}).get("ollama", {})
        ai_config = AIConfig()
        ai_config.update_ollama(ollama_config_dict)

        self.orchestration = OllamaOrchestrationService(
            config=ai_config,
            event_callback=self._handle_event,
        )

        return await self.orchestration.start_service()

    async def stop_if_running(self):
        """Stop Ollama if it's running"""
        if self.orchestration:
            await self.orchestration.stop_service()

    async def handle_config_change(self, new_config: Dict):
        """Handle farm.config.ts changes"""
        if self.orchestration:
            ollama_config = (
                new_config.get("ai", {}).get("providers", {}).get("ollama", {})
            )
            await self.orchestration.handle_config_change(ollama_config)

    def _handle_event(self, event_type: str, data: Dict):
        """Handle Ollama orchestration events for dev server"""
        # This can be extended to integrate with dev server logging/UI
        pass
