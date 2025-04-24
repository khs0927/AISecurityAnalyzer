import axios from 'axios';
import { ConsultResponse, DiagnosisResult } from '../types';

// 환경 변수에서 Agent 서버 URL 설정
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000';

/**
 * Agent 서버와 통신하는 클라이언트
 */
export const agentClient = {
  /**
   * 의료 상담 질의
   * @param text 상담 질문
   * @returns 상담 답변
   */
  async consult(text: string): Promise<string> {
    try {
      const response = await axios.post(`${AGENT_URL}/v1/consult`, { question: text });
      return response.data.answer;
    } catch (error) {
      console.error('상담 요청 중 오류 발생:', error);
      throw new Error('상담 처리 중 오류가 발생했습니다');
    }
  },

  /**
   * ECG 데이터 분석
   * @param samples ECG 신호 샘플 (최소 5000개 데이터 포인트)
   * @returns 진단 결과
   */
  async ecgAnalyse(samples: number[]): Promise<number> {
    try {
      const response = await axios.post(`${AGENT_URL}/v1/ecg`, { samples });
      return response.data.diagnosis;
    } catch (error) {
      console.error('ECG 분석 중 오류 발생:', error);
      throw new Error('ECG 데이터 분석 중 오류가 발생했습니다');
    }
  },

  /**
   * 건강 데이터 위험도 분석
   * @param heartRate 심박수
   * @param oxygenLevel 산소포화도
   * @param ecgResult ECG 분석 결과
   * @returns 위험도 점수 (0-100)
   */
  async analyzeRisk(heartRate: number, oxygenLevel: number, ecgResult: number): Promise<number> {
    try {
      const response = await axios.post(`${AGENT_URL}/v1/risk`, {
        heartRate,
        oxygenLevel,
        ecgResult,
      });
      return response.data.riskScore;
    } catch (error) {
      console.error('위험도 분석 중 오류 발생:', error);
      throw new Error('위험도 분석 중 오류가 발생했습니다');
    }
  },
}; 