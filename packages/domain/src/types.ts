// 건강 데이터 타입
export interface HealthData {
  heartRate: number;
  oxygenLevel: number;
  ecg: number[];
  timestamp: Date;
  userId: string;
}

// 시계열 데이터 타입
export interface TimeSeriesData {
  value: number;
  timestamp: Date;
}

// 시계열 데이터 배열 타입
export interface TimeSeriesDataSet {
  data: TimeSeriesData[];
  label: string;
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
}

// 심전도 데이터
export interface ECGData {
  samples: number[];
  timestamp: Date;
  userId: string;
}

// 진단 결과
export interface DiagnosisResult {
  diagnosisId: string;
  conditionName: string;
  confidenceScore: number;
  timestamp: Date;
  userId: string;
  details?: string;
}

// 위험 점수
export interface RiskScore {
  score: number;  // 0-100 범위의 위험도
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  timestamp: Date;
}

// 의료 상담 질의
export interface ConsultQuery {
  question: string;
  context?: string;
  userId: string;
}

// 의료 상담 응답
export interface ConsultResponse {
  answer: string;
  references?: string[];
  timestamp: Date;
  modelUsed: string;
} 