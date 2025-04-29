import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createNetlifyHandler } from '@trpc/server/adapters/netlify'; // Netlify 어댑터 import
import Pusher from 'pusher';
import { prisma } from './db';

// --- tRPC 라우터 정의 (가정) --- 
// 실제 라우터 정의가 필요합니다. 예를 들어:
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.context<{ prisma: typeof prisma }>().create();

const appRouter = t.router({
  healthz: t.procedure.query(async ({ ctx }) => {
    await ctx.prisma.$connect();
    return { ok: true, env: process.env.NODE_ENV };
  }),
  // 다른 tRPC 라우트...
});

export type AppRouter = typeof appRouter;
// --- tRPC 라우터 정의 끝 --- 

// --- Express 앱 설정 (tRPC 미들웨어 외 다른 엔드포인트용) ---
const app = express();
app.use(cors({
  origin: ['https://nottoday.netlify.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// --- Pusher 설정 --- 
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'ap3',
  useTLS: true,
});

// --- 추가 엔드포인트 (예: Pusher 웹훅, Express 경로) ---
app.post('/ecg-update', async (req, res) => {
  // ... (기존 로직)
});
app.post('/risk-alert', async (req, res) => {
  // ... (기존 로직)
});

// --- Netlify 핸들러 생성 --- 
// tRPC 요청을 처리하고, 나머지 요청은 Express 앱으로 전달
export const handler = createNetlifyHandler({
  router: appRouter,
  createContext: () => ({ prisma }),
  // Express 앱을 fallback으로 사용 (선택적)
  // expressApp: app 
});

// --- 로컬 개발용 서버 시작 (Netlify 배포 시에는 사용되지 않음) --- 
if (process.env.NODE_ENV === 'development') {
  const PORT = process.env.PORT || 8080;
  // 로컬에서는 tRPC 미들웨어와 다른 라우트를 함께 사용
  app.use('/trpc', trpcExpress.createExpressMiddleware({ 
    router: appRouter,
    createContext: () => ({ prisma })
  }));
  app.listen(PORT, () => {
    console.log(`Local API server running: http://localhost:${PORT}`);
  });
}
