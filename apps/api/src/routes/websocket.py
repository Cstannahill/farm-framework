# apps/api/src/routes/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import HTMLResponse
from typing import Dict, Any, Optional
import json
import asyncio
from datetime import datetime

from ..websocket.ai_handlers import ai_ws_manager, websocket_ai_endpoint
from ..core.logger import logger
from ..core.auth import get_current_user_websocket  # Optional auth
from ..ai.router import ai_router

router = APIRouter(prefix="/ws", tags=["WebSocket"])

# ============================================================================
# AI Streaming WebSocket Routes
# ============================================================================


@router.websocket("/ai")
async def websocket_ai_chat(websocket: WebSocket):
    """
    Main AI chat WebSocket endpoint.

    Supports real-time streaming chat with all AI providers.
    """
    await websocket_ai_endpoint(websocket)


@router.websocket("/ai/{connection_id}")
async def websocket_ai_chat_with_id(websocket: WebSocket, connection_id: str):
    """
    AI chat WebSocket with custom connection ID.

    Useful for reconnecting to existing sessions.
    """
    await websocket_ai_endpoint(websocket, connection_id)


# ============================================================================
# Real-time Status WebSocket
# ============================================================================


class StatusWebSocketManager:
    """Manager for real-time status updates."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

        # Send initial status
        await self.send_status_update(client_id, await self._get_system_status())

    async def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_status_update(self, client_id: str, status: Dict[str, Any]):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(json.dumps(status))
            except:
                await self.disconnect(client_id)

    async def broadcast_status(self, status: Dict[str, Any]):
        """Broadcast status to all connected clients."""
        disconnected = []
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(status))
            except:
                disconnected.append(client_id)

        # Clean up disconnected clients
        for client_id in disconnected:
            await self.disconnect(client_id)

    async def _get_system_status(self) -> Dict[str, Any]:
        """Get current system status."""
        try:
            # Get AI provider health
            health_results = await ai_router.health_check_all()

            # Get WebSocket stats
            ws_stats = ai_ws_manager.get_connection_stats()

            return {
                "type": "system_status",
                "data": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "ai_providers": health_results,
                    "websocket_connections": ws_stats,
                    "system": {
                        "status": "healthy",
                        "uptime": "unknown",  # TODO: Add actual uptime tracking
                    },
                },
            }
        except Exception as e:
            return {
                "type": "system_status",
                "data": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": str(e),
                    "status": "error",
                },
            }


status_ws_manager = StatusWebSocketManager()


@router.websocket("/status")
async def websocket_status(websocket: WebSocket):
    """
    Real-time system status WebSocket.

    Provides updates on AI provider health, system metrics, etc.
    """
    client_id = f"status_{datetime.utcnow().timestamp()}"
    await status_ws_manager.connect(websocket, client_id)

    try:
        # Send periodic status updates
        while True:
            await asyncio.sleep(30)  # Update every 30 seconds
            status = await status_ws_manager._get_system_status()
            await status_ws_manager.send_status_update(client_id, status)

    except WebSocketDisconnect:
        logger.info(f"Status WebSocket disconnected: {client_id}")
    except Exception as e:
        logger.error(f"Status WebSocket error: {e}")
    finally:
        await status_ws_manager.disconnect(client_id)


# ============================================================================
# Development Tools WebSocket
# ============================================================================


@router.websocket("/dev")
async def websocket_dev_tools(websocket: WebSocket):
    """
    Development tools WebSocket for framework development.

    Provides real-time updates during development:
    - Type generation status
    - Model loading progress
    - Service health changes
    """
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "ping":
                await websocket.send_text(
                    json.dumps(
                        {"type": "pong", "timestamp": datetime.utcnow().isoformat()}
                    )
                )
            elif message.get("type") == "get_dev_status":
                dev_status = {
                    "type": "dev_status",
                    "data": {
                        "ai_providers": await ai_router.health_check_all(),
                        "active_connections": ai_ws_manager.get_connection_stats(),
                        "environment": "development",
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                }
                await websocket.send_text(json.dumps(dev_status))

    except WebSocketDisconnect:
        logger.info("Dev tools WebSocket disconnected")
    except Exception as e:
        logger.error(f"Dev tools WebSocket error: {e}")


# ============================================================================
# WebSocket Health and Monitoring
# ============================================================================


@router.get("/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics."""
    return {
        "ai_connections": ai_ws_manager.get_connection_stats(),
        "status_connections": len(status_ws_manager.active_connections),
        "total_connections": (
            len(ai_ws_manager.active_connections)
            + len(status_ws_manager.active_connections)
        ),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/broadcast")
async def broadcast_message(message: Dict[str, Any]):
    """
    Broadcast message to all WebSocket connections.

    Useful for admin notifications or system-wide updates.
    """
    try:
        # Broadcast to AI connections
        await ai_ws_manager.broadcast_to_all_connections(message)

        # Broadcast to status connections
        await status_ws_manager.broadcast_status(message)

        return {
            "message": "Broadcast sent successfully",
            "recipients": {
                "ai_connections": len(ai_ws_manager.active_connections),
                "status_connections": len(status_ws_manager.active_connections),
            },
        }
    except Exception as e:
        logger.error(f"Broadcast error: {e}")
        return {"error": f"Broadcast failed: {str(e)}"}


# ============================================================================
# WebSocket Test Page (Development)
# ============================================================================


@router.get("/test")
async def websocket_test_page():
    """
    Simple WebSocket test page for development.

    Provides basic UI for testing WebSocket connections.
    """
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>FARM WebSocket Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
            textarea { width: 100%; height: 100px; }
            button { margin: 5px; padding: 8px 16px; }
            #messages { height: 300px; overflow-y: scroll; border: 1px solid #ccc; padding: 10px; }
            .message { margin: 5px 0; padding: 5px; background: #f5f5f5; }
            .error { background: #ffebee; color: #c62828; }
            .success { background: #e8f5e9; color: #2e7d32; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>FARM WebSocket Test</h1>
            
            <div class="section">
                <h3>AI Chat WebSocket</h3>
                <button onclick="connectAI()">Connect AI</button>
                <button onclick="disconnectAI()">Disconnect</button>
                <button onclick="sendTestChat()">Send Test Chat</button>
                <div>Status: <span id="ai-status">Disconnected</span></div>
            </div>
            
            <div class="section">
                <h3>Custom Message</h3>
                <textarea id="custom-message" placeholder="Enter JSON message...">
{
  "type": "chat_request",
  "data": {
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "llama3.1",
    "provider": "ollama"
  }
}
                </textarea>
                <br>
                <button onclick="sendCustomMessage()">Send Custom Message</button>
            </div>
            
            <div class="section">
                <h3>Messages</h3>
                <button onclick="clearMessages()">Clear</button>
                <div id="messages"></div>
            </div>
        </div>

        <script>
            let aiSocket = null;
            
            function connectAI() {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${protocol}//${window.location.host}/ws/ai`;
                
                aiSocket = new WebSocket(wsUrl);
                
                aiSocket.onopen = function(event) {
                    document.getElementById('ai-status').textContent = 'Connected';
                    addMessage('Connected to AI WebSocket', 'success');
                };
                
                aiSocket.onmessage = function(event) {
                    const message = JSON.parse(event.data);
                    addMessage(`Received: ${JSON.stringify(message, null, 2)}`);
                };
                
                aiSocket.onclose = function(event) {
                    document.getElementById('ai-status').textContent = 'Disconnected';
                    addMessage('Disconnected from AI WebSocket', 'error');
                };
                
                aiSocket.onerror = function(error) {
                    addMessage(`WebSocket error: ${error}`, 'error');
                };
            }
            
            function disconnectAI() {
                if (aiSocket) {
                    aiSocket.close();
                    aiSocket = null;
                }
            }
            
            function sendTestChat() {
                if (!aiSocket) {
                    addMessage('Not connected to AI WebSocket', 'error');
                    return;
                }
                
                const message = {
                    type: 'chat_request',
                    data: {
                        messages: [{role: 'user', content: 'Hello! Can you tell me a short joke?'}],
                        model: 'llama3.1',
                        provider: 'ollama',
                        temperature: 0.7
                    }
                };
                
                aiSocket.send(JSON.stringify(message));
                addMessage(`Sent: ${JSON.stringify(message, null, 2)}`);
            }
            
            function sendCustomMessage() {
                if (!aiSocket) {
                    addMessage('Not connected to AI WebSocket', 'error');
                    return;
                }
                
                try {
                    const messageText = document.getElementById('custom-message').value;
                    const message = JSON.parse(messageText);
                    aiSocket.send(JSON.stringify(message));
                    addMessage(`Sent: ${JSON.stringify(message, null, 2)}`);
                } catch (e) {
                    addMessage(`Invalid JSON: ${e.message}`, 'error');
                }
            }
            
            function addMessage(text, type = '') {
                const messagesDiv = document.getElementById('messages');
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${type}`;
                messageDiv.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
                messagesDiv.appendChild(messageDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            function clearMessages() {
                document.getElementById('messages').innerHTML = '';
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


# ============================================================================
# WebSocket Middleware Integration
# ============================================================================


async def websocket_middleware(websocket: WebSocket, call_next):
    """
    WebSocket middleware for common functionality.

    Can be used for authentication, logging, rate limiting, etc.
    """
    # Log WebSocket connection
    client_host = websocket.client.host if websocket.client else "unknown"
    logger.info(f"WebSocket connection from {client_host}")

    try:
        response = await call_next(websocket)
        return response
    except Exception as e:
        logger.error(f"WebSocket middleware error: {e}")
        raise


# ============================================================================
# Background Tasks for WebSocket Health
# ============================================================================


async def websocket_health_monitor():
    """
    Background task to monitor WebSocket health and send updates.

    Should be started with the FastAPI app.
    """
    while True:
        try:
            # Check AI provider health and broadcast updates
            health_status = await ai_router.health_check_all()

            # Send health updates to status connections
            status_message = {
                "type": "health_update",
                "data": {
                    "providers": health_status,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            }
            await status_ws_manager.broadcast_status(status_message)

            # Wait 60 seconds before next check
            await asyncio.sleep(60)

        except Exception as e:
            logger.error(f"WebSocket health monitor error: {e}")
            await asyncio.sleep(60)  # Continue monitoring even on errors
