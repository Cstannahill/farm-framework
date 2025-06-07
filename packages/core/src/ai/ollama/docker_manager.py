# packages/core/src/ai/ollama/docker_manager.py
import asyncio
import httpx
import json
from typing import Any, Dict, List, Optional, Union

# Handle Docker imports with fallback for environments without Docker
DOCKER_AVAILABLE = False
docker: Any = None  # type: ignore
# Use Any for container client and exceptions when Docker unavailable
Container: Any = None
ContainerError = Exception
ImageNotFound = Exception
APIError = Exception

try:
    import docker  # type: ignore[import,import-untyped]

    # docker client types
    from docker.models.containers import Container as _Container  # type: ignore[import]

    Container = _Container
    from docker.errors import ContainerError, ImageNotFound, APIError  # type: ignore[import]

    DOCKER_AVAILABLE = True
except ImportError:
    pass


class OllamaDockerManager:
    """Manages Ollama Docker container lifecycle and configuration"""

    def __init__(self, config: Optional[Dict] = None):
        """Manages Ollama Docker container lifecycle and configuration"""

        self.config: Dict = config or {}
        # Safe docker client initialization
        self.client: Any = None
        if DOCKER_AVAILABLE and docker:
            # type: ignore[attr-defined]
            self.client = docker.from_env()

        self.container_name = "farm-ollama"
        self.image_name = "ollama/ollama"
        self.port = self.config.get("port", 11434)
        self.gpu_enabled = self.config.get("gpu", True)
        self.volume_name = "farm-ollama-models"

    async def start_service(self) -> bool:
        """Start Ollama service with proper configuration"""
        try:
            # Check if container already exists
            existing_container = self.get_existing_container()
            if existing_container:
                if existing_container.status == "running":
                    print(f"✅ Ollama container already running on port {self.port}")
                    return await self.verify_health()
                else:
                    print("🔄 Starting existing Ollama container...")
                    existing_container.start()
                    return await self.wait_for_healthy()

            # Pull latest image if not exists
            await self.ensure_image_available()

            # Create and start new container
            return await self.create_and_start_container()

        except Exception as e:
            print(f"❌ Failed to start Ollama service: {e}")
            return False

    def get_existing_container(self) -> Optional[Any]:
        """Get existing Ollama container if it exists"""
        # Return existing container if Docker client available
        if not self.client:
            return None
        try:
            return self.client.containers.get(self.container_name)  # type: ignore[attr-defined]
        except Exception:
            return None

    async def ensure_image_available(self):
        """Ensure Ollama Docker image is available"""
        if not self.client:
            return
        try:
            # type: ignore[attr-defined]
            self.client.images.get(self.image_name)
            print(f"✅ Ollama image {self.image_name} already available")
        except ImageNotFound:
            print(f"📥 Pulling Ollama image {self.image_name}...")
            # type: ignore[attr-defined]
            self.client.images.pull(self.image_name)
            print(f"✅ Successfully pulled {self.image_name}")

    async def create_and_start_container(self) -> bool:
        """Create and start new Ollama container"""
        if not self.client:
            return False
        try:
            # Ensure volume exists
            self.ensure_volume_exists()

            # Prepare container configuration
            container_config = self.get_container_config()

            print(f"🚀 Starting Ollama container on port {self.port}...")

            # Create and start container
            container = self.client.containers.run(
                **container_config,
                detach=True,
                name=self.container_name,
                remove=False,  # Keep container for reuse
            )

            # Wait for container to be healthy
            return await self.wait_for_healthy()

        except Exception as e:
            print(f"❌ Failed to create Ollama container: {e}")
            return False

    def ensure_volume_exists(self):
        """Ensure Docker volume for model storage exists"""
        if not self.client:
            return
        try:
            # type: ignore[attr-defined]
            self.client.volumes.get(self.volume_name)
        except Exception:
            print(f"📁 Creating Docker volume: {self.volume_name}")
            # type: ignore[attr-defined]
            self.client.volumes.create(self.volume_name)

    def get_container_config(self) -> Dict:
        """Get Docker container configuration"""
        config = {
            "image": self.image_name,
            "ports": {f"11434/tcp": self.port},
            "volumes": {self.volume_name: {"bind": "/root/.ollama", "mode": "rw"}},
            "environment": {"OLLAMA_HOST": "0.0.0.0", "OLLAMA_PORT": "11434"},
        }

        # Add GPU support if enabled and available
        if self.gpu_enabled and self.is_gpu_available() and DOCKER_AVAILABLE and docker:
            try:
                # Create device request for GPU support
                from docker.types import DeviceRequest  # type: ignore[import]

                device_req = DeviceRequest(count=-1, capabilities=[["gpu"]])
                config["device_requests"] = [device_req]  # type: ignore[attr-defined]
                config["environment"]["OLLAMA_GPU"] = "nvidia"
                print("🎮 GPU support enabled for Ollama")
            except ImportError:
                pass

        return config

    def is_gpu_available(self) -> bool:
        """Check if GPU is available for Docker"""
        if not self.client:
            return False
        try:
            # type: ignore[attr-defined]
            info: Dict = self.client.info()
            runtimes = info.get("Runtimes", {})
            return "nvidia" in runtimes or "nvidia-container-runtime" in runtimes
        except Exception:
            return False

    async def wait_for_healthy(self, timeout: int = 60) -> bool:
        """Wait for Ollama service to be healthy"""
        print("⏳ Waiting for Ollama service to be ready...")

        start_time = asyncio.get_event_loop().time()

        while (asyncio.get_event_loop().time() - start_time) < timeout:
            if await self.verify_health():
                print("✅ Ollama service is ready!")
                return True

            print("⏳ Ollama starting up...")
            await asyncio.sleep(2)

        print(f"❌ Ollama failed to start within {timeout} seconds")
        return False

    async def verify_health(self) -> bool:
        """Verify Ollama service is healthy"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"http://localhost:{self.port}/api/tags")
                return response.status_code == 200
        except:
            return False

    async def stop_service(self):
        """Stop Ollama service"""
        try:
            container = self.get_existing_container()
            if container and container.status == "running":
                print("🛑 Stopping Ollama container...")
                container.stop()
                print("✅ Ollama container stopped")
        except Exception as e:
            print(f"⚠️ Error stopping Ollama: {e}")

    async def restart_service(self) -> bool:
        """Restart Ollama service"""
        await self.stop_service()
        return await self.start_service()

    def get_container_logs(self, lines: int = 50) -> str:
        """Get Ollama container logs"""
        try:
            container = self.get_existing_container()
            if container:
                return container.logs(tail=lines).decode("utf-8")
            return "No container found"
        except Exception as e:
            return f"Error getting logs: {e}"

    def get_service_status(self) -> Dict:
        """Get comprehensive service status"""
        container = self.get_existing_container()

        if not container:
            return {
                "status": "not_found",
                "container_status": None,
                "port": self.port,
                "gpu_enabled": self.gpu_enabled,
            }

        # Narrow container type and return status
        assert container is not None
        return {
            "status": container.status,
            "container_status": container.status,
            "port": self.port,
            "gpu_enabled": self.gpu_enabled,
            "image": container.image.tags[0] if container.image.tags else "unknown",
            "created": container.attrs["Created"],
            "volumes": list(container.attrs.get("Mounts", [])),
        }
