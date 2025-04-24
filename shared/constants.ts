// 애플리케이션에서 공유되는 상수 값

// API 엔드포인트
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify',
  },
  HEALTH: {
    DATA: '/health/data',
    HISTORY: '/health/history',
    ANALYSIS: '/health/analysis',
    RISK: '/health/risk',
  },
  USER: {
    PROFILE: '/user/profile',
    SETTINGS: '/user/settings',
    NOTIFICATIONS: '/user/notifications',
  },
};

// 소켓 이벤트 타입
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  HEALTH_DATA: 'health_data',
  RISK_ALERT: 'risk_alert',
  USER_STATUS: 'user_status',
};

// 응답 상태 코드 및 메시지
export const RESPONSE_CODES = {
  SUCCESS: {
    code: 200,
    message: '성공적으로 처리되었습니다.',
  },
  CREATED: {
    code: 201,
    message: '리소스가 성공적으로 생성되었습니다.',
  },
  BAD_REQUEST: {
    code: 400,
    message: '잘못된 요청입니다.',
  },
  UNAUTHORIZED: {
    code: 401,
    message: '인증이 필요합니다.',
  },
  FORBIDDEN: {
    code: 403,
    message: '접근 권한이 없습니다.',
  },
  NOT_FOUND: {
    code: 404,
    message: '리소스를 찾을 수 없습니다.',
  },
  SERVER_ERROR: {
    code: 500,
    message: '서버 오류가 발생했습니다.',
  },
};

// 건강 데이터 정상 범위
export const HEALTH_RANGES = {
  HEART_RATE: {
    MIN: 40,
    MAX: 140,
    CRITICAL_MIN: 30,
    CRITICAL_MAX: 180,
  },
  OXYGEN_LEVEL: {
    MIN: 90,
    MAX: 100,
    CRITICAL_MIN: 85,
  },
  ECG: {
    MIN: -0.5,
    MAX: 0.5,
    CRITICAL_MIN: -1.0,
    CRITICAL_MAX: 1.0,
  },
};

// 위험 수준
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  SETTINGS: 'user_settings',
};

// 애니메이션 지속 시간 (ms)
export const ANIMATION_DURATION = {
  SHORT: 150,
  MEDIUM: 300,
  LONG: 500,
};

// 데이터 새로고침 간격 (ms)
export const REFRESH_INTERVALS = {
  HEALTH_DATA: 5000,  // 5초
  NOTIFICATIONS: 30000, // 30초
};

// 앱 테마 유형
export const THEME_TYPES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
}; 