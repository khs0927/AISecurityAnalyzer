import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { monitoring } from '../utils/monitoring';

interface SocketClient {
  id: string;
  socket: Socket;
  userId?: number;
  metadata?: Record<string, any>;
  lastActivity: Date;
  rooms: Set<string>;
}

export interface EmitOptions {
  event: string;
  data: any;
  to?: string | string[]; // 사용자 ID 또는 룸 이름
  except?: string; // 제외할 소켓 ID
}

/**
 * 웹소켓 연결 및 이벤트를 관리하는 클래스
 */
export class SocketManager {
  private static instance: SocketManager;
  private io: SocketIOServer | null = null;
  private clients: Map<string, SocketClient> = new Map();
  private userIdToSocketIds: Map<number, Set<string>> = new Map();
  
  private constructor() {}
  
  /**
   * SocketManager 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }
  
  /**
   * Socket.IO 서버를 초기화합니다
   * @param server HTTP 서버
   * @param options Socket.IO 옵션
   */
  public initialize(server: Server, options: any = {}): void {
    if (this.io) {
      monitoring.log('system', 'warn', 'Socket.IO 서버가 이미 초기화되었습니다');
      return;
    }
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      ...options
    });
    
    this.setupConnectionHandlers();
    monitoring.log('system', 'info', 'Socket.IO 서버 초기화 완료');
  }
  
  /**
   * Socket.IO 서버 인스턴스를 반환합니다
   */
  public getIO(): SocketIOServer | null {
    return this.io;
  }
  
  /**
   * 연결 핸들러를 설정합니다
   */
  private setupConnectionHandlers(): void {
    if (!this.io) return;
    
    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.id;
      
      // 클라이언트 정보 저장
      this.clients.set(clientId, {
        id: clientId,
        socket,
        lastActivity: new Date(),
        rooms: new Set()
      });
      
      monitoring.log('system', 'info', `웹소켓 클라이언트 연결: ${clientId}`);
      
      // 인증 이벤트 핸들러
      socket.on('authenticate', (data: { userId: number, token: string }) => {
        this.authenticateClient(clientId, data);
      });
      
      // 연결 해제 이벤트 핸들러
      socket.on('disconnect', () => {
        this.handleDisconnect(clientId);
      });
      
      // 방 참가 이벤트 핸들러
      socket.on('join', (roomName: string) => {
        this.joinRoom(clientId, roomName);
      });
      
      // 방 퇴장 이벤트 핸들러
      socket.on('leave', (roomName: string) => {
        this.leaveRoom(clientId, roomName);
      });
      
      // 메타데이터 업데이트 이벤트 핸들러
      socket.on('metadata', (metadata: Record<string, any>) => {
        this.updateClientMetadata(clientId, metadata);
      });
      
      // 활동 업데이트 이벤트 핸들러
      socket.on('activity', () => {
        this.updateClientActivity(clientId);
      });
    });
  }
  
  /**
   * 클라이언트를 인증합니다
   * @param clientId 클라이언트 ID
   * @param data 인증 데이터
   */
  private authenticateClient(clientId: string, data: { userId: number, token: string }): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // 토큰 검증은 실제 구현에서 추가해야 함
    // 여기서는 간단히 userId만 설정
    client.userId = data.userId;
    
    // 사용자 ID와 소켓 ID 매핑 업데이트
    if (!this.userIdToSocketIds.has(data.userId)) {
      this.userIdToSocketIds.set(data.userId, new Set<string>());
    }
    this.userIdToSocketIds.get(data.userId)?.add(clientId);
    
    // 인증 성공 응답
    client.socket.emit('authenticate_success', { 
      userId: data.userId,
      socketId: clientId
    });
    
    monitoring.log('system', 'info', `클라이언트 인증 완료: ${clientId}, 사용자 ID: ${data.userId}`);
  }
  
  /**
   * 클라이언트 연결 해제를 처리합니다
   * @param clientId 클라이언트 ID
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // 사용자 ID와 소켓 ID 매핑 업데이트
    if (client.userId) {
      const socketIds = this.userIdToSocketIds.get(client.userId);
      if (socketIds) {
        socketIds.delete(clientId);
        if (socketIds.size === 0) {
          this.userIdToSocketIds.delete(client.userId);
        }
      }
    }
    
    // 클라이언트 정보 삭제
    this.clients.delete(clientId);
    
    monitoring.log('system', 'info', `웹소켓 클라이언트 연결 해제: ${clientId}`);
  }
  
  /**
   * 클라이언트를 방에 참가시킵니다
   * @param clientId 클라이언트 ID
   * @param roomName 방 이름
   */
  public joinRoom(clientId: string, roomName: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.socket.join(roomName);
    client.rooms.add(roomName);
    
    monitoring.log('system', 'info', `클라이언트 ${clientId}가 방 ${roomName}에 참가`);
  }
  
  /**
   * 클라이언트를 방에서 퇴장시킵니다
   * @param clientId 클라이언트 ID
   * @param roomName 방 이름
   */
  public leaveRoom(clientId: string, roomName: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.socket.leave(roomName);
    client.rooms.delete(roomName);
    
    monitoring.log('system', 'info', `클라이언트 ${clientId}가 방 ${roomName}에서 퇴장`);
  }
  
  /**
   * 클라이언트 메타데이터를 업데이트합니다
   * @param clientId 클라이언트 ID
   * @param metadata 메타데이터
   */
  public updateClientMetadata(clientId: string, metadata: Record<string, any>): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.metadata = { ...client.metadata, ...metadata };
    this.updateClientActivity(clientId);
  }
  
  /**
   * 클라이언트의 마지막 활동 시간을 업데이트합니다
   * @param clientId 클라이언트 ID
   */
  public updateClientActivity(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.lastActivity = new Date();
  }
  
  /**
   * 메시지를 보냅니다
   * @param options 이벤트 옵션
   */
  public emit(options: EmitOptions): void {
    if (!this.io) {
      monitoring.log('system', 'error', 'Socket.IO 서버가 초기화되지 않았습니다');
      return;
    }
    
    const { event, data, to, except } = options;
    
    if (to) {
      // 특정 사용자 또는 룸에 이벤트 전송
      if (Array.isArray(to)) {
        // 여러 대상에 전송
        to.forEach(target => {
          if (this.isUserId(target)) {
            // 사용자 ID로 전송
            this.emitToUser(target, event, data, except);
          } else {
            // 룸 이름으로 전송
            this.io?.to(target).emit(event, data);
          }
        });
      } else {
        // 단일 대상에 전송
        if (this.isUserId(to)) {
          // 사용자 ID로 전송
          this.emitToUser(to, event, data, except);
        } else {
          // 룸 이름으로 전송
          this.io?.to(to).emit(event, data);
        }
      }
    } else {
      // 모든 클라이언트에 이벤트 전송
      this.io.emit(event, data);
    }
  }
  
  /**
   * 특정 사용자에게 메시지를 보냅니다
   * @param userId 사용자 ID
   * @param event 이벤트 이름
   * @param data 이벤트 데이터
   * @param except 제외할 소켓 ID
   */
  private emitToUser(userId: string, event: string, data: any, except?: string): void {
    const userIdNum = parseInt(userId, 10);
    const socketIds = this.userIdToSocketIds.get(userIdNum);
    
    if (!socketIds || socketIds.size === 0) {
      monitoring.log('system', 'warn', `사용자 ID ${userId}에 대한 연결된 클라이언트가 없습니다`);
      return;
    }
    
    socketIds.forEach(socketId => {
      if (socketId !== except) {
        const client = this.clients.get(socketId);
        client?.socket.emit(event, data);
      }
    });
  }
  
  /**
   * 문자열이 사용자 ID인지 확인합니다 (숫자인 경우)
   * @param str 확인할 문자열
   */
  private isUserId(str: string): boolean {
    return !isNaN(parseInt(str, 10));
  }
  
  /**
   * 특정 룸의 모든 클라이언트 정보를 가져옵니다
   * @param roomName 룸 이름
   */
  public getClientsInRoom(roomName: string): SocketClient[] {
    const result: SocketClient[] = [];
    
    this.clients.forEach(client => {
      if (client.rooms.has(roomName)) {
        result.push({ ...client });
      }
    });
    
    return result;
  }
  
  /**
   * 특정 사용자의 모든 클라이언트 정보를 가져옵니다
   * @param userId 사용자 ID
   */
  public getClientsByUserId(userId: number): SocketClient[] {
    const result: SocketClient[] = [];
    const socketIds = this.userIdToSocketIds.get(userId);
    
    if (socketIds) {
      socketIds.forEach(socketId => {
        const client = this.clients.get(socketId);
        if (client) {
          result.push({ ...client });
        }
      });
    }
    
    return result;
  }
  
  /**
   * 비활성 클라이언트를 정리합니다
   * @param inactiveMinutes 비활성으로 간주할 시간(분)
   */
  public cleanupInactiveClients(inactiveMinutes: number = 30): number {
    const now = new Date();
    const inactiveThreshold = inactiveMinutes * 60 * 1000; // 분 -> 밀리초
    let disconnectedCount = 0;
    
    this.clients.forEach((client, clientId) => {
      const inactiveTime = now.getTime() - client.lastActivity.getTime();
      
      if (inactiveTime > inactiveThreshold) {
        // 클라이언트 연결 종료
        client.socket.disconnect(true);
        disconnectedCount++;
        
        monitoring.log('system', 'info', `비활성 클라이언트 정리: ${clientId}, 비활성 시간: ${Math.round(inactiveTime / 60000)}분`);
      }
    });
    
    return disconnectedCount;
  }
  
  /**
   * 연결된 클라이언트 수를 반환합니다
   */
  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
  
  /**
   * 인증된 클라이언트 수를 반환합니다
   */
  public getAuthenticatedClientsCount(): number {
    let count = 0;
    
    this.clients.forEach(client => {
      if (client.userId !== undefined) {
        count++;
      }
    });
    
    return count;
  }
  
  /**
   * 소켓 매니저 상태 통계를 가져옵니다
   */
  public getStats(): Record<string, any> {
    return {
      totalConnections: this.clients.size,
      authenticatedConnections: this.getAuthenticatedClientsCount(),
      uniqueUsers: this.userIdToSocketIds.size,
      roomsCount: this.getUniqueRoomsCount()
    };
  }
  
  /**
   * 고유한 룸 개수를 가져옵니다
   */
  private getUniqueRoomsCount(): number {
    const rooms = new Set<string>();
    
    this.clients.forEach(client => {
      client.rooms.forEach(room => {
        rooms.add(room);
      });
    });
    
    return rooms.size;
  }
}

// 싱글톤 인스턴스 생성
export const socketManager = SocketManager.getInstance(); 