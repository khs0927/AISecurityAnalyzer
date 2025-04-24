import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertHealthDataSchema, 
  insertEcgRecordingSchema,
  insertGuardianRelationshipSchema, 
  insertAlertSchema,
  insertAiConsultationSchema,
  insertEmergencyContactSchema,
  insertMedicationSchema,
  insertDailyReportSchema,
  insertAiAnalysisSchema,
  insertEmergencyEventSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { generateHealthConsultationResponse, analyzeECGData, analyzeHealthRisk } from "./aiModels";
import mobileApiRouter from "./mobileApi";

// Websocket clients mapping
type Client = {
  ws: WebSocket;
  userId?: number;
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients: Client[] = [];

  // 스마트워치 연결 상태 확인을 위한 엔드포인트
  app.get('/api/connection-status', (req, res) => {
    const status = {
      server: true,
      websocket: wss.clients.size > 0,
      serverTime: new Date().toISOString(),
      connections: wss.clients.size,
      url: req.protocol + '://' + req.get('host')
    };
    
    res.json(status);
  });

  // 정적 파일 서빙을 위한 라우트 설정
  app.use('/static', express.static('static'));
  
  // Expo 연결 페이지 접근을 위한 리다이렉트
  app.get('/connect', (req, res) => {
    res.redirect('/static/heart-care-connection.html');
  });
  
  // 디버그 페이지 접근을 위한 리다이렉트
  app.get('/debug', (req, res) => {
    res.redirect('/static/heart-care-debug.html');
  });

  // 스마트워치 연결 API 엔드포인트 추가
  app.get('/api/users/:userId/smartwatch-connections', async (req, res) => {
    // 데모를 위한 스마트워치 연결 정보 반환
    res.json([
      {
        id: '1',
        type: 'apple',
        name: 'Apple Watch',
        model: 'Series 7',
        batteryLevel: 78,
        firmwareVersion: '8.5.1',
        lastSynced: new Date().toISOString(),
        connected: true,
        updateAvailable: true
      }
    ]);
  });

  wss.on('connection', (ws) => {
    console.log("[WebSocket] New client connected");
    const client: Client = { ws };
    clients.push(client);

    // 연결 확인 메시지 전송
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      message: '서버에 연결되었습니다',
      time: new Date().toISOString()
    }));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("[WebSocket] Received message:", data);
        
        // Handle authentication
        if (data.type === 'auth') {
          client.userId = parseInt(data.userId);
          console.log(`[WebSocket] Client authenticated as user ${client.userId}`);
          
          // 인증 성공 응답
          ws.send(JSON.stringify({
            type: 'auth',
            status: 'success',
            userId: client.userId
          }));
        }
        
        // Handle ping message
        if (data.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            time: new Date().toISOString()
          }));
        }
        
        // Handle ECG data streaming
        if (data.type === 'ecgData' && client.userId) {
          // Broadcast to guardians watching this user
          const relationships = await storage.getGuardianRelationshipsByUserId(client.userId);
          const guardianIds = relationships.map(rel => rel.guardianId);
          
          // Find guardian clients
          clients.forEach(guardianClient => {
            if (guardianClient.userId && guardianIds.includes(guardianClient.userId) && 
                guardianClient.ws.readyState === WebSocket.OPEN) {
              guardianClient.ws.send(JSON.stringify({
                type: 'ecgUpdate',
                userId: client.userId,
                data: data.data
              }));
            }
          });
        }
      } catch (error) {
        console.error('[WebSocket] Message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: '메시지 처리 중 오류가 발생했습니다'
        }));
      }
    });

    ws.on('close', () => {
      console.log("[WebSocket] Client disconnected");
      const index = clients.findIndex(c => c.ws === ws);
      if (index !== -1) {
        clients.splice(index, 1);
      }
    });
    
    // 에러 처리
    ws.on('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });
  });

  // 주기적으로 모든 클라이언트에게 핑 메시지 전송 (연결 유지)
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'ping',
          time: new Date().toISOString()
        }));
      }
    });
  }, 30000); // 30초마다

  // Broadcast to specific user
  const broadcastToUser = (userId: number, data: any) => {
    clients.forEach(client => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    });
  };

  // Broadcast to guardians of a user
  const broadcastToGuardians = async (userId: number, data: any) => {
    const relationships = await storage.getGuardianRelationshipsByUserId(userId);
    const guardianIds = relationships.map(rel => rel.guardianId);
    
    clients.forEach(client => {
      if (client.userId && guardianIds.includes(client.userId) && 
          client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    });
  };

  // 기존 라우트들 유지...

  return httpServer;
}