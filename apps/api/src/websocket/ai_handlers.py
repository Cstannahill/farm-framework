# apps/api/src/websocket/ai_handlers.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any, Optional, List
import json
import asyncio
import uuid
from datetime import datetime

from ..ai.router import ai_router
from ..ai.providers.base import ChatMessage
from ..models.ai import StreamingChatMessage, ChatRequest
from ..core.logger import logger


class AIWebSocketManager:
    """
    Manages WebSocket connections for AI streaming responses.

    Supports multiple concurrent AI conversations with different providers.
    """

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        self.active_streams: Dict[str, asyncio.Task] = {}

    async def connect(
        self, websocket: WebSocket, connection_id: Optional[str] = None
    ) -> str:
        """Accept WebSocket connection and return connection ID."""
        if not connection_id:
            connection_id = str(uuid.uuid4())

        await websocket.accept()
        self.active_connections[connection_id] = websocket
        self.connection_metadata[connection_id] = {
            "connected_at": datetime.utcnow().isoformat(),
            "messages_sent": 0,
            "current_provider": None,
            "current_model": None,
        }

        logger.info(f"WebSocket connection established: {connection_id}")

        # Send welcome message
        await self._send_message(
            connection_id,
            {
                "type": "connection",
                "data": {
                    "connection_id": connection_id,
                    "status": "connected",
                    "available_providers": list(ai_router.providers.keys()),
                    "default_provider": ai_router.default_provider,
                },
            },
        )

        return connection_id

    async def disconnect(self, connection_id: str):
        """Handle WebSocket disconnection."""
        if connection_id in self.active_connections:
            # Cancel any active streaming tasks
            if connection_id in self.active_streams:
                self.active_streams[connection_id].cancel()
                del self.active_streams[connection_id]

            # Clean up connection
            del self.active_connections[connection_id]
            del self.connection_metadata[connection_id]

            logger.info(f"WebSocket connection closed: {connection_id}")

    async def handle_message(self, connection_id: str, message: Dict[str, Any]):
        """Handle incoming WebSocket message."""
        try:
            message_type = message.get("type")
            data = message.get("data", {})

            if message_type == "chat_request":
                await self._handle_chat_request(connection_id, data)
            elif message_type == "stop_generation":
                await self._handle_stop_generation(connection_id)
            elif message_type == "switch_provider":
                await self._handle_switch_provider(connection_id, data)
            elif message_type == "load_model":
                await self._handle_load_model(connection_id, data)
            elif message_type == "ping":
                await self._handle_ping(connection_id)
            else:
                await self._send_error(
                    connection_id, f"Unknown message type: {message_type}"
                )

        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self._send_error(connection_id, f"Message handling error: {str(e)}")

    async def _handle_chat_request(self, connection_id: str, data: Dict[str, Any]):
        """Handle streaming chat request."""
        try:
            # Validate request data
            if "messages" not in data:
                await self._send_error(
                    connection_id, "Missing 'messages' in chat request"
                )
                return

            messages = [ChatMessage(**msg) for msg in data["messages"]]
            model = data.get("model", "llama3.1")
            provider_name = data.get("provider")
            temperature = data.get("temperature", 0.7)
            max_tokens = data.get("max_tokens", 1000)

            # Get AI provider
            provider = ai_router.get_provider(provider_name)
            provider_name = provider_name or ai_router.default_provider

            # Update connection metadata
            self.connection_metadata[connection_id].update(
                {"current_provider": provider_name, "current_model": model}
            )

            # Ensure model is loaded
            if model not in provider.models:
                await self._send_message(
                    connection_id,
                    {
                        "type": "model_loading",
                        "data": {
                            "model": model,
                            "provider": provider_name,
                            "status": "loading",
                        },
                    },
                )

                success = await provider.load_model(model)
                if not success:
                    await self._send_error(
                        connection_id, f"Failed to load model: {model}"
                    )
                    return

            # Start streaming chat
            await self._start_chat_stream(
                connection_id, provider, messages, model, temperature, max_tokens
            )

        except Exception as e:
            logger.error(f"Chat request error: {e}")
            await self._send_error(connection_id, f"Chat request failed: {str(e)}")

    async def _start_chat_stream(
        self,
        connection_id: str,
        provider,
        messages: List[ChatMessage],
        model: str,
        temperature: float,
        max_tokens: int,
    ):
        """Start streaming chat completion."""
        # Cancel any existing stream
        if connection_id in self.active_streams:
            self.active_streams[connection_id].cancel()

        # Create new streaming task
        task = asyncio.create_task(
            self._stream_chat_response(
                connection_id, provider, messages, model, temperature, max_tokens
            )
        )
        self.active_streams[connection_id] = task

        try:
            await task
        except asyncio.CancelledError:
            logger.info(f"Chat stream cancelled for connection {connection_id}")
            await self._send_message(
                connection_id,
                {"type": "stream_cancelled", "data": {"reason": "cancelled_by_client"}},
            )
        finally:
            if connection_id in self.active_streams:
                del self.active_streams[connection_id]

    async def _stream_chat_response(
        self,
        connection_id: str,
        provider,
        messages: List[ChatMessage],
        model: str,
        temperature: float,
        max_tokens: int,
    ):
        """Stream chat response from AI provider."""
        try:
            # Send stream start message
            await self._send_message(
                connection_id,
                {
                    "type": "stream_start",
                    "data": {
                        "model": model,
                        "provider": self.connection_metadata[connection_id][
                            "current_provider"
                        ],
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                },
            )

            full_response = ""
            start_time = datetime.utcnow()

            # Stream chat completion
            async for chunk in provider.chat_stream(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            ):
                if chunk:  # Only send non-empty chunks
                    full_response += chunk

                    await self._send_message(
                        connection_id,
                        {
                            "type": "stream_content",
                            "data": {"content": chunk, "full_response": full_response},
                        },
                    )

            # Send stream completion
            end_time = datetime.utcnow()
            response_time = (end_time - start_time).total_seconds() * 1000

            await self._send_message(
                connection_id,
                {
                    "type": "stream_complete",
                    "data": {
                        "full_response": full_response,
                        "model": model,
                        "provider": self.connection_metadata[connection_id][
                            "current_provider"
                        ],
                        "response_time_ms": response_time,
                        "timestamp": end_time.isoformat(),
                        "total_tokens": len(full_response.split()),  # Rough estimate
                    },
                },
            )

            # Update connection stats
            self.connection_metadata[connection_id]["messages_sent"] += 1

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            await self._send_error(connection_id, f"Streaming failed: {str(e)}")

    async def _handle_stop_generation(self, connection_id: str):
        """Handle request to stop current generation."""
        if connection_id in self.active_streams:
            self.active_streams[connection_id].cancel()
            await self._send_message(
                connection_id,
                {
                    "type": "generation_stopped",
                    "data": {"timestamp": datetime.utcnow().isoformat()},
                },
            )
        else:
            await self._send_message(
                connection_id,
                {
                    "type": "no_active_generation",
                    "data": {"message": "No active generation to stop"},
                },
            )

    async def _handle_switch_provider(self, connection_id: str, data: Dict[str, Any]):
        """Handle provider switching."""
        try:
            new_provider = data.get("provider")
            if not new_provider:
                await self._send_error(connection_id, "Missing provider name")
                return

            if new_provider not in ai_router.providers:
                await self._send_error(
                    connection_id, f"Provider '{new_provider}' not available"
                )
                return

            # Check provider health
            provider = ai_router.providers[new_provider]
            is_healthy = await provider.health_check()

            if not is_healthy:
                await self._send_error(
                    connection_id, f"Provider '{new_provider}' is not healthy"
                )
                return

            # Update connection metadata
            self.connection_metadata[connection_id]["current_provider"] = new_provider

            await self._send_message(
                connection_id,
                {
                    "type": "provider_switched",
                    "data": {
                        "provider": new_provider,
                        "available_models": list(provider.models.keys()),
                        "status": "healthy",
                    },
                },
            )

        except Exception as e:
            logger.error(f"Provider switch error: {e}")
            await self._send_error(connection_id, f"Provider switch failed: {str(e)}")

    async def _handle_load_model(self, connection_id: str, data: Dict[str, Any]):
        """Handle model loading request."""
        try:
            model_name = data.get("model")
            provider_name = data.get("provider")

            if not model_name:
                await self._send_error(connection_id, "Missing model name")
                return

            provider = ai_router.get_provider(provider_name)

            await self._send_message(
                connection_id,
                {
                    "type": "model_loading",
                    "data": {
                        "model": model_name,
                        "provider": provider_name or ai_router.default_provider,
                        "status": "loading",
                    },
                },
            )

            success = await provider.load_model(model_name)

            if success:
                self.connection_metadata[connection_id]["current_model"] = model_name
                await self._send_message(
                    connection_id,
                    {
                        "type": "model_loaded",
                        "data": {
                            "model": model_name,
                            "provider": provider_name or ai_router.default_provider,
                            "status": "loaded",
                        },
                    },
                )
            else:
                await self._send_error(
                    connection_id, f"Failed to load model: {model_name}"
                )

        except Exception as e:
            logger.error(f"Model loading error: {e}")
            await self._send_error(connection_id, f"Model loading failed: {str(e)}")

    async def _handle_ping(self, connection_id: str):
        """Handle ping message for connection health."""
        await self._send_message(
            connection_id,
            {
                "type": "pong",
                "data": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "connection_metadata": self.connection_metadata.get(
                        connection_id, {}
                    ),
                },
            },
        )

    async def _send_message(self, connection_id: str, message: Dict[str, Any]):
        """Send message to WebSocket connection."""
        if connection_id not in self.active_connections:
            return

        try:
            websocket = self.active_connections[connection_id]
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {e}")
            await self.disconnect(connection_id)

    async def _send_error(self, connection_id: str, error_message: str):
        """Send error message to WebSocket connection."""
        await self._send_message(
            connection_id,
            {
                "type": "error",
                "data": {
                    "error": error_message,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            },
        )

    def get_connection_stats(self) -> Dict[str, Any]:
        """Get statistics about active connections."""
        return {
            "total_connections": len(self.active_connections),
            "active_streams": len(self.active_streams),
            "connections": {
                conn_id: {
                    **metadata,
                    "has_active_stream": conn_id in self.active_streams,
                }
                for conn_id, metadata in self.connection_metadata.items()
            },
        }


# Global WebSocket manager instance
ai_ws_manager = AIWebSocketManager()


# ============================================================================
# WebSocket Route Handler
# ============================================================================


async def websocket_ai_endpoint(
    websocket: WebSocket, connection_id: Optional[str] = None
):
    """
    Main WebSocket endpoint for AI streaming.

    Usage from frontend:
    const ws = new WebSocket('ws://localhost:8000/ws/ai');
    ws.send(JSON.stringify({
        type: 'chat_request',
        data: {
            messages: [{role: 'user', content: 'Hello!'}],
            model: 'llama3.1',
            provider: 'ollama'
        }
    }));
    """
    connection_id = await ai_ws_manager.connect(websocket, connection_id)

    try:
        while True:
            # Receive message from client
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                await ai_ws_manager.handle_message(connection_id, message)
            except json.JSONDecodeError:
                await ai_ws_manager._send_error(connection_id, "Invalid JSON format")
            except Exception as e:
                logger.error(f"WebSocket receive error: {e}")
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await ai_ws_manager.disconnect(connection_id)


# ============================================================================
# WebSocket Route Registration
# ============================================================================


def register_ai_websocket_routes(app):
    """Register AI WebSocket routes with FastAPI app."""

    @app.websocket("/ws/ai")
    async def websocket_ai(websocket: WebSocket):
        await websocket_ai_endpoint(websocket)

    @app.websocket("/ws/ai/{connection_id}")
    async def websocket_ai_with_id(websocket: WebSocket, connection_id: str):
        await websocket_ai_endpoint(websocket, connection_id)

    @app.get("/ws/ai/stats")
    async def get_websocket_stats():
        """Get WebSocket connection statistics."""
        return ai_ws_manager.get_connection_stats()


# ============================================================================
# WebSocket Helper Functions
# ============================================================================


async def broadcast_to_all_connections(message: Dict[str, Any]):
    """Broadcast message to all active WebSocket connections."""
    if not ai_ws_manager.active_connections:
        return

    tasks = []
    for connection_id in list(ai_ws_manager.active_connections.keys()):
        tasks.append(ai_ws_manager._send_message(connection_id, message))

    await asyncio.gather(*tasks, return_exceptions=True)


async def send_provider_health_update(
    provider_name: str, health_status: Dict[str, Any]
):
    """Send provider health update to all connected clients."""
    message = {
        "type": "provider_health_update",
        "data": {
            "provider": provider_name,
            "health": health_status,
            "timestamp": datetime.utcnow().isoformat(),
        },
    }
    await broadcast_to_all_connections(message)


async def send_model_update(provider_name: str, model_name: str, status: str):
    """Send model status update to all connected clients."""
    message = {
        "type": "model_status_update",
        "data": {
            "provider": provider_name,
            "model": model_name,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
        },
    }
    await broadcast_to_all_connections(message)
