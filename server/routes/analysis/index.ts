import express from 'express';
import healthRouter from './health';
import consultationRouter from './consultation';

const router = express.Router();

// 건강 데이터 분석
router.use('/health', healthRouter);

// 상담 관련 분석
router.use('/consultation', consultationRouter);

// 위험도 분석 라우터 (ai_analysis.ts의 기능을 이 라우터로 통합)
router.use('/risk', (req, res, next) => {
  // 기존 ai_analysis.ts 라우터로 요청 전달
  req.url = '/risk' + (req.url === '/' ? '' : req.url);
  // ai_analysis 라우터 호출
  require('../ai_analysis').default(req, res, next);
});

export default router;