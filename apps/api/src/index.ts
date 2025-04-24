import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './router';
import Pusher from '@pusher/pusher';
import { prisma } from './db';

// API 서버 설정
export const createServer = () => {
  const app = express();
  app.use(cors({
    origin: ['https://nottoday.netlify.app', 'http://localhost:3000'],
    credentials: true
  }));
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('combined'));

  // tRPC 라우터 설정
  app.use('/trpc', trpcExpress.createExpressMiddleware({ 
    router: appRouter,
    createContext: () => ({ prisma })
  }));

  // 헬스체크 엔드포인트
  app.get('/healthz', async (_req, res) => {
    try {
      await prisma.$connect();
      res.json({ ok: true, env: process.env.NODE_ENV });
    } catch (error) {
      console.error('Database connection error:', error);
      res.status(500).json({ ok: false, error: 'Database connection failed' });
    }
  });

  // Pusher 클라이언트 초기화
  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID || '',
    key: process.env.PUSHER_KEY || '',
    secret: process.env.PUSHER_SECRET || '',
    cluster: process.env.PUSHER_CLUSTER || 'ap3',
    useTLS: true,
  });

  // ECG 데이터 업데이트 및 실시간 알림
  app.post('/ecg-update', async (req, res) => {
    try {
      const { userId, ecg, heartRate, oxygenLevel, riskScore } = req.body;
      
      // Supabase(Prisma)에 데이터 저장
      await prisma.healthData.create({
        data: { 
          userId, 
          ecg, 
          heartRate, 
          oxygenLevel,
          riskScore: parseFloat(riskScore)
        },
      });
      
      // Pusher로 실시간 알림 전송
      await pusher.trigger(
        `user-${userId}`, 
        'ecg-update', 
        { 
          ecg, 
          heartRate, 
          oxygenLevel,
          riskScore,
          timestamp: new Date().toISOString()
        }
      );
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in ECG update:', error);
      res.status(500).json({ success: false, error: 'Failed to process ECG data' });
    }
  });

  // 위험 알림 엔드포인트
  app.post('/risk-alert', async (req, res) => {
    try {
      const { userId, riskLevel, message } = req.body;
      
      // 위험 알림 데이터 저장
      await prisma.riskAlert.create({
        data: {
          userId,
          riskLevel,
          message,
          timestamp: new Date()
        }
      });
      
      // 실시간 알림 전송
      await pusher.trigger(
        `user-${userId}`,
        'risk-alert',
        {
          riskLevel,
          message,
          timestamp: new Date().toISOString()
        }
      );
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in risk alert:', error);
      res.status(500).json({ success: false, error: 'Failed to send risk alert' });
    }
  });

  return app;
};

// 서버 시작
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  const server = createServer().listen(PORT, () => {
    console.log(`API server running on Oracle Cloud VM: http://0.0.0.0:${PORT}`);
  });
} 