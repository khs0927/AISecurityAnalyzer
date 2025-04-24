import apiClient from './client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Hugging Face API 토큰 저장 키
const HF_TOKEN_KEY = 'hf_token';

// Hugging Face API 토큰 설정
export const setHuggingFaceToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(HF_TOKEN_KEY, token);
};

// Hugging Face API 토큰 가져오기
export const getHuggingFaceToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(HF_TOKEN_KEY);
};

// Hugging Face API 토큰 삭제
export const removeHuggingFaceToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(HF_TOKEN_KEY);
};

// Hugging Face API 기본 URL
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models';

// 모델 타입 정의
interface Model {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

// 보안 분석 요청 인터페이스
interface SecurityAnalysisRequest {
  text: string;
  model?: string; // 기본값이 있을 경우 선택적
}

// 보안 분석 결과 인터페이스
interface SecurityAnalysisResult {
  score: number;
  category: string;
  description: string;
  confidence: number;
  recommendations?: string[];
}

/**
 * Hugging Face API를 사용하여 텍스트 보안 분석 수행
 * @param data 분석할 텍스트 및 옵션
 * @returns 보안 분석 결과
 */
export const analyzeTextSecurity = async (
  data: SecurityAnalysisRequest
): Promise<SecurityAnalysisResult[]> => {
  try {
    const token = await getHuggingFaceToken();
    if (!token) {
      throw new Error('Hugging Face API 토큰이 설정되지 않았습니다.');
    }

    const model = data.model || 'default-security-model'; // 기본 모델 설정
    
    const response = await apiClient.post('/security/analyze', data, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('보안 분석 오류:', error);
    throw error;
  }
};

/**
 * 사용 가능한 보안 분석 모델 목록 가져오기
 * @returns 모델 목록
 */
export const getAvailableModels = async (): Promise<Model[]> => {
  try {
    const token = await getHuggingFaceToken();
    if (!token) {
      throw new Error('Hugging Face API 토큰이 설정되지 않았습니다.');
    }
    
    const response = await apiClient.get('/security/models', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('모델 목록 가져오기 오류:', error);
    throw error;
  }
};

/**
 * Hugging Face API 직접 호출 (고급 사용자용)
 * @param modelId 사용할 모델 ID
 * @param payload 요청 페이로드
 * @returns API 응답
 */
export const callHuggingFaceDirectly = async (
  modelId: string, 
  payload: any
): Promise<any> => {
  try {
    const token = await getHuggingFaceToken();
    if (!token) {
      throw new Error('Hugging Face API 토큰이 설정되지 않았습니다.');
    }

    const response = await fetch(`${HUGGING_FACE_API_URL}/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Hugging Face API 호출 오류:', error);
    throw error;
  }
}; 