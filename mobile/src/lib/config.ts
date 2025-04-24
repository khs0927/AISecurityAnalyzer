/**
 * 앱 구성 설정
 */

import { Platform } from 'react-native';

// 에뮬레이터에서 API 서버에 접근하기 위한 기본 URL 설정
export const API_BASE_URL = Platform.select({
  // 안드로이드 에뮬레이터는 10.0.2.2를 통해 호스트 머신에 접근
  android: 'http://10.0.2.2:5000/api',
  // iOS 시뮬레이터는 localhost를 통해 호스트 머신에 접근
  ios: 'http://localhost:5000/api',
  // 웹에서는 상대 경로 사용
  default: '/api',
});

// 기타 환경 설정
export const APP_CONFIG = {
  // 앱 테마 색상
  PRIMARY_COLOR: '#FF0000',
  SECONDARY_COLOR: '#FF8FAB',
  
  // 타임아웃 설정 (ms)
  API_TIMEOUT: 30000,
  
  // 기본 언어 설정
  DEFAULT_LANGUAGE: 'ko',
  
  // 앱 버전
  VERSION: '1.0.0',
};