import { Router, Request, Response } from 'express';
import { storage } from './storage';

const router = Router();

// 모바일 앱을 위한 API 엔드포인트

// 사용자 정보 조회
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 비밀번호 정보 제외
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 최신 건강 데이터 조회
router.get('/users/:userId/health-data/latest', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const latestHealthData = await storage.getLatestHealthData(userId);
    
    if (!latestHealthData) {
      return res.status(404).json({ error: 'Health data not found' });
    }
    
    res.json(latestHealthData);
  } catch (error) {
    console.error('Error fetching latest health data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 건강 데이터 목록 조회
router.get('/users/:userId/health-data', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const healthData = await storage.getHealthDataByUserId(userId);
    
    res.json(healthData);
  } catch (error) {
    console.error('Error fetching health data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ECG 기록 목록 조회
router.get('/users/:userId/ecg-recordings', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const recordings = await storage.getEcgRecordingsByUserId(userId);
    
    res.json(recordings);
  } catch (error) {
    console.error('Error fetching ECG recordings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ECG 기록 생성
router.post('/users/:userId/ecg-recordings', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { data, deviceType } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid ECG data format' });
    }
    
    // deviceType 필드는 스키마에 정의되어 있지 않으므로 제거
    const recording = await storage.createEcgRecording({
      userId,
      data,
      duration: data.length / 250, // 250Hz 샘플링 속도 가정
      abnormalities: [],
      analysis: { source: deviceType || 'mobile' }
    });
    
    res.status(201).json(recording);
  } catch (error) {
    console.error('Error creating ECG recording:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 보호자 목록 조회
router.get('/users/:userId/guardians', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // 이 부분은 실제 구현에서는 storage에 적절한 메서드 추가 필요
    // 지금은 예시 데이터 반환
    const guardians = [
      {
        id: 1,
        name: '김철수',
        relation: '배우자',
        phone: '010-1234-5678',
        priority: 1,
      },
      {
        id: 2,
        name: '이영희',
        relation: '자녀',
        phone: '010-2345-6789',
        priority: 2,
      },
      {
        id: 3,
        name: '박지성',
        relation: '부모',
        phone: '010-3456-7890',
        priority: 3,
      }
    ];
    
    res.json(guardians);
  } catch (error) {
    console.error('Error fetching guardians:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 알림 목록 조회
router.get('/users/:userId/alerts', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const alerts = await storage.getAlertsByUserId(userId);
    
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 모바일 앱 상태 확인용 엔드포인트
router.get('/mobile/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    serverTime: new Date().toISOString()
  });
});

// 근처 병원 조회 (가상 데이터)
router.get('/hospitals/nearby', (req: Request, res: Response) => {
  // 실제 구현에서는 위치 기반 검색 필요
  // const { latitude, longitude, radius } = req.query;
  
  const hospitals = [
    {
      id: 1,
      name: '서울대학교병원',
      distance: '1.2km',
      address: '서울시 종로구 대학로 101',
      phone: '02-2072-2114',
      isOpen24h: true,
      specialty: '심장 전문',
    },
    {
      id: 2,
      name: '서울아산병원',
      distance: '2.5km',
      address: '서울시 송파구 올림픽로 43길 88',
      phone: '1688-7575',
      isOpen24h: true,
    },
    {
      id: 3,
      name: '세브란스병원',
      distance: '3.8km',
      address: '서울시 서대문구 연세로 50-1',
      phone: '1599-1004',
      isOpen24h: true,
      specialty: '응급의료센터',
    },
  ];
  
  res.json(hospitals);
});

export default router;