import axios from 'axios';

// API 기본 설정
const apiClient = axios.create({
  // Replit 환경에서는 현재 서버 주소로 설정
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// API 오류 처리 인터셉터
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 오류 처리 로직
    console.error('API 요청 오류:', error.message);
    
    // 오류 응답 전달
    return Promise.reject(error);
  }
);

export default apiClient;