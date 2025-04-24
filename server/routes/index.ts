import { Router } from 'express';
import healthRoutes from './health';
import ecgRoutes from './ecg';
import authRoutes from './auth';
import userRoutes from './user';
import analysisRoutes from './analysis';

const router = Router();

// API 정보 엔드포인트
router.get('/', (req, res) => {
  res.json({
    name: 'NotToday Healthcare API',
    version: '1.0.0',
    endpoints: {
      '/health': '건강 데이터 관련 엔드포인트',
      '/ecg': 'ECG 데이터 관련 엔드포인트',
      '/auth': '인증 관련 엔드포인트',
      '/users': '사용자 관련 엔드포인트',
      '/analysis': '데이터 분석 관련 엔드포인트'
    }
  });
});

// 각 라우터 마운트
router.use('/health', healthRoutes);
router.use('/ecg', ecgRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/analysis', analysisRoutes);

export default router;