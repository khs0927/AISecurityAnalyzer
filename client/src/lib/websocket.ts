/**
 * WebSocket client module for real-time communication
 */

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // 재연결 시도 횟수 증가
  private reconnectInterval = 3000; // in ms
  private handlers: { [key: string]: MessageHandler[] } = {};
  private userId: number | null = null;

  constructor() {
    this.connect();
    
    // 페이지가 새로 로드되었을 때 재연결 시도
    window.addEventListener('load', () => {
      console.log('Window loaded, attempting to connect WebSocket');
      this.reconnectAttempts = 0;
      this.connect();
    });
    
    // 페이지가 보일 때 (사용자가 다른 탭에서 돌아왔을 때) 재연결 시도
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && 
          (!this.socket || this.socket.readyState !== WebSocket.OPEN)) {
        console.log('Page visibility changed to visible, checking WebSocket connection');
        this.reconnectAttempts = 0;
        this.connect();
      }
    });
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
    this.reconnectAttempts++;
    const interval = this.reconnectAttempts < this.maxReconnectAttempts ? 
      this.reconnectInterval : 
      this.reconnectInterval * 2; // 최대 시도 횟수를 초과하면 간격 늘림
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${interval}ms`);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, interval);
    
    // 최대 시도 횟수에 도달하면 경고 로그만 출력하고 계속 시도
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("Max reconnect attempts reached, but will keep trying with longer intervals");
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
