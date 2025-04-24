// 보안 분석 요청 인터페이스
export interface SecurityAnalysisRequest {
  text: string;
  options?: {
    detailedAnalysis?: boolean;
    sensitiveDataCheck?: boolean;
    malwareCheck?: boolean;
    phishingCheck?: boolean;
  };
}

// 보안 분석 결과 인터페이스
export interface SecurityAnalysisResult {
  type: string;
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  recommendation?: string;
  affectedText?: string;
  confidence?: number;
}

// Hugging Face API 응답 인터페이스
export interface HuggingFaceApiResponse {
  results: Array<{
    label: string;
    score: number;
    detail?: string;
  }>;
  error?: string;
} 