# apps/api/src/ai/providers/openai.py
import asyncio
import openai
from typing import AsyncIterator, List, Dict, Any, Optional, AsyncGenerator
from .base import (
    AIProvider,
    ChatMessage,
)  # Ensure base.py exists or update path if needed
import os
import time
from collections import deque
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter for OpenAI API"""

    def __init__(self, requests_per_minute: int = 60, tokens_per_minute: int = 40000):
        self.requests_per_minute = requests_per_minute
        self.tokens_per_minute = tokens_per_minute
        self.request_bucket = deque()
        self.token_bucket = deque()

    async def acquire_request(self) -> bool:
        """Acquire a request token"""
        now = time.time()

        # Remove old requests (older than 1 minute)
        while self.request_bucket and now - self.request_bucket[0] > 60:
            self.request_bucket.popleft()

        if len(self.request_bucket) >= self.requests_per_minute:
            # Calculate wait time until next available slot
            wait_time = 60 - (now - self.request_bucket[0])
            logger.warning(f"Rate limit reached, waiting {wait_time:.2f}s")
            await asyncio.sleep(wait_time)
            return await self.acquire_request()

        self.request_bucket.append(now)
        return True

    async def acquire_tokens(self, estimated_tokens: int) -> bool:
        """Acquire token allocation"""
        now = time.time()

        # Remove old token usage (older than 1 minute)
        while self.token_bucket and now - self.token_bucket[0][0] > 60:
            self.token_bucket.popleft()

        current_tokens = sum(tokens for _, tokens in self.token_bucket)

        if current_tokens + estimated_tokens > self.tokens_per_minute:
            # Calculate wait time based on oldest token usage
            if self.token_bucket:
                wait_time = 60 - (now - self.token_bucket[0][0])
                logger.warning(f"Token limit reached, waiting {wait_time:.2f}s")
                await asyncio.sleep(wait_time)
                return await self.acquire_tokens(estimated_tokens)

        self.token_bucket.append((now, estimated_tokens))
        return True


class OpenAIProvider(AIProvider):
    """OpenAI cloud AI provider with rate limiting and error handling"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__()
        self._models = {}

        # Initialize OpenAI client
        api_key = config.get("api_key") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key is required")

        self.client = openai.AsyncClient(api_key=api_key)

        # Rate limiting configuration
        rate_config = config.get("rateLimiting", {})
        self.rate_limiter = RateLimiter(
            requests_per_minute=rate_config.get("requestsPerMinute", 60),
            tokens_per_minute=rate_config.get("tokensPerMinute", 40000),
        )

        # Retry configuration
        self.max_retries = config.get("maxRetries", 3)
        self.retry_delay = config.get("retryDelay", 1)

        # Available models
        self.available_models = config.get(
            "models", ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-3.5-turbo-16k"]
        )
        self.default_model = config.get("defaultModel", "gpt-3.5-turbo")
        for m in self.available_models:
            self._models[m] = True

    async def load_model(self, model: str) -> None:
        """OpenAI models don't need explicit loading"""
        return None

    async def unload_model(self, model: str) -> None:
        return None

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars ≈ 1 token)"""
        return max(1, len(text) // 4)

    async def _make_request_with_retry(self, request_func, *args, **kwargs):
        """Make request with retry logic and rate limiting"""

        # Estimate tokens for rate limiting
        prompt_text = ""
        if "messages" in kwargs:
            prompt_text = " ".join(
                [msg.get("content", "") for msg in kwargs["messages"]]
            )
        elif len(args) > 0 and isinstance(args[0], str):
            prompt_text = args[0]

        estimated_tokens = self._estimate_tokens(prompt_text)
        estimated_tokens += kwargs.get("max_tokens", 150)  # Add response tokens

        # Apply rate limiting
        await self.rate_limiter.acquire_request()
        await self.rate_limiter.acquire_tokens(estimated_tokens)

        last_error = None

        for attempt in range(self.max_retries):
            try:
                return await request_func(*args, **kwargs)

            except openai.RateLimitError as e:
                logger.warning(f"Rate limit hit on attempt {attempt + 1}: {e}")
                if attempt < self.max_retries - 1:
                    wait_time = self.retry_delay * (2**attempt)
                    await asyncio.sleep(wait_time)
                last_error = e

            except openai.APIError as e:
                logger.error(f"OpenAI API error on attempt {attempt + 1}: {e}")
                status_code = getattr(e, "status", None)
                if (
                    attempt < self.max_retries - 1
                    and status_code is not None
                    and status_code >= 500
                ):
                    # Retry on server errors
                    wait_time = self.retry_delay * (2**attempt)
                    await asyncio.sleep(wait_time)
                last_error = e

            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                last_error = e
                break

        if last_error is not None:
            raise last_error
        else:
            raise RuntimeError("OpenAI request failed for unknown reason")

    async def generate(self, prompt: str, model: str, **kwargs) -> str:
        """Generate completion using OpenAI"""
        try:
            response = await self._make_request_with_retry(
                self.client.completions.create,
                model=model,
                prompt=prompt,
                temperature=kwargs.get("temperature", 0.7),
                max_tokens=kwargs.get("max_tokens", 1000),
                top_p=kwargs.get("top_p", 1.0),
                frequency_penalty=kwargs.get("frequency_penalty", 0.0),
                presence_penalty=kwargs.get("presence_penalty", 0.0),
            )
            return response.choices[0].text.strip()

        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            raise

    async def generate_stream(
        self, prompt: str, model: str, **kwargs
    ) -> AsyncIterator[str]:
        """Stream completion from OpenAI"""
        try:
            response = await self._make_request_with_retry(
                self.client.completions.create,
                model=model,
                prompt=prompt,
                temperature=kwargs.get("temperature", 0.7),
                max_tokens=kwargs.get("max_tokens", 1000),
                stream=True,
            )

            async for chunk in response:
                if chunk.choices[0].text:
                    yield chunk.choices[0].text

        except Exception as e:
            logger.error(f"OpenAI streaming failed: {e}")
            raise

    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> str:
        """Chat completion using OpenAI"""
        try:
            openai_messages = [
                {"role": msg.role, "content": msg.content} for msg in messages
            ]

            response = await self._make_request_with_retry(
                self.client.chat.completions.create,
                model=model,
                messages=openai_messages,
                temperature=kwargs.get("temperature", 0.7),
                max_tokens=kwargs.get("max_tokens", 1000),
                top_p=kwargs.get("top_p", 1.0),
                frequency_penalty=kwargs.get("frequency_penalty", 0.0),
                presence_penalty=kwargs.get("presence_penalty", 0.0),
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"OpenAI chat failed: {e}")
            raise

    async def chat_stream(
        self, messages: List[ChatMessage], model: str, **kwargs
    ) -> AsyncGenerator[str, None]:
        async def _stream():
            try:
                openai_messages = [
                    {"role": msg.role, "content": msg.content} for msg in messages
                ]
                response = await self._make_request_with_retry(
                    self.client.chat.completions.create,
                    model=model,
                    messages=openai_messages,
                    temperature=kwargs.get("temperature", 0.7),
                    max_tokens=kwargs.get("max_tokens", 1000),
                    stream=True,
                )
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e:
                logger.error(f"OpenAI chat streaming failed: {e}")
                raise

        return _stream()

    async def embed(
        self, text: str, model: str = "text-embedding-ada-002"
    ) -> List[float]:
        """Generate embeddings using OpenAI"""
        try:
            response = await self._make_request_with_retry(
                self.client.embeddings.create, model=model, input=text
            )
            return response.data[0].embedding

        except Exception as e:
            logger.error(f"OpenAI embedding failed: {e}")
            raise

    async def health_check(self) -> bool:
        """Check OpenAI API availability"""
        try:
            # Simple API call to verify connectivity
            await self._make_request_with_retry(self.client.models.list)
            return True

        except Exception as e:
            logger.error(f"OpenAI health check failed: {e}")
            return False

    async def list_models(self) -> List[str]:
        """List available OpenAI models"""
        try:
            response = await self._make_request_with_retry(self.client.models.list)
            models = [
                model.id for model in response.data if model.id in self.available_models
            ]
            self._models = {name: True for name in models}
            return models
        except Exception as e:
            logger.error(f"Failed to list OpenAI models: {e}")
            return []

    @property
    def models(self):
        return self._models

    def get_rate_limit_status(self) -> Dict[str, Any]:
        """Get current rate limit status"""
        now = time.time()

        # Count recent requests
        recent_requests = sum(
            1 for timestamp in self.rate_limiter.request_bucket if now - timestamp <= 60
        )

        # Count recent tokens
        recent_tokens = sum(
            tokens
            for timestamp, tokens in self.rate_limiter.token_bucket
            if now - timestamp <= 60
        )

        return {
            "requests_used": recent_requests,
            "requests_limit": self.rate_limiter.requests_per_minute,
            "tokens_used": recent_tokens,
            "tokens_limit": self.rate_limiter.tokens_per_minute,
            "requests_available": max(
                0, self.rate_limiter.requests_per_minute - recent_requests
            ),
            "tokens_available": max(
                0, self.rate_limiter.tokens_per_minute - recent_tokens
            ),
        }
