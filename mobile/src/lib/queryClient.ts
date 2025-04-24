import axios, { AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './config';

// API 클라이언트 구성
const apiClient = axios.create({
  // config.ts에 정의된 환경별 API 서버 URL 사용
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 에뮬레이터 연결 지원을 위한 설정
  timeout: 30000,
});

// 요청 오류 인터셉터
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API 요청 오류:', error.message);
    
    // HTML 응답이 반환된 경우 처리 (API 엔드포인트 오류 추정)
    if (
      error.response && 
      error.response.data && 
      typeof error.response.data === 'string' && 
      error.response.data.includes('<!DOCTYPE html>')
    ) {
      console.log('HTML 응답이 반환되었습니다 - JSON이 아님');
      console.log('HTML 응답:', error.response.data.substring(0, 200)); // 앞부분만 로그 출력
      return Promise.reject(new Error('서버가 HTML을 반환했습니다. API 엔드포인트 구성에 문제가 있을 수 있습니다.'));
    }
    
    return Promise.reject(error);
  }
);

// API 요청 헬퍼 함수
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient({
      method,
      url,
      data,
      ...config,
    });
    
    return response.data;
  } catch (error) {
    console.error(`API ${method} 요청 실패:`, error);
    throw error;
  }
}

export default apiClient;