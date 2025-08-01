import type { WebSocketClientOptions } from "../types/index";

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnect: boolean;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private reconnectAttempts: number = 0;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionState: "disconnected" | "connecting" | "connected" | "reconnecting" = "disconnected";

  constructor(options: WebSocketClientOptions) {
    this.url = options.url;
    this.reconnect = options.reconnect !== false;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.connectionState === "connected" || this.connectionState === "connecting") {
      return;
    }

    this.connectionState = "connecting";

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("🔌 WebSocket connected");
          this.connectionState = "connected";
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log("🔌 WebSocket disconnected:", event.code, event.reason);
          this.connectionState = "disconnected";
          
          if (this.reconnect && !event.wasClean) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error("🔌 WebSocket error:", error);
          const wasConnecting = this.connectionState === "connecting";
          this.connectionState = "disconnected";
          
          if (wasConnecting) {
            reject(new Error("Failed to connect to WebSocket"));
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (this.connectionState === "connecting") {
            this.ws?.close();
            reject(new Error("WebSocket connection timeout"));
          }
        }, 10000);

      } catch (error) {
        this.connectionState = "disconnected";
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.reconnect = false;
    this.connectionState = "disconnected";
    
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
  }

  /**
   * Send a message to the server
   */
  send(data: any): void {
    if (this.connectionState !== "connected" || !this.ws) {
      console.warn("🔌 WebSocket not connected, cannot send message");
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error("🔌 Failed to send WebSocket message:", error);
    }
  }

  /**
   * Subscribe to specific message types
   */
  on(type: string, callback: (data: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
  }

  /**
   * Unsubscribe from message types
   */
  off(type: string, callback?: (data: any) => void): void {
    const typeListeners = this.listeners.get(type);
    if (!typeListeners) return;

    if (callback) {
      typeListeners.delete(callback);
    } else {
      typeListeners.clear();
    }

    if (typeListeners.size === 0) {
      this.listeners.delete(type);
    }
  }

  /**
   * Subscribe to index progress updates
   */
  onIndexProgress(callback: (progress: {
    completed: number;
    total: number;
    file?: string;
  }) => void): void {
    this.on("index_progress", callback);
  }

  /**
   * Subscribe to entity updates
   */
  onEntityUpdated(callback: (entity: any) => void): void {
    this.on("entity_updated", callback);
  }

  /**
   * Subscribe to analysis completion
   */
  onAnalysisComplete(callback: (analysis: any) => void): void {
    this.on("analysis_complete", callback);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === "connected";
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type) {
        this.emit(message.type, message.data);
      }

      // Also emit generic 'message' event
      this.emit("message", message);

    } catch (error) {
      console.error("🔌 Failed to parse WebSocket message:", error, event.data);
    }
  }

  private emit(type: string, data: any): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`🔌 Error in WebSocket listener for ${type}:`, error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("🔌 Max reconnection attempts reached");
      return;
    }

    this.connectionState = "reconnecting";
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`🔌 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error("🔌 Reconnection failed:", error);
        this.scheduleReconnect();
      }
    }, delay);
  }
}