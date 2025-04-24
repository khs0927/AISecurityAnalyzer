import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';

// 웹소켓 메시지 타입 정의
const WebSocketMessageSchema = z.object({
  type: z.enum(['ping', 'health_data', 'alert', 'connection_status']),
  payload: z.any().optional(),
  timestamp: z.number().optional()
});

type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

// 클라이언트 관리를 위한 맵
interface ClientInfo {
  ws: WebSocket;
  userId?: number;
  deviceId?: string;
  userAgent?: string;
  lastActive: number;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    // 웹소켓 서버 생성 (Vite HMR과 충돌하지 않는 경로 사용)
    this.wss = new WebSocketServer({ server, path: '/ws' });
    console.log('[WebSocket] 서버 초기화됨');
    
    this.setupListeners();
    this.setupPingInterval();
  }
  
  private setupListeners() {
    // 연결 이벤트 리스너
    this.wss.on('connection', (ws, req) => {
      console.log(`[WebSocket] 새 클라이언트 연결: ${req.socket.remoteAddress}`);
      
      // 클라이언트 정보 저장
      this.clients.set(ws, {
        ws,
        userAgent: req.headers['user-agent'],
        lastActive: Date.now()
      });
      
      // 연결 성공 메시지 전송
      this.sendToClient(ws, {
        type: 'connection_status',
        payload: { status: 'connected', message: '웹소켓 서버에 연결되었습니다.' },
        timestamp: Date.now()
      });
      
      // 메시지 이벤트 리스너
      ws.on('message', (data) => {
        this.handleMessage(ws, data);
      });
      
      // 연결 종료 이벤트 리스너
      ws.on('close', () => {
        console.log('[WebSocket] 클라이언트 연결 종료');
        this.clients.delete(ws);
      });
      
      // 에러 이벤트 리스너
      ws.on('error', (error) => {
        console.error('[WebSocket] 에러:', error);
      });
    });
  }
  
  private setupPingInterval() {
    // 주기적으로 연결 상태 확인 (30초 간격)
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          const clientInfo = this.clients.get(client);
          if (clientInfo) {
            // 마지막 활동 시간이 2분 이상 지났으면 연결 종료
            const inactiveTime = Date.now() - clientInfo.lastActive;
            if (inactiveTime > 2 * 60 * 1000) {
              console.log('[WebSocket] 비활성 클라이언트 연결 종료');
              client.terminate();
              this.clients.delete(client);
              return;
            }
            
            // 핑 메시지 전송
            this.sendToClient(client, {
              type: 'ping',
              timestamp: Date.now()
            });
          }
        }
      });
    }, 30000);
  }
  
  private handleMessage(ws: WebSocket, data: WebSocket.Data) {
    try {
      // JSON 파싱
      const message = JSON.parse(data.toString());
      console.log(`[WebSocket] 메시지 수신:`, message);
      
      // 메시지 유효성 검증
      const result = WebSocketMessageSchema.safeParse(message);
      if (!result.success) {
        console.error('[WebSocket] 잘못된 메시지 형식:', result.error);
        this.sendToClient(ws, {
          type: 'alert',
          payload: { error: '잘못된 메시지 형식' },
          timestamp: Date.now()
        });
        return;
      }
      
      // 클라이언트 활동 시간 업데이트
      const clientInfo = this.clients.get(ws);
      if (clientInfo) {
        clientInfo.lastActive = Date.now();
        
        // 사용자 ID가 메시지에 있으면 저장
        if (message.payload?.userId) {
          clientInfo.userId = message.payload.userId;
        }
        
        // 기기 ID가 메시지에 있으면 저장
        if (message.payload?.deviceId) {
          clientInfo.deviceId = message.payload.deviceId;
        }
      }
      
      // 메시지 타입에 따른 처리
      switch (message.type) {
        case 'ping':
          // 핑 응답
          this.sendToClient(ws, {
            type: 'ping',
            payload: { pong: true },
            timestamp: Date.now()
          });
          break;
          
        case 'health_data':
          // 건강 데이터 수신 시 모든 관련 클라이언트에게 브로드캐스트
          if (message.payload?.userId) {
            this.broadcastToUser(message.payload.userId, message);
          }
          break;
          
        case 'alert':
          // 알림 메시지 처리
          if (message.payload?.userId) {
            this.broadcastToUser(message.payload.userId, message);
          }
          break;
          
        default:
          console.log(`[WebSocket] 처리되지 않은 메시지 타입: ${message.type}`);
      }
      
    } catch (error) {
      console.error('[WebSocket] 메시지 처리 중 오류:', error);
      this.sendToClient(ws, {
        type: 'alert',
        payload: { error: '메시지 처리 중 오류가 발생했습니다' },
        timestamp: Date.now()
      });
    }
  }
  
  // 특정 클라이언트에게 메시지 전송
  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[WebSocket] 메시지 전송 중 오류:', error);
      }
    }
  }
  
  // 특정 사용자에게 연결된 모든 클라이언트에게 메시지 브로드캐스트
  private broadcastToUser(userId: number, message: WebSocketMessage) {
    this.clients.forEach((clientInfo) => {
      if (clientInfo.userId === userId && clientInfo.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(clientInfo.ws, message);
      }
    });
  }
  
  // 모든 클라이언트에게 메시지 브로드캐스트
  public broadcast(message: WebSocketMessage) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
      }
    });
  }
  
  // 웹소켓 서버 정리
  public cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.wss.clients.forEach((client) => {
      client.terminate();
    });
    
    this.clients.clear();
  }
}

export default WebSocketManager;