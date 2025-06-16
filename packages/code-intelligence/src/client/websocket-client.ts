import type {
  IntelligenceWebSocketMessage,
  WebSocketClientOptions,
} from "../types/index";

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnect: boolean;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private reconnectAttempts = 0;
  private listeners: Map<string, Set<(data: any) => void>>;
  private connectionState: "disconnected" | "connecting" | "connected" =
    "disconnected";

  constructor(options: WebSocketClientOptions) {
    this.url = options.url;
    this.reconnect = options.reconnect !== false;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.listeners = new Map();
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (
      this.connectionState === "connected" ||
      this.connectionState === "connecting"
    ) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.connectionState = "connecting";

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.connectionState = "connected";
          this.reconnectAttempts = 0;
          this.emit("connected", {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: IntelligenceWebSocketMessage = JSON.parse(
              event.data
            );
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onclose = (event) => {
          this.connectionState = "disconnected";
          this.emit("disconnected", { code: event.code, reason: event.reason });

          if (
            this.reconnect &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.emit("error", error);

          if (this.connectionState === "connecting") {
            reject(error);
          }
        };
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

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState = "disconnected";
  }

  /**
   * Send a message to the server
   */
  send(data: any): void {
    if (this.connectionState !== "connected" || !this.ws) {
      throw new Error("WebSocket is not connected");
    }

    this.ws.send(JSON.stringify(data));
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
    if (!this.listeners.has(type)) {
      return;
    }

    if (callback) {
      this.listeners.get(type)!.delete(callback);
    } else {
      this.listeners.get(type)!.clear();
    }
  }

  /**
   * Subscribe to index progress updates
   */
  onIndexProgress(
    callback: (progress: {
      completed: number;
      total: number;
      file?: string;
    }) => void
  ): void {
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

  private handleMessage(message: IntelligenceWebSocketMessage): void {
    this.emit(message.type, message.data);
  }

  private emit(type: string, data: any): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket callback for type ${type}:`, error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;

    setTimeout(
      () => {
        if (this.reconnect && this.connectionState === "disconnected") {
          console.log(
            `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
          );
          this.connect().catch((error) => {
            console.error("Reconnection failed:", error);
          });
        }
      },
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    );
  }
}
