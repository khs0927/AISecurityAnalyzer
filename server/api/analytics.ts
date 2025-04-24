import express from 'express';
import { monitoringInstance } from '../monitoringInstance';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// 경로 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '..', '..', 'logs');

// 로그 디렉토리 확인
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * 방문 데이터 기록 API
 * 각 방문자의 기본 정보를 로그로 저장하는 엔드포인트
 */
router.post('/visit', async (req, res) => {
  try {
    const visitData = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // 데이터에 IP 주소 추가 (익명화 처리)
    const anonymizedIp = typeof ip === 'string' ? ip.replace(/\.\d+$/, '.xxx') : 'unknown';
    visitData.ip = anonymizedIp;
    
    // 모니터링 인스턴스에 기록
    monitoringInstance.log('info', 'Heart Care 방문', { 
      path: visitData.path,
      referrer: visitData.referrer,
      timestamp: visitData.timestamp
    }, 'analytics');
    
    // 방문 로그 파일에 기록
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `visits-${today}.log`);
    
    fs.appendFile(
      logFile, 
      JSON.stringify({ ...visitData, timestamp: new Date().toISOString() }) + '\n',
      (err) => {
        if (err) {
          console.error('방문 로그 저장 실패:', err);
        }
      }
    );
    
    res.status(200).json({ success: true });
  } catch (error) {
    // 단순히 수집 목적이므로 오류가 있어도 정상 응답 반환
    console.error('방문 데이터 처리 오류:', error);
    res.status(200).json({ success: false });
  }
});

/**
 * 앱 사용 이벤트 기록 API
 * 주요 액션에 대한 이벤트 기록
 */
router.post('/event', async (req, res) => {
  try {
    const { eventType, eventData } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ success: false, error: '이벤트 타입이 필요합니다' });
    }
    
    // 모니터링 인스턴스에 기록
    monitoringInstance.log('info', `Heart Care 이벤트: ${eventType}`, eventData, 'analytics');
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('이벤트 데이터 처리 오류:', error);
    res.status(200).json({ success: false });
  }
});

/**
 * 심장 건강 데이터 기록 API
 * 사용자의 심장 건강 관련 데이터를 기록하는 엔드포인트
 */
router.post('/heart-data', async (req, res) => {
  try {
    const { userId, heartRate, bloodPressure, ecgData, timestamp, deviceInfo } = req.body;
    
    if (!userId || !heartRate) {
      return res.status(400).json({ success: false, error: '사용자 ID와 심박수는 필수입니다' });
    }
    
    // 모니터링 인스턴스에 기록
    monitoringInstance.log('info', '심장 건강 데이터 기록', { 
      userId,
      heartRate,
      bloodPressure,
      timestamp: timestamp || new Date().toISOString(),
      hasEcgData: !!ecgData,
      deviceInfo
    }, 'health-data');
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('심장 건강 데이터 처리 오류:', error);
    res.status(200).json({ success: false });
  }
});

/**
 * 오류 보고 API
 * 클라이언트 측 오류를 수집하는 엔드포인트
 */
router.post('/error', async (req, res) => {
  try {
    const { errorMessage, errorStack, errorContext } = req.body;
    
    // 모니터링 인스턴스에 오류 기록
    monitoringInstance.log('error', errorMessage, { 
      stack: errorStack,
      context: errorContext,
      userAgent: req.headers['user-agent']
    }, 'client-error');
    
    // 오류 로그 파일에 기록
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `errors-${today}.log`);
    
    fs.appendFile(
      logFile, 
      JSON.stringify({ 
        timestamp: new Date().toISOString(),
        message: errorMessage,
        stack: errorStack,
        context: errorContext,
        userAgent: req.headers['user-agent']
      }) + '\n',
      (err) => {
        if (err) {
          console.error('오류 로그 저장 실패:', err);
        }
      }
    );
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('오류 데이터 처리 실패:', error);
    res.status(200).json({ success: false });
  }
});

export default router; 