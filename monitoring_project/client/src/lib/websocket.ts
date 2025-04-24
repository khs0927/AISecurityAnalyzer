/**
 * WebSocket client module for real-time communication
 */

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // in ms
  private handlers: { [key: string]: MessageHandler[] } = {};
  private userId: number | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    
    try {
      let wsUrl = '';
      
      // 모든 환경에서 현재 페이지 프로토콜과 호스트를 사용
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log("WebSocket connecting to:", wsUrl);
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error("WebSocket connection error:", error);
      this.scheduleReconnect();
    }
  }

  private handleOpen() {
    console.log("WebSocket connection established");
    this.reconnectAttempts = 0;
    
    // Authenticate with server if userId is set
    if (this.userId) {
      this.authenticate(this.userId);
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      // Fire handlers based on message type
      if (data.type && this.handlers[data.type]) {
        this.handlers[data.type].forEach(handler => handler(data));
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log("WebSocket connection closed:", event.code, event.reason);
    
    // Only try to reconnect if it wasn't a normal closure
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event) {
    console.error("WebSocket error:", event);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${this.reconnectInterval}ms`);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error("Max reconnect attempts reached, giving up");
    }
  }

  // Public methods
  
  public authenticate(userId: number) {
    this.userId = userId;
    
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'auth',
        userId
      }));
    }
  }

  public sendECGData(data: number) {
    if (!this.userId) {
      console.error("Cannot send ECG data without authentication");
      return;
    }
    
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'ecgData',
        userId: this.userId,
        data
      }));
    }
  }

  public on(type: string, handler: MessageHandler) {
    if (!this.handlers[type]) {
      this.handlers[type] = [];
    }
    
    this.handlers[type].push(handler);
  }

  public off(type: string, handler: MessageHandler) {
    if (!this.handlers[type]) return;
    
    this.handlers[type] = this.handlers[type].filter(h => h !== handler);
  }

  public close() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Create singleton instance
export const websocketClient = new WebSocketClient();
