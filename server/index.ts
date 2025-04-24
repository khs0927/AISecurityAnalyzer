import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Pusher from 'pusher';
import { createClient } from '@supabase/supabase-js';
import healthRoutes from './routes/health';

// 환경 변수 로드
dotenv.config();

// 필수 환경 변수 확인
const requiredEnvVars = [
  'PUSHER_APP_ID',
  'PUSHER_KEY',
  'PUSHER_SECRET',
  'PUSHER_CLUSTER',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`오류: 필수 환경 변수 ${varName}이(가) 설정되지 않았습니다.`);
    // 서버리스 환경에서는 프로세스 종료를 사용하지 않음
    // process.exit(1);
  }
});

// Pusher 인스턴스 생성
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || '',
  useTLS: true
});

// Supabase 클라이언트 생성
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// Express 앱 초기화
const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우트 설정
app.get('/', (req, res) => {
  res.json({ message: 'NotToday Medical-AI-Agent API 서버', version: '1.0.0' });
});

// 서버리스 환경 체크 라우트
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 헬스 라우트 추가
app.use('/api/health', healthRoutes);

// Pusher 인증 엔드포인트
app.post('/pusher/auth', (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  const auth = pusher.authorizeChannel(socketId, channel);
  res.send(auth);
});

// 서버리스 환경에서는 직접 app.listen을 호출하지 않음
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`개발 서버가 실행 중입니다: http://localhost:${PORT}`);
  });
}

// 서버리스 환경을 위한 내보내기
export default app;
