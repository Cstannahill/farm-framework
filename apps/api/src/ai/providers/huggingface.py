# apps/api/src/ai/providers/huggingface.py
import asyncio
import httpx
import torch
from typing import AsyncIterator, List, Dict, Any, Optional, AsyncGenerator
from .base import AIProvider, ChatMessage
import os
import logging
import json

logger = logging.getLogger(__name__)

# Optional imports for local model support
try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from transformers.pipelines import pipeline
    from transformers.generation.streamers import TextStreamer

    TRANSFORMERS_AVAILABLE = True
except ImportError:
    AutoTokenizer = None
    AutoModelForCausalLM = None
    pipeline = None
    TextStreamer = None
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers not available - only cloud inference will work")


class HuggingFaceProvider(AIProvider):
    """HuggingFace provider supporting both local models and cloud inference"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__()
        self._models = {}

        # Configuration
        self.api_token = config.get("token") or os.getenv("HUGGINGFACE_TOKEN")
        self.use_cloud = config.get("useCloud", True)
        self.device = config.get("device", "auto")
        self.model_cache_dir = config.get("cacheDir", "./models/huggingface")

        # Cloud inference configuration
        self.inference_api_url = "https://api-inference.huggingface.co/models"
        self.cloud_timeout = config.get("cloudTimeout", 30)

        # Local model configuration
        if self.device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # Model storage
        self.local_models = {}  # Loaded local models
        self.tokenizers = {}  # Tokenizers for local models
        self.pipelines = {}  # HF pipelines

        # HTTP client for cloud inference
        self.http_client = httpx.AsyncClient(
            headers=(
                {
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json",
                }
                if self.api_token
                else {}
            ),
            timeout=httpx.Timeout(self.cloud_timeout),
        )

        # Available models configuration
        self.available_models = config.get(
            "models",
            [
                "microsoft/DialoGPT-medium",
                "microsoft/DialoGPT-large",
                "facebook/blenderbot-400M-distill",
                "microsoft/CodeBERT-base",
                "sentence-transformers/all-MiniLM-L6-v2",
            ],
        )
        self.default_model = config.get("defaultModel", "microsoft/DialoGPT-medium")
        for m in self.available_models:
            self._models[m] = True

    async def load_model(self, model: str) -> None:
        """Load HuggingFace model (local or prepare for cloud)"""
        # HuggingFace models may require loading for local, but return None for API compatibility
        try:
            if self.use_cloud:
                # For cloud models, we just verify they exist
                await self._verify_cloud_model(model)
            else:
                # Load local model
                await self._load_local_model(model)
        except Exception as e:
            logger.error(f"Failed to load HuggingFace model {model}: {e}")
        return None

    async def _verify_cloud_model(self, model: str) -> bool:
        """Verify cloud model exists and is accessible"""
        try:
            url = f"{self.inference_api_url}/{model}"
            response = await self.http_client.get(url)

            if response.status_code == 200:
                self.models[model] = True
                logger.info(f"✅ HuggingFace cloud model {model} verified")
                return True
            else:
                logger.error(
                    f"❌ HuggingFace cloud model {model} not accessible: {response.status_code}"
                )
                return False

        except Exception as e:
            logger.error(f"❌ Failed to verify cloud model {model}: {e}")
            return False

    async def _load_local_model(self, model: str) -> bool:
        """Load model locally using transformers"""
        if not TRANSFORMERS_AVAILABLE or not (
            AutoTokenizer and AutoModelForCausalLM and pipeline
        ):
            raise RuntimeError(
                "Transformers library not available for local models. Please install 'transformers' and 'torch'."
            )

        try:
            logger.info(f"\U0001f4e5 Loading HuggingFace local model: {model}")

            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(
                model, cache_dir=self.model_cache_dir, token=self.api_token
            )

            # Handle tokenizer without pad token
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            # Load model
            model = AutoModelForCausalLM.from_pretrained(
                model,
                cache_dir=self.model_cache_dir,
                device_map="auto" if self.device == "cuda" else None,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                token=self.api_token,
                low_cpu_mem_usage=True,
            )

            # Create pipeline
            pipe = pipeline(
                "text-generation",
                model=model,
                tokenizer=tokenizer,
                device=0 if self.device == "cuda" else -1,
                return_full_text=False,
            )

            # Store references
            self.local_models[model] = model
            self.tokenizers[model] = tokenizer
            self.pipelines[model] = pipe
            self.models[model] = True

            logger.info(f"\u2705 HuggingFace local model {model} loaded successfully")
            return True

        except Exception as e:
            logger.error(f"\u274c Failed to load local model {model}: {e}")
            return False

    async def generate(self, prompt: str, model: str, **kwargs) -> str:
        """Generate completion using HuggingFace"""
        if self.use_cloud:
            return await self._generate_cloud(prompt, model, **kwargs)
        else:
            return await self._generate_local(prompt, model, **kwargs)

    async def _generate_cloud(self, prompt: str, model: str, **kwargs) -> str:
        """Generate using cloud inference API"""
        try:
            url = f"{self.inference_api_url}/{model}"

            payload = {
                "inputs": prompt,
                "parameters": {
                    "temperature": kwargs.get("temperature", 0.7),
                    "max_length": len(prompt.split()) + kwargs.get("max_tokens", 100),
                    "do_sample": True,
                    "top_p": kwargs.get("top_p", 0.9),
                    "return_full_text": False,
                },
            }

            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()

            result = response.json()

            if isinstance(result, list) and len(result) > 0:
                generated_text = result[0].get("generated_text", "")
                # Remove the original prompt if it's included
                if generated_text.startswith(prompt):
                    generated_text = generated_text[len(prompt) :].strip()
                return generated_text
            else:
                logger.warning(f"Unexpected response format: {result}")
                return ""

        except Exception as e:
            logger.error(f"HuggingFace cloud generation failed: {e}")
            raise

    async def _generate_local(self, prompt: str, model: str, **kwargs) -> str:
        """Generate using local model"""
        if model not in self.pipelines:
            await self.load_model(model)

        if model not in self.pipelines:
            raise ValueError(f"Model {model} not loaded")

        try:
            pipe = self.pipelines[model]

            # Run in thread pool to avoid blocking
            def _generate():
                result = pipe(
                    prompt,
                    max_length=len(prompt.split()) + kwargs.get("max_tokens", 100),
                    temperature=kwargs.get("temperature", 0.7),
                    do_sample=True,
                    top_p=kwargs.get("top_p", 0.9),
                    pad_token_id=pipe.tokenizer.eos_token_id,
                )
                return result[0]["generated_text"] if result else ""

            loop = asyncio.get_event_loop()
            generated_text = await loop.run_in_executor(None, _generate)

            return generated_text.strip()

        except Exception as e:
            logger.error(f"Local generation failed: {e}")
            raise

    async def generate_stream(
        self, prompt: str, model: str, **kwargs
    ) -> AsyncIterator[str]:
        """Stream generation (local models only for now)"""
        if self.use_cloud:
            # Cloud streaming not implemented yet, fallback to non-streaming
            result = await self._generate_cloud(prompt, model, **kwargs)
            yield result
            return

        if not TRANSFORMERS_AVAILABLE or not (torch and pipeline):
            raise RuntimeError(
                "Transformers and torch are required for local streaming generation."
            )

        if model not in self.pipelines:
            await self.load_model(model)

        if model not in self.pipelines:
            raise ValueError(f"Model {model} not loaded")

        try:
            pipe = self.pipelines[model]
            tokenizer = self.tokenizers[model]

            # Encode prompt
            inputs = tokenizer.encode(prompt, return_tensors="pt")

            def _stream_generate():
                local_inputs = inputs  # ensure local scope
                with torch.no_grad():
                    for _ in range(kwargs.get("max_tokens", 100)):
                        outputs = pipe.model(local_inputs)
                        logits = outputs.logits[0, -1, :]
                        if kwargs.get("temperature", 0.7) != 1.0:
                            logits = logits / kwargs.get("temperature", 0.7)
                        probs = torch.softmax(logits, dim=-1)
                        next_token = torch.multinomial(probs, 1)
                        token_text = tokenizer.decode(
                            [next_token.item()], skip_special_tokens=True
                        )
                        if next_token.item() == tokenizer.eos_token_id:
                            break
                        # Add token to input for next iteration
                        local_inputs = torch.cat(
                            [local_inputs, next_token.unsqueeze(0)], dim=-1
                        )
                        yield token_text

            # Run streaming generation
            for token in _stream_generate():
                yield token

        except Exception as e:
            logger.error(f"Streaming generation failed: {e}")
            raise

    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> str:
        """Chat completion (convert to single prompt)"""
        # Convert messages to prompt format
        prompt = self._messages_to_prompt(messages)
        return await self.generate(prompt, model, **kwargs)

    async def chat_stream(
        self, messages: List[ChatMessage], model: str, **kwargs
    ) -> AsyncGenerator[str, None]:
        """Streaming chat completion"""

        async def _stream():
            result = await self.chat(messages, model, **kwargs)
            yield result

        return _stream()

    def _messages_to_prompt(self, messages: List[ChatMessage]) -> str:
        """Convert chat messages to a single prompt"""
        prompt_parts = []

        for message in messages:
            if message.role == "system":
                prompt_parts.append(f"System: {message.content}")
            elif message.role == "user":
                prompt_parts.append(f"User: {message.content}")
            elif message.role == "assistant":
                prompt_parts.append(f"Assistant: {message.content}")

        prompt_parts.append("Assistant:")
        return "\n".join(prompt_parts)

    async def embed(
        self, text: str, model: str = "sentence-transformers/all-MiniLM-L6-v2"
    ) -> List[float]:
        """Generate embeddings"""
        if self.use_cloud:
            return await self._embed_cloud(text, model)
        else:
            return await self._embed_local(text, model)

    async def _embed_cloud(self, text: str, model: str) -> List[float]:
        """Generate embeddings using cloud API"""
        try:
            url = f"{self.inference_api_url}/{model}"
            payload = {"inputs": text}

            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()

            result = response.json()
            return result if isinstance(result, list) else []

        except Exception as e:
            logger.error(f"Cloud embedding failed: {e}")
            raise

    async def _embed_local(self, text: str, model: str) -> List[float]:
        """Generate embeddings using local model"""
        try:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError:
                logger.error(
                    "sentence-transformers not available for local embeddings. Please install 'sentence-transformers'."
                )
                raise RuntimeError(
                    "sentence-transformers not available for local embeddings. Please install 'sentence-transformers'."
                )

            # Load sentence transformer
            if model not in self.pipelines:
                sentence_model = SentenceTransformer(
                    model, cache_folder=self.model_cache_dir
                )
                self.pipelines[model] = sentence_model
                self.models[model] = True

            sentence_model = self.pipelines[model]

            def _embed():
                return sentence_model.encode([text])[0].tolist()

            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(None, _embed)

            return embedding

        except Exception as e:
            logger.error(f"Local embedding failed: {e}")
            raise

    async def health_check(self) -> bool:
        """Check HuggingFace service availability"""
        try:
            if self.use_cloud:
                # Test with a simple model
                response = await self.http_client.get(
                    f"{self.inference_api_url}/microsoft/DialoGPT-medium"
                )
                return response.status_code == 200
            else:
                # Local models are always "available" if transformers is installed
                return TRANSFORMERS_AVAILABLE

        except Exception as e:
            logger.error(f"HuggingFace health check failed: {e}")
            return False

    async def list_models(self) -> List[str]:
        # For HuggingFace, just return available models and update self._models
        self._models = {name: True for name in self.available_models}
        return self.available_models

    async def unload_model(self, model: str) -> None:
        """Unload model to free memory"""
        if model in self.local_models:
            del self.local_models[model]
        if model in self.tokenizers:
            del self.tokenizers[model]
        if model in self.pipelines:
            del self.pipelines[model]
        if model in self.models:
            del self.models[model]

        # Force garbage collection
        import gc

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        logger.info(f"🗑️ Unloaded HuggingFace model: {model}")

    async def close(self):
        """Clean up resources"""
        await self.http_client.aclose()

        # Unload all models
        for model_name in list(self.models.keys()):
            await self.unload_model(model_name)

    @property
    def models(self):
        return self._models
