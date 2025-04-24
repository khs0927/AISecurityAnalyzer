export interface SecurityAnalysisResult {
  category: string;
  score: number;
  description: string;
  recommendations?: string[];
}

export interface SecurityAnalysisRequest {
  text: string;
  model?: string;
}

export interface HuggingFaceModel {
  id: string;
  name: string;
  description?: string;
} 