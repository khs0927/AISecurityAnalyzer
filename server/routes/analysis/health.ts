import { Router } from 'express';
import { logger } from '../../config';
import { socketManager } from '../../socket/socketManager';

const router = Router();

// 건강 데이터를 저장할 메모리 저장소
interface HealthData {
  userId: string;
  vitals: {
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    oxygenLevel?: number;
    temperature?: number;
  };
  riskFactors?: string[];
  assessment?: any;
  timestamp: Date;
}

const healthDataStore: Record<string, HealthData> = {};

/**
 * 건강 데이터 분석 API
 */
router.post('/', async (req, res) => {
  try {
    const { userId, healthData } = req.body;

    if (!userId || !healthData) {
      return res.status(400).json({
        success: false,
        error: 'userId와 healthData가 필요합니다.'
      });
    }

    // 건강 데이터 저장
    const timestamp = new Date();
    healthDataStore[userId] = {
      userId,
      vitals: {
        heartRate: healthData.heartRate,
        bloodPressureSystolic: healthData.bloodPressureSystolic,
        bloodPressureDiastolic: healthData.bloodPressureDiastolic,
        oxygenLevel: healthData.oxygenLevel,
        temperature: healthData.temperature
      },
      riskFactors: healthData.riskFactors || [],
      timestamp
    };

    // AI 시스템으로 건강 데이터 분석
    let assessment = null;
    try {
      if (global.aiSystem && typeof global.aiSystem.analyzeHealthData === 'function') {
        assessment = await global.aiSystem.analyzeHealthData(healthData);
        healthDataStore[userId].assessment = assessment;
      } else {
        logger.warn('AI 시스템이 초기화되지 않은 상태에서 health API 호출됨');
      }
    } catch (aiError) {
      logger.error('건강 데이터 분석 중 오류:', aiError);
    }

    // WebSocket으로 알림
    const io = socketManager.getIO();
    if (io) {
      io.to(userId).emit('health_data_update', {
        userId,
        healthData: healthDataStore[userId],
        assessment,
        timestamp
      });
    }

    // 응답 반환
    res.json({
      success: true,
      healthData: healthDataStore[userId],
      assessment,
      timestamp
    });
  } catch (error) {
    logger.error('건강 데이터 분석 API 오류:', error);
    res.status(500).json({
      success: false,
      error: '건강 데이터 분석 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 건강 데이터 조회 API
 */
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId가 필요합니다.'
      });
    }
    
    const healthData = healthDataStore[userId];
    if (!healthData) {
      return res.status(404).json({
        success: false,
        error: '건강 데이터를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      healthData
    });
    
  } catch (error) {
    logger.error('건강 데이터 조회 API 오류:', error);
    res.status(500).json({
      success: false,
      error: '건강 데이터 조회 중 오류가 발생했습니다.'
    });
  }
});

export default router;