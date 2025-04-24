import { Router } from 'express';

const router = Router();

// 더미 데이터 타입 정의
interface HealthData {
  userId?: string;
  timestamp: number;
  heartRate: number;
  oxygenLevel: number;
  ecgData: number[];
}

// 더미 데이터 생성 함수
const generateDummyData = (days: number, frequency = 6): HealthData[] => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const result = [];

  for (let i = 0; i < days; i++) {
    for (let j = 0; j < frequency; j++) {
      result.push({
        timestamp: now - (i * day) - (j * (day / frequency)),
        heartRate: 60 + Math.floor(Math.random() * 40),
        oxygenLevel: 95 + Math.floor(Math.random() * 5),
        ecgData: Array(50).fill(0).map(() => Math.floor(Math.random() * 100))
      });
    }
  }

  return result.sort((a, b) => b.timestamp - a.timestamp);
};

// 더미 데이터
const dummyDaily = generateDummyData(1, 24);
const dummyWeekly = generateDummyData(7, 7);
const dummyMonthly = generateDummyData(30, 30);

/**
 * @route GET /api/health/data
 * @desc 건강 데이터 가져오기
 */
router.get('/data', (req, res) => {
  try {
    const period = req.query.period || 'daily';
    let data;

    switch (period) {
      case 'weekly':
        data = dummyWeekly;
        break;
      case 'monthly':
        data = dummyMonthly;
        break;
      default:
        data = dummyDaily;
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('건강 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '건강 데이터 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * @route GET /api/health/status
 * @desc 현재 건강 상태 가져오기
 */
router.get('/status', (req, res) => {
  try {
    // 가장 최근 데이터
    const latest = dummyDaily[0];
    
    // 위험도 평가 (매우 단순한 로직)
    let risk = 'low';
    if (latest.heartRate > 90) risk = 'medium';
    if (latest.heartRate > 100) risk = 'high';
    if (latest.oxygenLevel < 95) risk = 'medium';
    if (latest.oxygenLevel < 90) risk = 'high';
    
    res.status(200).json({
      success: true,
      data: {
        timestamp: latest.timestamp,
        metrics: {
          heartRate: latest.heartRate,
          oxygenLevel: latest.oxygenLevel
        },
        risk,
        message: risk === 'high' 
          ? '위험 수준이 높습니다. 의료 전문가와 상담하세요.' 
          : risk === 'medium' 
            ? '주의가 필요합니다. 건강 상태를 모니터링하세요.' 
            : '정상 범위입니다.'
      }
    });
  } catch (error) {
    console.error('건강 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '건강 상태 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * @route POST /api/health/data
 * @desc 건강 데이터 저장 (서버리스 환경에서는 더미 응답)
 */
router.post('/data', (req, res) => {
  try {
    res.status(201).json({
      success: true,
      message: '데이터가 성공적으로 저장되었습니다 (테스트 응답)',
      data: {
        id: `dummy-${Date.now()}`
      }
    });
  } catch (error) {
    console.error('건강 데이터 저장 오류:', error);
    res.status(500).json({
      success: false,
      error: '건강 데이터 저장 중 오류가 발생했습니다'
    });
  }
});

export default router; 