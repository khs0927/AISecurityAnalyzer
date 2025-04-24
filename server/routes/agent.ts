import { Router } from 'express';
import { socketManager } from '../socket/socketManager';
import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { db } from '../db';

interface AgentDataPayload {
  userId: string;
  data: any;
}

interface WearableData {
  heartRate?: number;
  oxygenLevel?: number;
  ecgData?: number[];
  timestamp: string;
  userId: string;
}

interface AnalysisRequest {
  userId: string;
  wearableData?: WearableData;
  medicalHistory?: any;
  symptoms?: string[];
  query?: string;
}

interface AnalysisResponse {
  analysisId: string;
  result: any;
  confidence: number;
  recommendations?: string[];
  timestamp: string;
}

const agentRouter = Router();

// 메모리 저장소 (향후 DB 교체 가능)
const latestAgentData: Record<string, any> = {};

// ADK Python Agent 서버 URL
const ADK_AGENT_URL = process.env.ADK_AGENT_URL || 'http://localhost:5000'; 

// Agent → 서버 : 실시간 데이터 수신
agentRouter.post('/data', (req, res) => {
  const payload = req.body as AgentDataPayload;
  if (!payload?.userId || !payload?.data) {
    return res.status(400).json({ error: 'userId 와 data 필드가 필요합니다.' });
  }
  latestAgentData[payload.userId] = payload.data;

  // WebSocket 브로드캐스트
  const io = socketManager.getIO();
  if (io) {
    io.to(payload.userId).emit('agent_data', payload.data); // 동일 userId 룸으로 전송
    io.emit('agent_data_update', { userId: payload.userId });
  }

  return res.json({ status: 'ok' });
});

// 클라이언트 → 서버 : 최신 데이터 요청
agentRouter.get('/data/:userId', (req, res) => {
  const { userId } = req.params;
  const data = latestAgentData[userId];
  if (!data) return res.status(404).json({ error: '데이터 없음' });
  return res.json({ userId, data });
});

// 웨어러블 데이터 저장
agentRouter.post('/wearable-data', async (req, res) => {
  try {
    const wearableData: WearableData = req.body;
    
    if (!wearableData.userId || !wearableData.timestamp) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }
    
    // 데이터베이스에 저장
    // (실제 구현 시 DB 스키마에 맞게 수정 필요)
    // await db.insert(wearableData).into('wearable_data');
    
    // ADK Python Agent로 데이터 전송
    try {
      await axios.post(`${ADK_AGENT_URL}/api/wearable-data`, wearableData);
    } catch (agentError) {
      console.error('ADK Agent 호출 실패:', agentError);
      // Agent 오류는 무시하고 계속 진행 (비동기 처리)
    }
    
    // WebSocket 통해 실시간 데이터 전송
    const io = socketManager.getIO();
    if (io) {
      io.to(wearableData.userId).emit('wearable_update', wearableData);
    }
    
    return res.status(201).json({ 
      status: 'success', 
      message: '웨어러블 데이터가 저장되었습니다.' 
    });
    
  } catch (error: any) {
    console.error('웨어러블 데이터 저장 오류:', error);
    return res.status(500).json({ error: '서버 오류' });
  }
});

// AI 건강 분석 요청
agentRouter.post('/analyze', async (req, res) => {
  try {
    const analysisRequest: AnalysisRequest = req.body;
    
    if (!analysisRequest.userId) {
      return res.status(400).json({ error: 'userId는 필수 항목입니다.' });
    }
    
    // ADK Python Agent로 분석 요청
    const response = await axios.post(`${ADK_AGENT_URL}/api/analyze`, analysisRequest);
    const analysisResult: AnalysisResponse = response.data;
    
    // 분석 결과 저장 (선택 사항)
    // await db.insert({ ...analysisResult, userId: analysisRequest.userId }).into('analysis_results');
    
    // 클라이언트에 결과 반환
    return res.json(analysisResult);
    
  } catch (error: any) {
    console.error('건강 분석 오류:', error);
    
    // ADK Agent가 오류를 반환하면 클라이언트에게 전달
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: '분석 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// AI 상담 요청
agentRouter.post('/consultation', async (req, res) => {
  try {
    const { userId, query, context } = req.body;
    
    if (!userId || !query) {
      return res.status(400).json({ error: 'userId와 query는 필수 항목입니다.' });
    }
    
    // ADK Python Agent로 상담 요청
    const response = await axios.post(`${ADK_AGENT_URL}/api/consultation`, { 
      userId, 
      query,
      context: context || {}
    });
    
    return res.json(response.data);
    
  } catch (error: any) {
    console.error('AI 상담 오류:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ error: '상담 처리 중 오류가 발생했습니다.' });
  }
});

// Agent 상태 확인 엔드포인트
agentRouter.get('/status', async (req, res) => {
  try {
    const response = await axios.get(`${ADK_AGENT_URL}/api/status`);
    return res.json(response.data);
  } catch (error: any) {
    console.error('Agent 상태 확인 실패:', error);
    return res.status(503).json({ 
      status: 'unavailable',
      error: 'ADK Python Agent에 연결할 수 없습니다.'
    });
  }
});

export default agentRouter;