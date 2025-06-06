# packages/core/src/ai/ollama/streaming.py
import asyncio
import json
from typing import Dict, List, Optional, AsyncIterator, Callable
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from datetime import datetime
from .api_client import OllamaAPIClient
from ..providers.base import ChatMessage


class OllamaStreamingManager:
    """Manages streaming AI responses from Ollama with WebSocket and SSE support"""

    def __init__(self, ollama_client: OllamaAPIClient):
        self.ollama_client = ollama_client
        self.active_streams = {}
        self.websocket_connections = {}

    async def stream_chat_response(
        self, messages: List[ChatMessage], model: str, stream_id: str, **kwargs
    ) -> AsyncIterator[Dict]:
        """Stream chat responses with metadata"""
        try:
            self.active_streams[stream_id] = {
                "status": "active",
                "model": model,
                "started_at": datetime.now(),
                "messages_sent": 0,
                "total_tokens": 0,
            }

            # Yield start event
            yield {
                "type": "stream_start",
                "stream_id": stream_id,
                "model": model,
                "timestamp": datetime.now().isoformat(),
            }

            token_count = 0
            full_response = ""

            async for token in self.ollama_client.chat_stream(
                messages, model, **kwargs
            ):
                token_count += 1
                full_response += token

                # Update stream status
                self.active_streams[stream_id]["messages_sent"] = token_count
                self.active_streams[stream_id]["total_tokens"] = token_count

                # Yield token data
                yield {
                    "type": "token",
                    "stream_id": stream_id,
                    "content": token,
                    "token_count": token_count,
                    "timestamp": datetime.now().isoformat(),
                }

            # Yield completion event
            yield {
                "type": "stream_complete",
                "stream_id": stream_id,
                "full_response": full_response,
                "total_tokens": token_count,
                "duration": (
                    datetime.now() - self.active_streams[stream_id]["started_at"]
                ).total_seconds(),
                "timestamp": datetime.now().isoformat(),
            }

        except Exception as e:
            # Yield error event
            yield {
                "type": "stream_error",
                "stream_id": stream_id,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

        finally:
            # Clean up stream
            if stream_id in self.active_streams:
                del self.active_streams[stream_id]

    async def stream_generation_response(
        self, prompt: str, model: str, stream_id: str, **kwargs
    ) -> AsyncIterator[Dict]:
        """Stream generation responses with metadata"""
        try:
            self.active_streams[stream_id] = {
                "status": "active",
                "model": model,
                "started_at": datetime.now(),
                "messages_sent": 0,
                "total_tokens": 0,
            }

            # Yield start event
            yield {
                "type": "stream_start",
                "stream_id": stream_id,
                "model": model,
                "prompt": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                "timestamp": datetime.now().isoformat(),
            }

            token_count = 0
            full_response = ""

            async for token in self.ollama_client.generate_stream(
                prompt, model, **kwargs
            ):
                token_count += 1
                full_response += token

                # Update stream status
                self.active_streams[stream_id]["messages_sent"] = token_count
                self.active_streams[stream_id]["total_tokens"] = token_count

                # Yield token data
                yield {
                    "type": "token",
                    "stream_id": stream_id,
                    "content": token,
                    "token_count": token_count,
                    "timestamp": datetime.now().isoformat(),
                }

            # Yield completion event
            yield {
                "type": "stream_complete",
                "stream_id": stream_id,
                "full_response": full_response,
                "total_tokens": token_count,
                "duration": (
                    datetime.now() - self.active_streams[stream_id]["started_at"]
                ).total_seconds(),
                "timestamp": datetime.now().isoformat(),
            }

        except Exception as e:
            # Yield error event
            yield {
                "type": "stream_error",
                "stream_id": stream_id,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

        finally:
            # Clean up stream
            if stream_id in self.active_streams:
                del self.active_streams[stream_id]

    def create_sse_response(
        self, stream_generator: AsyncIterator[Dict]
    ) -> StreamingResponse:
        """Create Server-Sent Events response for streaming"""

        async def generate_sse():
            try:
                async for data in stream_generator:
                    # Format as SSE
                    json_data = json.dumps(data)
                    yield f"data: {json_data}\n\n"

                # Send completion signal
                yield "data: [DONE]\n\n"

            except Exception as e:
                # Send error as SSE
                error_data = {
                    "type": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
                yield f"data: {json.dumps(error_data)}\n\n"

        return StreamingResponse(
            generate_sse(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            },
        )

    async def handle_websocket_chat(self, websocket: WebSocket, connection_id: str):
        """Handle WebSocket connection for real-time chat"""
        try:
            await websocket.accept()
            self.websocket_connections[connection_id] = {
                "websocket": websocket,
                "connected_at": datetime.now(),
                "messages_sent": 0,
            }

            # Send connection confirmation
            await websocket.send_json(
                {
                    "type": "connection_established",
                    "connection_id": connection_id,
                    "timestamp": datetime.now().isoformat(),
                }
            )

            while True:
                # Receive message from client
                data = await websocket.receive_json()
                await self._process_websocket_message(websocket, connection_id, data)

        except WebSocketDisconnect:
            print(f"WebSocket disconnected: {connection_id}")
        except Exception as e:
            print(f"WebSocket error for {connection_id}: {e}")
            await websocket.send_json(
                {
                    "type": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )
        finally:
            # Clean up connection
            if connection_id in self.websocket_connections:
                del self.websocket_connections[connection_id]

    async def _process_websocket_message(
        self, websocket: WebSocket, connection_id: str, data: Dict
    ):
        """Process incoming WebSocket message"""
        message_type = data.get("type")

        if message_type == "chat":
            await self._handle_websocket_chat_message(websocket, connection_id, data)
        elif message_type == "generate":
            await self._handle_websocket_generation(websocket, connection_id, data)
        elif message_type == "ping":
            await websocket.send_json(
                {"type": "pong", "timestamp": datetime.now().isoformat()}
            )
        else:
            await websocket.send_json(
                {
                    "type": "error",
                    "error": f"Unknown message type: {message_type}",
                    "timestamp": datetime.now().isoformat(),
                }
            )

    async def _handle_websocket_chat_message(
        self, websocket: WebSocket, connection_id: str, data: Dict
    ):
        """Handle chat message over WebSocket"""
        try:
            messages_data = data.get("messages", [])
            model = data.get("model", "llama3.1")
            stream_id = data.get(
                "stream_id", f"{connection_id}_{datetime.now().timestamp()}"
            )

            # Convert to ChatMessage objects
            messages = [
                ChatMessage(role=msg["role"], content=msg["content"])
                for msg in messages_data
            ]

            # Stream response back through WebSocket
            async for chunk in self.stream_chat_response(messages, model, stream_id):
                await websocket.send_json(chunk)

                # Update connection stats
                self.websocket_connections[connection_id]["messages_sent"] += 1

        except Exception as e:
            await websocket.send_json(
                {
                    "type": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )

    async def _handle_websocket_generation(
        self, websocket: WebSocket, connection_id: str, data: Dict
    ):
        """Handle generation request over WebSocket"""
        try:
            prompt = data.get("prompt", "")
            model = data.get("model", "llama3.1")
            stream_id = data.get(
                "stream_id", f"{connection_id}_{datetime.now().timestamp()}"
            )
            options = data.get("options", {})

            # Stream response back through WebSocket
            async for chunk in self.stream_generation_response(
                prompt, model, stream_id, **options
            ):
                await websocket.send_json(chunk)

                # Update connection stats
                self.websocket_connections[connection_id]["messages_sent"] += 1

        except Exception as e:
            await websocket.send_json(
                {
                    "type": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )

    def get_active_streams(self) -> Dict:
        """Get information about active streams"""
        return {
            stream_id: {
                **stream_info,
                "duration": (
                    datetime.now() - stream_info["started_at"]
                ).total_seconds(),
            }
            for stream_id, stream_info in self.active_streams.items()
        }

    def get_websocket_connections(self) -> Dict:
        """Get information about active WebSocket connections"""
        return {
            conn_id: {
                "connected_at": conn_info["connected_at"].isoformat(),
                "messages_sent": conn_info["messages_sent"],
                "duration": (
                    datetime.now() - conn_info["connected_at"]
                ).total_seconds(),
            }
            for conn_id, conn_info in self.websocket_connections.items()
        }

    async def broadcast_to_all_connections(self, message: Dict):
        """Broadcast a message to all connected WebSocket clients"""
        if not self.websocket_connections:
            return

        disconnected = []

        for conn_id, conn_info in self.websocket_connections.items():
            try:
                await conn_info["websocket"].send_json(message)
            except:
                # Connection is dead, mark for removal
                disconnected.append(conn_id)

        # Clean up disconnected connections
        for conn_id in disconnected:
            del self.websocket_connections[conn_id]

    async def stop_stream(self, stream_id: str) -> bool:
        """Stop an active stream"""
        if stream_id in self.active_streams:
            self.active_streams[stream_id]["status"] = "stopped"
            # Note: Actual stream stopping would require more complex cancellation
            return True
        return False

    async def get_stream_stats(self, stream_id: str) -> Optional[Dict]:
        """Get statistics for a specific stream"""
        if stream_id in self.active_streams:
            stream_info = self.active_streams[stream_id]
            return {
                **stream_info,
                "duration": (
                    datetime.now() - stream_info["started_at"]
                ).total_seconds(),
            }
        return None


# Utility classes for easier integration
class StreamingChatSession:
    """High-level streaming chat session management"""

    def __init__(self, ollama_client: OllamaAPIClient, model: str = "llama3.1"):
        self.ollama_client = ollama_client
        self.model = model
        self.streaming_manager = OllamaStreamingManager(ollama_client)
        self.conversation_history = []
        self.session_id = f"session_{datetime.now().timestamp()}"

    async def send_message(
        self,
        message: str,
        role: str = "user",
        stream_callback: Optional[Callable] = None,
    ) -> str:
        """Send a message and get streaming response"""
        # Add user message to history
        self.conversation_history.append(ChatMessage(role=role, content=message))

        # Generate stream ID
        stream_id = f"{self.session_id}_{len(self.conversation_history)}"

        # Collect full response
        full_response = ""

        async for chunk in self.streaming_manager.stream_chat_response(
            self.conversation_history, self.model, stream_id
        ):
            if stream_callback:
                stream_callback(chunk)

            if chunk["type"] == "token":
                full_response += chunk["content"]

        # Add assistant response to history
        if full_response:
            self.conversation_history.append(
                ChatMessage(role="assistant", content=full_response)
            )

        return full_response

    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []

    def get_history(self) -> List[Dict]:
        """Get conversation history as dict list"""
        return [
            {"role": msg.role, "content": msg.content}
            for msg in self.conversation_history
        ]
