import { Router } from 'express';
import { storage } from '../storage';
import { monitoringInstance } from '../monitoringInstance';
import { 
  validateUserIdParamMiddleware, 
  validatePeriodParamMiddleware, 
  validateHealthDataMiddleware,
  formatApiResponse,
  serverErrorResponse
} from '../utils/validation';

const router = Router();

/**
 * @route GET /api/health/data
 * @desc 건강 데이터 가져오기
 */
router.get('/data', 
  validatePeriodParamMiddleware, 
  async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const period = req.query.period as string || 'daily';
      
      if (!userId) {
        return res.status(400).json(formatApiResponse(false, undefined, '사용자 ID가 필요합니다.'));
      }
      
      // 데이터베이스에서 건강 데이터 가져오기
      const data = await storage.getHealthData(userId, period);
      
      if (!data || data.length === 0) {
        return res.status(404).json(formatApiResponse(false, undefined, '해당 사용자의 건강 데이터를 찾을 수 없습니다.'));
      }

      res.status(200).json(formatApiResponse(true, { data, period }));
    } catch (error) {
      monitoringInstance.logError('건강 데이터 조회 오류', { error });
      serverErrorResponse(res, error as Error);
    }
});

/**
 * @route GET /api/health/status
 * @desc 현재 건강 상태 가져오기
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json(formatApiResponse(false, undefined, '사용자 ID가 필요합니다.'));
    }
    
    // 가장 최근 데이터 가져오기
    const latestData = await storage.getLatestHealthData(userId);
    
    if (!latestData) {
      return res.status(404).json(formatApiResponse(false, undefined, '해당 사용자의 최근 건강 데이터를 찾을 수 없습니다.'));
    }
    
    // 위험도 평가 - 실제 구현에서는 AI 모델을 사용해 평가
    let risk = 'low';
    if (latestData.heartRate > 90) risk = 'medium';
    if (latestData.heartRate > 100) risk = 'high';
    if (latestData.oxygenLevel < 95) risk = 'medium';
    if (latestData.oxygenLevel < 90) risk = 'high';
    
    // 사용자별 위험 기준 가져오기
    const userRiskThresholds = await storage.getUserRiskThresholds(userId);
    
    // 사용자별 기준이 있으면 적용
    if (userRiskThresholds) {
      if (latestData.heartRate > userRiskThresholds.heartRateHigh) risk = 'high';
      if (latestData.oxygenLevel < userRiskThresholds.oxygenLevelLow) risk = 'high';
    }
    
    const statusData = {
      timestamp: latestData.timestamp,
      metrics: {
        heartRate: latestData.heartRate,
        oxygenLevel: latestData.oxygenLevel
      },
      risk,
      message: risk === 'high' 
        ? '위험 수준이 높습니다. 의료 전문가와 상담하세요.' 
        : risk === 'medium' 
          ? '주의가 필요합니다. 건강 상태를 모니터링하세요.' 
          : '정상 범위입니다.'
    };
    
    res.status(200).json(formatApiResponse(true, statusData));
  } catch (error) {
    monitoringInstance.logError('건강 상태 조회 오류', { error });
    serverErrorResponse(res, error as Error);
  }
});

/**
 * @route POST /api/health/data
 * @desc 건강 데이터 저장
 */
router.post('/data', 
  validateHealthDataMiddleware,
  async (req, res) => {
    try {
      const { userId, heartRate, oxygenLevel, bloodPressureSystolic, bloodPressureDiastolic, bodyTemperature, ecgData } = req.body;
      
      // 유효성 검사는 미들웨어에서 이미 수행됨
      
      // 데이터베이스에 건강 데이터 저장
      const healthData = {
        heartRate,
        oxygenLevel,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        bodyTemperature,
        timestamp: new Date().toISOString()
      };
      
      const savedData = await storage.saveHealthData(userId, healthData);
      
      // ECG 데이터가 있으면 별도로 저장
      // 주: ECG 저장 기능은 현재 구현되어 있지 않음
      /* 
      if (ecgData && Array.isArray(ecgData) && ecgData.length > 0) {
        await storage.saveECGData(userId, {
          data: ecgData,
          timestamp: healthData.timestamp,
          healthDataId: savedData.id
        });
      }
      */
      
      // 위험도 평가
      let risk = 'low';
      if (healthData.heartRate > 90) risk = 'medium';
      if (healthData.heartRate > 100) risk = 'high';
      if (healthData.oxygenLevel < 95) risk = 'medium';
      if (healthData.oxygenLevel < 90) risk = 'high';
      
      // 위험도가 높으면 알림 시스템에 전송 (실제 구현 필요)
      if (risk === 'high') {
        monitoringInstance.log('warn', '사용자 건강 위험 감지', {
          userId,
          healthData,
          risk
        }, 'user');
        
        // 여기에 알림 로직 추가 (예: 푸시 알림, SMS 등)
      }
      
      res.status(201).json(formatApiResponse(true, {
        id: savedData.id,
        risk
      }, '데이터가 성공적으로 저장되었습니다'));
    } catch (error) {
      monitoringInstance.logError('건강 데이터 저장 오류', { error });
      serverErrorResponse(res, error as Error);
    }
});

export default router; 