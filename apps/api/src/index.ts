import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as trpcExpress from '@trpc/server/adapters/express'; // Express 어댑터 사용
import Pusher from 'pusher';
import serverless from 'serverless-http'; // serverless-http import
import { prisma } from './db';

// --- tRPC 라우터 정의 (가정) --- 
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.context<{ prisma: typeof prisma }>().create();

const appRouter = t.router({
  healthz: t.procedure.query(async ({ ctx }) => {
    try {
       await ctx.prisma.$connect();
       return { ok: true, env: process.env.NODE_ENV };
    } catch (error) {
      // 에러 처리: Prisma 연결 실패 시에도 응답 반환
      console.error("Prisma connection failed in healthz:", error);
      // 실제 배포 환경에서는 에러 상세 내용은 숨기는 것이 좋음
      return { ok: false, error: "Database connection failed", details: (error as Error).message }; 
    }
  }),
  // 다른 tRPC 라우트...
});

export type AppRouter = typeof appRouter;
// --- tRPC 라우터 정의 끝 --- 

// --- Express 앱 설정 --- 
const app = express();
app.use(cors({
  // Netlify 함수 URL 및 로컬 개발 환경 허용 (필요시 조정)
  origin: [process.env.NODE_ENV === 'production' ? 'https://your-netlify-site-url.netlify.app' : 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// --- tRPC 미들웨어 적용 ---
app.use('/trpc', trpcExpress.createExpressMiddleware({ 
  router: appRouter,
  createContext: () => ({ prisma })
}));

// --- Pusher 설정 --- 
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'ap3',
  useTLS: true,
});

// --- 추가 엔드포인트 --- 
app.post('/ecg-update', async (req, res) => {
  // ... (기존 로직)
});
app.post('/risk-alert', async (req, res) => {
  // ... (기존 로직)
});

// --- Netlify 핸들러 생성 (serverless-http 사용) --- 
export const handler = serverless(app);

// --- 로컬 개발용 서버 시작 (Netlify 배포 시에는 사용되지 않음) --- 
if (process.env.NODE_ENV === 'development') {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Local API server running: http://localhost:${PORT}`);
  });
}
