import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// 환경에 따른 기본 URL 설정
const BASE_URL = __DEV__ 
  ? Platform.OS === 'android' 
    ? 'http://10.0.2.2:3000/api' // Android 에뮬레이터
    : 'http://localhost:3000/api' // iOS 시뮬레이터
  : 'https://nottodayapp.vercel.app/api'; // 프로덕션 환경

// API 클라이언트 구성
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// 인증 토큰 설정 함수
export const setAuthToken = async (token: string | null): Promise<void> => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await SecureStore.setItemAsync('authToken', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    await SecureStore.deleteItemAsync('authToken');
  }
};

// 앱 시작 시 저장된 토큰 로드
export const loadAuthToken = async (): Promise<void> => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      setAuthToken(token);
    }
  } catch (error) {
    console.error('토큰 로드 오류:', error);
  }
};

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    console.log(`🌐 API 요청: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error: AxiosError) => {
    console.error('🚫 API 요청 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ API 응답: ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      console.error(`🚫 API 응답 오류: ${error.response.status} ${error.response.config.url}`);
      
      // 401 Unauthorized 처리
      if (error.response.status === 401) {
        // 인증 관련 상태 초기화
        setAuthToken(null);
        // 로그인 페이지로 리디렉션 또는 다른 처리
      }
    } else {
      console.error('🚫 API 요청 실패:', error.message);
    }
    return Promise.reject(error);
  }
);

// 웹소켓 연결 함수
export const connectWebSocket = () => {
  const wsProtocol = __DEV__ ? 'ws' : 'wss';
  const wsHost = __DEV__ 
    ? Platform.OS === 'android' 
      ? '10.0.2.2:3000' // Android 에뮬레이터
      : 'localhost:3000' // iOS 시뮬레이터
    : 'nottodayapp.vercel.app';
  
  const wsURL = `${wsProtocol}://${wsHost}/ws`;
  
  const socket = new WebSocket(wsURL);
  
  socket.onopen = () => {
    console.log('웹소켓 연결됨');
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('웹소켓 메시지 수신:', data);
      return data;
    } catch (error) {
      console.error('웹소켓 메시지 파싱 오류:', error);
    }
  };
  
  socket.onerror = (error) => {
    console.error('웹소켓 오류:', error);
  };
  
  socket.onclose = (event) => {
    console.log('웹소켓 연결 종료:', event.code, event.reason);
  };
  
  return socket;
};

export default apiClient; 