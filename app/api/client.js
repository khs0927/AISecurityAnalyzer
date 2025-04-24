import axios from 'axios';
import { Platform } from 'react-native';

// API 기본 URL 설정
// 다양한 환경에서 동작하도록 환경에 따른 URL 설정
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    // 웹 환경에서는 상대 경로 사용
    return '/api';
  } else if (__DEV__) {
    // 개발 환경에서는 로컬 서버 주소 사용
    // 에뮬레이터 또는 시뮬레이터에서는 특별한 IP 주소를 사용해야 함
    // Android 에뮬레이터: 10.0.2.2
    // iOS 시뮬레이터: localhost
    return Platform.OS === 'android' 
      ? 'http://10.0.2.2:3000/api' 
      : 'http://localhost:3000/api';
  } else {
    // 프로덕션 환경에서는 실제 서버 주소 사용
    return 'https://your-api-server.com/api';
  }
};

// API 클라이언트 생성
const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000, // 10초 타임아웃
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// 요청 인터셉터 설정
apiClient.interceptors.request.use(
  config => {
    // 요청 보내기 전 처리 (예: 인증 토큰 추가)
    // config.headers.Authorization = `Bearer ${getTokenFromStorage()}`;
    return config;
  },
  error => {
    // 요청 에러 처리
    console.error('API 요청 에러:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
apiClient.interceptors.response.use(
  response => {
    // 2xx 범위 응답 처리
    return response.data;
  },
  error => {
    // 응답 에러 처리
    if (error.response) {
      // 서버가 응답을 반환했지만 2xx 범위가 아닌 상태 코드
      console.error('API 응답 에러:', error.response.status, error.response.data);
    } else if (error.request) {
      // 요청이 이루어졌으나 응답을 받지 못함
      console.error('API 응답 없음:', error.request);
    } else {
      // 요청 설정 중 문제 발생
      console.error('API 설정 에러:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;