import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from './config';
import { log } from './utils/vite';

interface UserSocket extends Socket {
  userId?: string;
  deviceId?: string;
}

// 사용자 소켓 관리
const connectedUsers = new Map<string, UserSocket>();
const connectedDevices = new Map<string, UserSocket>();

// Socket.IO 서버 인스턴스
let io: Server;

// Socket.IO 서버 설정
export function setupSocketIO(server: HTTPServer): Server {
  io = new Server(server, {
    cors: {
      origin: '*', // 실제 배포 시 특정 도메인으로 제한
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: config.websocket.path
  });

  // 인증 미들웨어
  io.use((socket: UserSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      // 디바이스 연결 처리 (토큰 없이 디바이스 ID로만 연결)
      if (socket.handshake.auth.deviceId) {
        socket.deviceId = socket.handshake.auth.deviceId;
        return next();
      }
      
      // 토큰 검증
      if (!token) {
        return next(new Error('인증 토큰이 필요합니다'));
      }

      const decoded = jwt.verify(token, config.server.jwtSecret) as { sub: string };
      socket.userId = decoded.sub;
      next();
    } catch (error) {
      log(`소켓 인증 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error');
      next(new Error('인증 실패'));
    }
  });

  // 연결 이벤트
  io.on('connection', (socket: UserSocket) => {
    if (socket.userId) {
      // 사용자 연결 처리
      connectedUsers.set(socket.userId, socket);
      log(`사용자 연결: ${socket.userId}`, 'info');
      
      // 사용자별 룸 조인
      socket.join(`user:${socket.userId}`);
      
      // 연결 성공 이벤트
      socket.emit('connection:success', { userId: socket.userId });
      
      // 헬스 데이터 이벤트 처리
      socket.on('health:data', (data) => {
        handleHealthData(socket.userId as string, data);
      });
      
      // 알림 구독
      socket.on('notifications:subscribe', () => {
        socket.join(`notifications:${socket.userId}`);
      });
      
      // 연결 해제 처리
      socket.on('disconnect', () => {
        if (socket.userId) {
          connectedUsers.delete(socket.userId);
          log(`사용자 연결 해제: ${socket.userId}`, 'info');
        }
      });
    } else if (socket.deviceId) {
      // 디바이스 연결 처리
      connectedDevices.set(socket.deviceId, socket);
      log(`디바이스 연결: ${socket.deviceId}`, 'info');
      
      // 디바이스별 룸 조인
      socket.join(`device:${socket.deviceId}`);
      
      // 연결 성공 이벤트
      socket.emit('device:connected', { deviceId: socket.deviceId });
      
      // 디바이스 데이터 이벤트 처리
      socket.on('device:data', (data) => {
        handleDeviceData(socket.deviceId as string, data);
      });
      
      // 연결 해제 처리
      socket.on('disconnect', () => {
        if (socket.deviceId) {
          connectedDevices.delete(socket.deviceId);
          log(`디바이스 연결 해제: ${socket.deviceId}`, 'info');
        }
      });
    }
  });

  log('Socket.IO 서버가 초기화되었습니다', 'success');
  return io;
}

// 소켓 서버 인스턴스 가져오기
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO 서버가 초기화되지 않았습니다');
  }
  return io;
}

// 사용자에게 알림 전송
export function sendNotification(userId: string, notification: any): void {
  try {
    io.to(`user:${userId}`).emit('notification', notification);
    log(`사용자 ${userId}에게 알림 전송`, 'info');
  } catch (error) {
    log(`알림 전송 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error');
  }
}

// 특정 사용자에게 건강 경고 전송
export function sendHealthAlert(userId: string, alert: any): void {
  try {
    io.to(`user:${userId}`).emit('health:alert', alert);
    log(`사용자 ${userId}에게 건강 경고 전송`, 'info');
  } catch (error) {
    log(`건강 경고 전송 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error');
  }
}

// 디바이스 명령 전송
export function sendDeviceCommand(deviceId: string, command: any): void {
  try {
    io.to(`device:${deviceId}`).emit('device:command', command);
    log(`디바이스 ${deviceId}에 명령 전송`, 'info');
  } catch (error) {
    log(`디바이스 명령 전송 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error');
  }
}

// 헬스 데이터 처리 함수
async function handleHealthData(userId: string, data: any): Promise<void> {
  try {
    // 여기서 데이터 검증 및 DB 저장 로직 구현
    log(`사용자 ${userId}로부터 건강 데이터 수신`, 'info');
    
    // 위험 감지 시 알림 전송 예시
    if (data.risk && data.risk.level > 3) {
      sendHealthAlert(userId, {
        type: 'risk_detected',
        level: data.risk.level,
        message: '건강 위험이 감지되었습니다. 의사와 상담하세요.',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    log(`건강 데이터 처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error');
  }
}

// 디바이스 데이터 처리 함수
async function handleDeviceData(deviceId: string, data: any): Promise<void> {
  try {
    // 여기서 디바이스 데이터 처리 로직 구현
    log(`디바이스 ${deviceId}로부터 데이터 수신`, 'info');
    
    // 연결된 사용자에게 데이터 전달 예시
    if (data.userId && connectedUsers.has(data.userId)) {
      io.to(`user:${data.userId}`).emit('device:update', {
        deviceId,
        data,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    log(`디바이스 데이터 처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error');
  }
}

// 연결된 모든 사용자에게 브로드캐스트
export function broadcastToAllUsers(event: string, data: any): void {
  io.emit(event, data);
}

// 연결된 사용자 수 가져오기
export function getConnectedUsersCount(): number {
  return connectedUsers.size;
}

// 연결된 디바이스 수 가져오기
export function getConnectedDevicesCount(): number {
  return connectedDevices.size;
} 