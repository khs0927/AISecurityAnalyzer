import express from 'express';
import { securityAnalyzer } from '../security/analyzer';
import { config } from '../config';

/**
 * 보안 분석 API 라우터
 */
const router = express.Router();

/**
 * 코드 보안 취약점 분석 API
 * POST /api/security/analyze/code
 */
router.post('/analyze/code', async (req, res) => {
  try {
    const { sourceCode, language = config.analysis.defaultLanguage } = req.body;
    
    // 코드 크기 검증
    if (!sourceCode || sourceCode.length > config.analysis.maxCodeSize) {
      return res.status(400).json({
        success: false,
        error: `코드 크기는 ${config.analysis.maxCodeSize} 바이트 이하여야 합니다.`
      });
    }
    
    // 코드 분석 수행
    const analysisResult = await securityAnalyzer.analyzeCode(sourceCode, language);
    
    return res.json({
      success: true,
      data: analysisResult
    });
  } catch (error) {
    console.error('코드 분석 오류:', error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message || '코드 분석 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 네트워크 이상 감지 API
 * POST /api/security/analyze/network
 */
router.post('/analyze/network', async (req, res) => {
  try {
    const { trafficData } = req.body;
    
    if (!trafficData) {
      return res.status(400).json({
        success: false,
        error: '네트워크 트래픽 데이터가 필요합니다.'
      });
    }
    
    // 네트워크 이상 감지 수행
    const analysisResult = await securityAnalyzer.detectNetworkAnomalies(trafficData);
    
    return res.json({
      success: true,
      data: analysisResult
    });
  } catch (error) {
    console.error('네트워크 분석 오류:', error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message || '네트워크 분석 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 시스템 행동 분석 API
 * POST /api/security/analyze/behavior
 */
router.post('/analyze/behavior', async (req, res) => {
  try {
    const { behaviorData } = req.body;
    
    if (!behaviorData) {
      return res.status(400).json({
        success: false,
        error: '시스템 행동 데이터가 필요합니다.'
      });
    }
    
    // 행동 분석 수행
    const analysisResult = await securityAnalyzer.analyzeBehavior(behaviorData);
    
    return res.json({
      success: true,
      data: analysisResult
    });
  } catch (error) {
    console.error('행동 분석 오류:', error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message || '행동 분석 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 종합 보안 보고서 생성 API
 * POST /api/security/report
 */
router.post('/report', async (req, res) => {
  try {
    const { analysisResults } = req.body;
    
    if (!analysisResults || !Array.isArray(analysisResults)) {
      return res.status(400).json({
        success: false,
        error: '분석 결과 배열이 필요합니다.'
      });
    }
    
    // 보안 보고서 생성
    const report = await securityAnalyzer.generateSecurityReport(analysisResults);
    
    return res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('보고서 생성 오류:', error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message || '보고서 생성 중 오류가 발생했습니다.'
    });
  }
});

export default router; 