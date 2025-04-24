// 애플리케이션에서 공유되는 타입 정의

// 사용자 관련 타입
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
  role: 'user' | 'admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 건강 데이터 관련 타입
export interface HealthData {
  id?: string;
  userId?: string;
  timestamp: string | Date;
  heartRate: number;
  oxygenLevel: number;
  ecgData?: number[];
  temperature?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  steps?: number;
}

export interface HistoricalData {
  daily: HealthData[];
  weekly: HealthData[];
  monthly: HealthData[];
}

export type TimeFrame = 'daily' | 'weekly' | 'monthly';

export type HealthMetric = 'heartRate' | 'oxygenLevel' | 'ecgData' | 'temperature' | 'bloodPressure' | 'steps';

export interface HealthStats {
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
}

// 위험 분석 관련 타입
export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskData {
  level: RiskLevel;
  message: string;
  timestamp: string | Date;
  details?: {
    affectedMetric: HealthMetric;
    currentValue: number;
    thresholdValue: number;
    recommendation?: string;
  };
}

export interface AnalysisResult {
  userId: string;
  timestamp: string | Date;
  riskLevel: RiskLevel;
  details: string;
  recommendations: string[];
}

// 알림 관련 타입
export interface Notification {
  id: string;
  userId: string;
  type: 'alert' | 'info' | 'warning';
  title: string;
  message: string;
  read: boolean;
  timestamp: string | Date;
  relatedData?: any;
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

// 앱 상태 관련 타입
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
  riskAnalysis: boolean;
  dataRefreshInterval: number;
}

// 소켓 이벤트 타입
export interface SocketEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string | Date;
}

// 페이지네이션 관련 타입
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} 