import { Router } from "express";
import aiRouter from "./ai";
import securityAnalysisRouter from "./security_analysis";
import aiAnalysisRouter from "./ai_analysis";
import agentRouter from './agent';
import analysisRouter from './analysis';

const router = Router();

// API 라우트 설정
router.use("/ai", aiRouter);
router.use("/security", securityAnalysisRouter);
router.use("/ai-analysis", aiAnalysisRouter); // 기존 라우터 유지 (레거시 지원)
router.use("/analysis", analysisRouter); // 새로운 통합 분석 라우터
router.use('/agent', agentRouter);

export default router;