import express from 'express';
import { Request, Response } from 'express';
import { monitoring } from '../utils/monitoring';

const router = express.Router();

/**
 * @api {post} /api/analysis/risk 종합 위험도 평가
 * @apiName AnalyzeRisk
 * @apiGroup HealthAnalysis
 * @apiDescription 실시간 센서 데이터와 사용자 프로필을 바탕으로 종합 위험도를 계산합니다.
 * 
 * @apiParam {Object} sensorData 실시간 센서 데이터
 * @apiParam {Object} userProfile 사용자 프로필 정보
 * 
 * @apiSuccess {Boolean} success 요청 성공 여부
 * @apiSuccess {Number} riskScore 0-100 사이의 위험도 점수
 * @apiSuccess {Array} explanation 위험도 설명
 * @apiSuccess {Array} recommendations 권장 사항
 */
router.post('/risk', async (req: Request, res: Response) => {
  try {
    const { sensorData, userProfile } = req.body;
    
    // 입력 검증
    if (!sensorData || !userProfile) {
      return res.status(400).json({
        success: false,
        error: '센서 데이터와 사용자 프로필이 필요합니다.'
      });
    }
    
    // 심박수, 산소포화도, ECG 데이터 추출
    const heartRate = sensorData.heartRate || 0;
    const oxygenLevel = sensorData.oxygenLevel || 0;
    const ecgData = sensorData.ecgData || [];
    
    // 사용자 정보 추출
    const age = userProfile.age || 30;
    const gender = userProfile.gender || 'unknown';
    const medications = userProfile.medications || [];
    const conditions = userProfile.conditions || [];
    
    // 위험도 계산 로직
    let riskScore = 0;
    const explanations: string[] = [];
    const recommendations: string[] = [];
    
    // 심박수 위험도 평가
    if (heartRate > 100) {
      riskScore += 20;
      explanations.push(`빠른 심박수 (${heartRate} bpm)`);
      recommendations.push('안정을 취하고 심호흡을 하세요.');
    } else if (heartRate < 60) {
      riskScore += 15;
      explanations.push(`느린 심박수 (${heartRate} bpm)`);
      recommendations.push('몸을 따뜻하게 하고 수분을 섭취하세요.');
    }
    
    // 산소포화도 위험도 평가
    if (oxygenLevel < 90) {
      riskScore += 30;
      explanations.push(`낮은 산소포화도 (${oxygenLevel}%)`);
      recommendations.push('즉시 의료 지원을 요청하세요.');
    } else if (oxygenLevel < 95) {
      riskScore += 15;
      explanations.push(`정상보다 낮은 산소포화도 (${oxygenLevel}%)`);
      recommendations.push('심호흡을 하고 환기가 잘 되는 공간으로 이동하세요.');
    }
    
    // ECG 데이터 분석 (간단한 예시)
    if (ecgData.length > 0) {
      const ecgAvg = ecgData.reduce((sum, val) => sum + val, 0) / ecgData.length;
      const ecgVariance = ecgData.reduce((sum, val) => sum + Math.pow(val - ecgAvg, 2), 0) / ecgData.length;
      
      if (ecgVariance > 0.5) {
        riskScore += 25;
        explanations.push('ECG 신호의 불규칙성 감지');
        recommendations.push('안정을 취하고 의사와 상담하세요.');
      }
    }
    
    // 사용자 프로필 기반 위험도 조정
    if (age > 60) {
      riskScore += 10;
      explanations.push('고연령층에 속합니다.');
    }
    
    if (conditions.includes('heart_disease') || 
        conditions.includes('hypertension') || 
        conditions.includes('diabetes')) {
      riskScore += 15;
      explanations.push('기존 심혈관/대사 질환이 있습니다.');
      recommendations.push('정기적으로 처방약을 복용하고 의사의 지시를 따르세요.');
    }
    
    // 최종 위험도 계산 (최대 100으로 제한)
    riskScore = Math.min(riskScore, 100);
    
    // 기본 권장사항 추가
    if (recommendations.length === 0) {
      if (riskScore < 20) {
        recommendations.push('정상적인 수치입니다. 건강한 생활습관을 유지하세요.');
      } else if (riskScore < 50) {
        recommendations.push('적절한 휴식과 규칙적인 생활을 유지하세요.');
      } else {
        recommendations.push('의사와 상담하는 것이 좋습니다.');
      }
    }
    
    // 로깅
    monitoring.log('ai', 'info', `위험도 분석 완료: ${riskScore}/100`);
    
    return res.json({
      success: true,
      riskScore,
      explanation: explanations,
      recommendations
    });
  } catch (error) {
    monitoring.log('ai', 'error', `위험도 분석 오류: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: '위험도 분석 중 오류가 발생했습니다.'
    });
  }
});

export default router; 