import { Router } from 'express';
import consultationRouter from './consultation';
import healthRouter from './health';

const router = Router();

// 하위 경로 라우터 등록
router.use('/consultation', consultationRouter);
router.use('/health', healthRouter);

export default router;