import apiClient from './client';

/**
 * AI 상담 메시지 전송
 * @param {number} userId 사용자 ID
 * @param {string} message 사용자 메시지
 * @param {Array} conversationHistory 대화 기록
 * @returns {Promise<Object>} AI 응답
 */
export const sendAiConsultationMessage = async (userId, message, conversationHistory = []) => {
  try {
    // 웹앱과 동일한 엔드포인트 사용
    const response = await apiClient.post('/haim/consultation', {
      userId,
      message,
      context: conversationHistory.map(msg => 
        `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`
      ).join('\n'),
      category: 'general'
    });
    
    // 기존 코드와의 호환성을 위해 response 형식 맞추기
    return {
      message: response.data.aiResponse || response.data.message || '응답을 생성하는 데 문제가 발생했습니다.',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('AI 상담 메시지 전송 실패:', error);
    throw error;
  }
};

/**
 * 건강 데이터 기반 AI 분석 요청
 * @param {number} userId 사용자 ID
 * @param {Object} healthData 건강 데이터
 * @returns {Promise<Object>} 분석 결과
 */
export const requestAiHealthAnalysis = async (userId, healthData) => {
  try {
    // 웹앱과 동일한 엔드포인트 사용
    const response = await apiClient.post('/haim/health-analysis', {
      userId,
      healthData
    });
    return response.data;
  } catch (error) {
    console.error('AI 건강 분석 요청 실패:', error);
    throw error;
  }
};

/**
 * 음성 메시지를 텍스트로 변환
 * @param {Blob} audioBlob 오디오 데이터
 * @returns {Promise<Object>} 변환된 텍스트
 */
export const transcribeVoiceMessage = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    // 웹앱과 동일한 엔드포인트 사용
    const response = await apiClient.post('/haim/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('음성 메시지 변환 실패:', error);
    throw error;
  }
};

/**
 * 텍스트를 음성으로 변환
 * @param {number} userId 사용자 ID
 * @param {string} text 변환할 텍스트
 * @returns {Promise<Blob>} 오디오 데이터
 */
export const textToSpeech = async (userId, text) => {
  try {
    // 웹앱과 동일한 엔드포인트 사용
    const response = await apiClient.post('/haim/text-to-speech', {
      userId,
      text
    }, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('텍스트 음성 변환 실패:', error);
    throw error;
  }
};

/**
 * 대화 내역 가져오기
 * @param {number} userId 사용자 ID
 * @param {number} limit 가져올 메시지 개수
 * @returns {Promise<Array>} 대화 내역
 */
export const fetchConversationHistory = async (userId, limit = 20) => {
  try {
    // 웹앱과 동일한 엔드포인트 사용
    const response = await apiClient.get(`/haim/conversations/${userId}`, {
      params: { limit }
    });
    
    // 응답 형식 변환 (호환성 유지)
    if (response.data && Array.isArray(response.data.conversations)) {
      return response.data.conversations.map(conv => ({
        id: conv.id || Date.now().toString(),
        text: conv.content || conv.message,
        sender: conv.role === 'user' ? 'user' : 'ai',
        timestamp: new Date(conv.timestamp || Date.now()).getTime()
      }));
    }
    
    return response.data || [];
  } catch (error) {
    console.error('대화 내역 조회 실패:', error);
    // 실패 시 빈 배열 반환 (오류 방지)
    return [];
  }
};