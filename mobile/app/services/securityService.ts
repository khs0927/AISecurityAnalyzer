import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityAnalysisResult, SecurityAnalysisRequest } from '../types/security';

const HF_TOKEN_KEY = 'hf_token';

export const saveHuggingFaceToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(HF_TOKEN_KEY, token);
    return Promise.resolve();
  } catch (error) {
    console.error('토큰 저장 중 오류 발생:', error);
    return Promise.reject(error);
  }
};

export const getHuggingFaceToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(HF_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('토큰 불러오기 중 오류 발생:', error);
    return null;
  }
};

export const hasHuggingFaceToken = async (): Promise<boolean> => {
  const token = await getHuggingFaceToken();
  return token !== null && token.trim() !== '';
};

export const analyzeTextSecurity = async (
  request: SecurityAnalysisRequest
): Promise<SecurityAnalysisResult[]> => {
  try {
    const token = await getHuggingFaceToken();
    
    if (!token) {
      throw new Error('Hugging Face 토큰이 설정되지 않았습니다.');
    }

    const model = request.model || 'facebook/bart-large-mnli';
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: request.text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 요청 실패: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // 이 부분은 실제 모델의 응답 구조에 따라 조정해야 합니다
    // 여기서는 예시로 보안 분석 결과를 생성합니다
    const mockResults: SecurityAnalysisResult[] = [
      {
        category: '개인정보 노출',
        score: Math.random(),
        description: '텍스트에서 개인정보 노출 위험을 분석했습니다.',
        recommendations: ['민감한 개인정보는 마스킹 처리하세요.', '필요 이상의 개인정보를 공유하지 마세요.']
      },
      {
        category: '악성 코드',
        score: Math.random(),
        description: '텍스트에 악성 코드 가능성을 분석했습니다.',
        recommendations: ['의심스러운 링크를 클릭하지 마세요.', '출처가 불분명한 코드는 실행하지 마세요.']
      },
      {
        category: '피싱 시도',
        score: Math.random(),
        description: '텍스트에서 피싱 시도 가능성을 분석했습니다.',
        recommendations: ['개인정보나 금융정보를 요구하는 메시지는 주의하세요.', '공식 채널을 통해 정보를 확인하세요.']
      }
    ];

    return mockResults;
  } catch (error) {
    console.error('보안 분석 중 오류 발생:', error);
    throw error;
  }
}; 