# packages/core/src/ai/ollama/gpu_manager.py
import subprocess
import platform
import re
import psutil
from typing import Dict, List, Optional, Tuple, Any

# Handle Docker imports with fallback for environments without Docker
DOCKER_AVAILABLE = False
docker = None
DockerException = Exception

try:
    import docker  # type: ignore[import-untyped]

    DOCKER_AVAILABLE = True
    DockerException = getattr(docker, "errors", type("MockErrors", (), {})).DockerException  # type: ignore
except ImportError:
    pass


class GPUDetector:
    """Detects available GPU hardware and configures Ollama accordingly"""

    def __init__(self):
        self.system = platform.system().lower()
        self.gpu_info = {}
        self.docker_gpu_support = False

    def detect_all_gpus(self) -> Dict:
        """Comprehensive GPU detection across different vendors"""
        gpu_info = {
            "nvidia": self.detect_nvidia_gpu(),
            "amd": self.detect_amd_gpu(),
            "intel": self.detect_intel_gpu(),
            "apple_silicon": self.detect_apple_silicon(),
            "docker_gpu_support": self.check_docker_gpu_support(),
            "recommended_config": {},
        }

        # Determine recommended configuration
        gpu_info["recommended_config"] = self._get_recommended_config(gpu_info)

        return gpu_info

    def detect_nvidia_gpu(self) -> Dict:
        """Detect NVIDIA GPUs using nvidia-smi"""
        try:
            result = subprocess.run(
                [
                    "nvidia-smi",
                    "--query-gpu=name,memory.total,driver_version,cuda_version",
                    "--format=csv,noheader,nounits",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode == 0:
                gpus = []
                for line in result.stdout.strip().split("\n"):
                    if line.strip():
                        parts = [p.strip() for p in line.split(",")]
                        if len(parts) >= 2:
                            gpus.append(
                                {
                                    "name": parts[0],
                                    "memory_mb": (
                                        int(parts[1]) if parts[1].isdigit() else 0
                                    ),
                                    "driver_version": (
                                        parts[2] if len(parts) > 2 else "unknown"
                                    ),
                                    "cuda_version": (
                                        parts[3] if len(parts) > 3 else "unknown"
                                    ),
                                }
                            )

                return {
                    "available": True,
                    "count": len(gpus),
                    "gpus": gpus,
                    "driver_available": True,
                    "docker_runtime": self._check_nvidia_docker_runtime(),
                }

        except (
            subprocess.TimeoutExpired,
            subprocess.CalledProcessError,
            FileNotFoundError,
        ):
            pass

        return {
            "available": False,
            "count": 0,
            "gpus": [],
            "driver_available": False,
            "docker_runtime": False,
        }

    def detect_amd_gpu(self) -> Dict:
        """Detect AMD GPUs using rocm-smi or lspci"""
        # Try ROCm first
        try:
            result = subprocess.run(
                ["rocm-smi", "--showproductname", "--showmeminfo", "vram"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode == 0:
                # Parse ROCm output
                gpus = self._parse_rocm_output(result.stdout)
                if gpus:
                    return {
                        "available": True,
                        "count": len(gpus),
                        "gpus": gpus,
                        "rocm_available": True,
                        "docker_runtime": self._check_rocm_docker_support(),
                    }

        except (
            subprocess.TimeoutExpired,
            subprocess.CalledProcessError,
            FileNotFoundError,
        ):
            pass

        # Fallback to lspci for basic detection
        amd_gpus = self._detect_amd_via_lspci()

        return {
            "available": len(amd_gpus) > 0,
            "count": len(amd_gpus),
            "gpus": amd_gpus,
            "rocm_available": False,
            "docker_runtime": False,
        }

    def detect_intel_gpu(self) -> Dict:
        """Detect Intel GPUs"""
        intel_gpus = []

        if self.system == "linux":
            intel_gpus = self._detect_intel_via_lspci()
        elif self.system == "windows":
            intel_gpus = self._detect_intel_via_wmi()

        return {
            "available": len(intel_gpus) > 0,
            "count": len(intel_gpus),
            "gpus": intel_gpus,
            "opencl_available": self._check_intel_opencl(),
        }

    def detect_apple_silicon(self) -> Dict:
        """Detect Apple Silicon GPUs (M1, M2, M3, etc.)"""
        if self.system != "darwin":
            return {"available": False, "type": None}

        try:
            # Check system info for Apple Silicon
            result = subprocess.run(
                ["sysctl", "-n", "machdep.cpu.brand_string"],
                capture_output=True,
                text=True,
                timeout=5,
            )

            if result.returncode == 0:
                cpu_brand = result.stdout.strip()

                # Check for Apple Silicon
                if "Apple" in cpu_brand:
                    # Extract chip type (M1, M2, M3, etc.)
                    m_chip_match = re.search(r"Apple (M\d+)", cpu_brand)
                    chip_type = (
                        m_chip_match.group(1) if m_chip_match else "Apple Silicon"
                    )

                    # Get memory info
                    memory_gb = psutil.virtual_memory().total / (1024**3)

                    return {
                        "available": True,
                        "type": chip_type,
                        "unified_memory_gb": round(memory_gb, 1),
                        "metal_support": True,
                        "ollama_support": True,  # Ollama has good Apple Silicon support
                    }

        except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
            pass

        return {"available": False, "type": None}

    def check_docker_gpu_support(self) -> Dict:
        """Check if Docker supports GPU acceleration"""
        if not DOCKER_AVAILABLE or docker is None:
            return {
                "docker_available": False,
                "nvidia_runtime": False,
                "gpu_devices_available": False,
                "runtimes": [],
            }

        try:
            client = docker.from_env()

            # Check Docker info for runtime support
            info = client.info()
            runtimes = info.get("Runtimes", {})

            nvidia_support = (
                "nvidia" in runtimes or "nvidia-container-runtime" in runtimes
            )

            # Test GPU device availability
            gpu_devices_available = False
            if nvidia_support:
                try:
                    # Try to run a simple GPU test container
                    if DOCKER_AVAILABLE and docker:
                        # Use dict format for device requests (compatible with Docker API)
                        device_requests = [
                            {"Driver": "nvidia", "Count": -1, "Capabilities": [["gpu"]]}
                        ]

                        client.containers.run(
                            "nvidia/cuda:11.8-base-ubuntu20.04",
                            "nvidia-smi",
                            device_requests=device_requests,  # type: ignore[arg-type]
                            remove=True,
                            detach=False,
                        )
                    gpu_devices_available = True
                except:
                    pass

            return {
                "docker_available": True,
                "nvidia_runtime": nvidia_support,
                "gpu_devices_available": gpu_devices_available,
                "runtimes": list(runtimes.keys()),
            }

        except DockerException:
            return {
                "docker_available": False,
                "nvidia_runtime": False,
                "gpu_devices_available": False,
                "runtimes": [],
            }

    def _get_recommended_config(self, gpu_info: Dict) -> Dict:
        """Generate recommended Ollama configuration based on detected hardware"""
        config = {
            "gpu_enabled": False,
            "docker_runtime": None,
            "environment_vars": {},
            "device_requests": [],
            "recommended_models": [],
        }

        # NVIDIA GPU configuration
        if (
            gpu_info["nvidia"]["available"]
            and gpu_info["docker_gpu_support"]["nvidia_runtime"]
        ):
            nvidia_gpus = gpu_info["nvidia"]["gpus"]
            total_vram = sum(gpu.get("memory_mb", 0) for gpu in nvidia_gpus)

            config.update(
                {
                    "gpu_enabled": True,
                    "docker_runtime": "nvidia",
                    "environment_vars": {
                        "NVIDIA_VISIBLE_DEVICES": "all",
                        "OLLAMA_GPU": "nvidia",
                    },
                    "device_requests": [
                        {"Driver": "nvidia", "Count": -1, "Capabilities": [["gpu"]]}
                    ],
                }
            )

            # Recommend models based on VRAM
            config["recommended_models"] = self._recommend_models_for_vram(total_vram)

        # Apple Silicon configuration
        elif gpu_info["apple_silicon"]["available"]:
            config.update(
                {
                    "gpu_enabled": True,
                    "docker_runtime": None,  # Native Ollama on Apple Silicon
                    "environment_vars": {"OLLAMA_GPU": "metal"},
                    "recommended_models": [
                        "llama3.1:8b",  # Works well on Apple Silicon
                        "phi3:3.8b",  # Efficient model
                        "gemma:7b",  # Good performance
                    ],
                }
            )

        # AMD GPU configuration (if ROCm available)
        elif gpu_info["amd"]["available"] and gpu_info["amd"].get("rocm_available"):
            config.update(
                {
                    "gpu_enabled": True,
                    "docker_runtime": None,
                    "environment_vars": {"OLLAMA_GPU": "rocm"},
                    "recommended_models": ["llama3.1:8b", "phi3:3.8b"],
                }
            )

        # CPU-only fallback
        else:
            config.update(
                {
                    "gpu_enabled": False,
                    "recommended_models": [
                        "phi3:3.8b",  # Efficient for CPU
                        "gemma:2b",  # Very lightweight
                        "llama3.1:8b",  # Still usable on modern CPUs
                    ],
                }
            )

        return config

    def _recommend_models_for_vram(self, total_vram_mb: int) -> List[str]:
        """Recommend models based on available VRAM"""
        vram_gb = total_vram_mb / 1024

        if vram_gb >= 24:  # 24GB+ VRAM
            return [
                "llama3.1:70b",  # Large model
                "llama3.1:13b",  # Medium model
                "codestral:22b",  # Code model
                "llama3.1:8b",  # Fast model
            ]
        elif vram_gb >= 12:  # 12-24GB VRAM
            return [
                "llama3.1:13b",  # Medium model
                "codestral:22b",  # Code model
                "llama3.1:8b",  # Standard model
                "phi3:3.8b",  # Efficient model
            ]
        elif vram_gb >= 8:  # 8-12GB VRAM
            return [
                "llama3.1:8b",  # Standard model
                "phi3:3.8b",  # Efficient model
                "gemma:7b",  # Alternative
                "codestral:7b",  # Code model
            ]
        elif vram_gb >= 4:  # 4-8GB VRAM
            return [
                "phi3:3.8b",  # Efficient model
                "gemma:2b",  # Lightweight
                "llama3.1:8b",  # May work with optimization
            ]
        else:  # < 4GB VRAM
            return ["gemma:2b", "phi3:3.8b"]  # Very lightweight  # CPU recommended

    def _parse_rocm_output(self, output: str) -> List[Dict]:
        """Parse ROCm-smi output"""
        gpus = []
        lines = output.strip().split("\n")

        for line in lines:
            if "GPU" in line and any(
                keyword in line.lower() for keyword in ["radeon", "rx", "vega", "navi"]
            ):
                # Simple parsing - this would need refinement for production
                gpus.append(
                    {
                        "name": line.strip(),
                        "vendor": "AMD",
                        "memory_mb": 0,  # Would need additional parsing
                    }
                )

        return gpus

    def _detect_amd_via_lspci(self) -> List[Dict]:
        """Detect AMD GPUs via lspci"""
        gpus = []

        try:
            result = subprocess.run(
                ["lspci", "-nn"], capture_output=True, text=True, timeout=10
            )

            if result.returncode == 0:
                for line in result.stdout.split("\n"):
                    if "VGA" in line and any(
                        keyword in line.lower() for keyword in ["amd", "ati", "radeon"]
                    ):
                        gpus.append(
                            {"name": line.strip(), "vendor": "AMD", "memory_mb": 0}
                        )

        except (
            subprocess.TimeoutExpired,
            subprocess.CalledProcessError,
            FileNotFoundError,
        ):
            pass

        return gpus

    def _detect_intel_via_lspci(self) -> List[Dict]:
        """Detect Intel GPUs via lspci"""
        gpus = []

        try:
            result = subprocess.run(
                ["lspci", "-nn"], capture_output=True, text=True, timeout=10
            )

            if result.returncode == 0:
                for line in result.stdout.split("\n"):
                    if "VGA" in line and "intel" in line.lower():
                        gpus.append(
                            {"name": line.strip(), "vendor": "Intel", "memory_mb": 0}
                        )

        except (
            subprocess.TimeoutExpired,
            subprocess.CalledProcessError,
            FileNotFoundError,
        ):
            pass

        return gpus

    def _detect_intel_via_wmi(self) -> List[Dict]:
        """Detect Intel GPUs on Windows via WMI"""
        # This would use wmi library on Windows
        # Placeholder implementation
        return []

    def _check_nvidia_docker_runtime(self) -> bool:
        """Check if NVIDIA Docker runtime is available"""
        if not DOCKER_AVAILABLE or docker is None:
            return False

        try:
            client = docker.from_env()
            info = client.info()
            runtimes = info.get("Runtimes", {})
            return "nvidia" in runtimes or "nvidia-container-runtime" in runtimes
        except:
            return False

    def _check_rocm_docker_support(self) -> bool:
        """Check if ROCm Docker support is available"""
        # This would check for ROCm Docker capabilities
        # Placeholder implementation
        return False

    def _check_intel_opencl(self) -> bool:
        """Check if Intel OpenCL is available"""
        try:
            result = subprocess.run(
                ["clinfo"], capture_output=True, text=True, timeout=10
            )
            return result.returncode == 0 and "intel" in result.stdout.lower()
        except:
            return False


class OllamaGPUConfigurator:
    """Configures Ollama based on detected GPU hardware"""

    def __init__(self):
        self.detector = GPUDetector()
        self.gpu_info = None

    def auto_configure(self) -> Dict:
        """Auto-configure Ollama based on detected hardware"""
        print("🔍 Detecting GPU hardware...")

        self.gpu_info = self.detector.detect_all_gpus()
        config = self.gpu_info["recommended_config"]

        # Print detection results
        self._print_detection_summary()

        return {
            "docker_config": self._build_docker_config(config),
            "environment_vars": config["environment_vars"],
            "recommended_models": config["recommended_models"],
            "gpu_info": self.gpu_info,
        }

    def _build_docker_config(self, config: Dict) -> Dict:
        """Build Docker container configuration"""
        docker_config = {
            "image": "ollama/ollama",
            "ports": {"11434/tcp": 11434},
            "volumes": {"farm-ollama-models": {"bind": "/root/.ollama", "mode": "rw"}},
            "environment": {
                "OLLAMA_HOST": "0.0.0.0",
                "OLLAMA_PORT": "11434",
                **config["environment_vars"],
            },
        }

        # Add GPU support if available
        if config["gpu_enabled"] and config["device_requests"]:
            docker_config["device_requests"] = config["device_requests"]

        return docker_config

    def _print_detection_summary(self):
        """Print GPU detection summary"""
        if not self.gpu_info:
            print("❌ GPU detection failed")
            return

        print("\n🎮 GPU Detection Summary:")
        print("=" * 40)

        # NVIDIA
        nvidia = self.gpu_info.get("nvidia", {})
        if nvidia.get("available", False):
            print(f"✅ NVIDIA: {nvidia.get('count', 0)} GPU(s) detected")
            for gpu in nvidia.get("gpus", []):
                vram_gb = (
                    gpu.get("memory_mb", 0) / 1024 if gpu.get("memory_mb", 0) > 0 else 0
                )
                print(f"   • {gpu.get('name', 'Unknown')} ({vram_gb:.1f}GB VRAM)")
            print(
                f"   • Docker Support: {'Yes' if nvidia.get('docker_runtime', False) else 'No'}"
            )
        else:
            print("❌ NVIDIA: Not detected")

        # Apple Silicon
        apple = self.gpu_info.get("apple_silicon", {})
        if apple.get("available", False):
            print(f"✅ Apple Silicon: {apple.get('type', 'Unknown')} detected")
            print(f"   • Unified Memory: {apple.get('unified_memory_gb', 0):.1f}GB")
            print(
                f"   • Metal Support: {'Yes' if apple.get('metal_support', False) else 'No'}"
            )
        else:
            print("❌ Apple Silicon: Not detected")

        # AMD
        amd = self.gpu_info.get("amd", {})
        if amd.get("available", False):
            print(f"✅ AMD: {amd.get('count', 0)} GPU(s) detected")
            print(
                f"   • ROCm Support: {'Yes' if amd.get('rocm_available', False) else 'No'}"
            )
        else:
            print("❌ AMD: Not detected")

        # Configuration recommendation
        config = self.gpu_info.get("recommended_config", {})
        print(f"\n🚀 Recommended Configuration:")
        print(
            f"   • GPU Acceleration: {'Enabled' if config.get('gpu_enabled', False) else 'Disabled (CPU-only)'}"
        )

        if config.get("recommended_models"):
            print(f"   • Recommended Models:")
            for model in config["recommended_models"][:3]:  # Show top 3
                print(f"     - {model}")

        print()


# Utility function for easy GPU detection
def detect_and_configure_gpu() -> Dict:
    """Simple function to detect GPU and return Ollama configuration"""
    configurator = OllamaGPUConfigurator()
    return configurator.auto_configure()


def get_gpu_memory_info() -> Dict:
    """Get detailed GPU memory information"""
    detector = GPUDetector()
    gpu_info = detector.detect_all_gpus()

    memory_info = {"total_vram_mb": 0, "total_vram_gb": 0, "gpus": []}

    # Collect NVIDIA GPU memory
    for gpu in gpu_info["nvidia"]["gpus"]:
        vram_mb = gpu.get("memory_mb", 0)
        memory_info["total_vram_mb"] += vram_mb
        memory_info["gpus"].append(
            {"name": gpu["name"], "vendor": "NVIDIA", "memory_mb": vram_mb}
        )

    # Add Apple Silicon unified memory
    if gpu_info["apple_silicon"]["available"]:
        unified_memory_gb = gpu_info["apple_silicon"].get("unified_memory_gb", 0)
        unified_memory_mb = int(unified_memory_gb * 1024)
        memory_info["total_vram_mb"] += unified_memory_mb
        memory_info["gpus"].append(
            {
                "name": gpu_info["apple_silicon"]["type"],
                "vendor": "Apple",
                "memory_mb": unified_memory_mb,
            }
        )

    memory_info["total_vram_gb"] = memory_info["total_vram_mb"] / 1024

    return memory_info
