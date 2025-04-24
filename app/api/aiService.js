// aiService.js
// Qwen2.5-Omni-7B와 MMed-Llama-3-8B 모델 통합 서비스

import apiClient from './client';

// 환경 설정
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const USE_MODEL_FUSION = true; // 모델 통합 기능 활성화 여부

// 모델 ID 정의
const MODELS = {
  qwen: 'Qwen/Qwen2.5-Omni-7B',
  mmed: 'Henrychur/MMed-Llama-3-8B-EnIns',
};

/**
 * 멀티모달 AI 의료 상담 서비스
 * Qwen2.5-Omni-7B와 MMed-Llama-3-8B 모델을 사용하여 고급 의료 상담 제공
 */
export default {
  /**
   * AI 상담 메시지 전송
   * @param {string} message 사용자 메시지
   * @param {Array} messageHistory 메시지 기록
   * @param {Object} healthData 건강 데이터 (심박수, 산소포화도 등)
   */
  async sendMessage(message, messageHistory = [], healthData = null) {
    try {
      if (!message) throw new Error('메시지가 필요합니다');

      // 서버로 데이터 전송
      const response = await apiClient.post('/api/ai/consult', {
        message,
        context: JSON.stringify(messageHistory),
        healthData
      });

      return response;
    } catch (error) {
      console.error('AI 메시지 전송 오류:', error);
      throw error;
    }
  },

  /**
   * 건강 데이터 분석
   * @param {Object} healthData 건강 데이터
   */
  async analyzeHealthData(healthData) {
    try {
      if (!healthData) throw new Error('건강 데이터가 필요합니다');

      // 서버로 데이터 전송
      const response = await apiClient.post('/api/ai/analyze', {
        healthData
      });

      return response;
    } catch (error) {
      console.error('건강 데이터 분석 오류:', error);
      throw error;
    }
  },

  /**
   * 실시간 위험도 평가
   * @param {Object} vitalSigns 생체 징후 데이터
   */
  async assessRealTimeRisk(vitalSigns) {
    try {
      if (!vitalSigns) throw new Error('생체 징후 데이터가 필요합니다');

      // 서버로 데이터 전송
      const response = await apiClient.post('/api/ai/v1/realtime-risk', {
        ...vitalSigns
      });

      return response;
    } catch (error) {
      console.error('실시간 위험도 평가 오류:', error);
      throw error;
    }
  },

  /**
   * 로컬 모드 메시지 처리 (오프라인 시)
   * 간단한 건강 조언만 제공하는 제한된 기능
   * @param {string} message 사용자 메시지
   */
  handleOfflineMessage(message) {
    const keywords = {
      '심장': '심장 건강을 위해서는 규칙적인 운동, 건강한 식습관, 스트레스 관리가 중요합니다.',
      '두통': '두통이 지속되면 충분한 휴식을 취하고 필요시 의사와 상담하세요.',
      '혈압': '혈압 관리를 위해 저염식, 규칙적인 운동, 금연, 절주를 실천하세요.',
      '당뇨': '당뇨 관리를 위해 혈당 수치를 정기적으로 확인하고 탄수화물 섭취를 조절하세요.',
      '운동': '심장 건강을 위해 주 150분의 중강도 유산소 운동이 권장됩니다.',
    };

    // 키워드 찾기
    for (const [key, response] of Object.entries(keywords)) {
      if (message.includes(key)) {
        return { aiResponse: response };
      }
    }

    // 기본 응답
    return {
      aiResponse: '죄송합니다. 현재 오프라인 모드에서는 제한된 응답만 제공됩니다. 인터넷에 연결되면 더 정확한 정보를 제공해 드릴 수 있습니다.'
    };
  }
}; 