import express, { type Express } from 'express';
import http from 'http'; // Keep for potential other uses, but server creation might change
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Pusher from 'pusher';
import { createClient } from '@supabase/supabase-js';

import config, { initializeConfig } from './config';
import healthRoutes from './routes/health';
import ecgRoutes from './routes/ecg';
import analyticsRoutes from './routes/analysis';
import userRoutes from './routes/user';
import authRoutes from './routes/auth';
import apiRoutes from './routes';
// import { setupSocketIO } from './socketio'; // Socket.IO needs different setup in serverless
// import { setupVite, serveStatic, log } from './utils/vite'; // Vite/Static serving handled by Netlify

// ESM에서 __dirname 사용하기 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드 (Consider Netlify Environment Variables)
dotenv.config({ path: path.resolve(__dirname, '../.env') }); 

// 서버 설정 초기화
initializeConfig();

export const app: Express = express(); // Export the app instance
// const server = http.createServer(app); // Server creation handled by serverless-http

// setupSocketIO(server); // Needs specific serverless adapter if used

// ─── 미들웨어 ────────────────────────────────────────────────
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Adjust for Netlify if needed
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'", "https://*", "wss://*"] // Ensure Netlify function URL is allowed if CORS needed
    }
  }
}));
app.use(morgan(config.server.isDevelopment ? 'dev' : 'combined'));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// 업로드 디렉토리 설정 (This might need adjustment for serverless ephemeral storage)
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── 라우트 ──────────────────────────────────────────────────
const apiPrefix = config.server.apiPrefix ?? '/api';
app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/ecg`, ecgRoutes);
app.use(`${apiPrefix}/analytics`, analyticsRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(apiPrefix, apiRoutes);

// ─── 정적/개발 서버 (REMOVED for Netlify Functions) ────────────────
/*
if (config.server.isDevelopment) {
  setupVite(app, server)
    .then(() => log('Vite 개발 서버가 연결되었습니다', 'vite'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  serveStatic(app);
}
*/

// 404 처리 - (REMOVED - Handled by Netlify redirects)
/*
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/public/index.html'));
});
*/

// ─── 서버 시작 (REMOVED for Netlify Functions) ───────────────
/*
const PORT = config.server.port ?? 3000;
server.listen(PORT, () => {
  log(`서버가 http://localhost:${PORT} 에서 실행 중입니다`, 'server');
});
*/

// Pusher 인스턴스 생성 (Should work if env vars are set in Netlify)
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || '',
  useTLS: true
});

// Supabase 클라이언트 생성 (Should work if env vars are set in Netlify)
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// export default server; // Export 'app' instead if needed by handler
