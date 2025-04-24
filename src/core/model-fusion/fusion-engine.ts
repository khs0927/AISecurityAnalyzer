/**
 * 의료 멀티모달 AI 시스템 - 응답 융합 엔진
 * 여러 AI 모델의 응답을 통합하여 최적의 응답을 생성하는 엔진
 */

// 모델 응답 인터페이스
export interface ModelResponse {
  modelId: string;
  response: string;
  confidence?: number;
}

/**
 * 응답 융합 엔진 클래스
 * 여러 모델의 응답을 분석하고 최적의 응답을 생성합니다.
 */
export class ResponseFusionEngine {
  private static instance: ResponseFusionEngine;
  
  // 기본 모델 가중치 설정
  private modelWeights: Record<string, number> = {
    "Qwen/Qwen2.5-Omni-7B": 0.3,
    "Henrychur/MMed-Llama-3-8B-EnIns": 0.7
  };

  private constructor() {
    console.log('응답 융합 엔진 초기화...');
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): ResponseFusionEngine {
    if (!ResponseFusionEngine.instance) {
      ResponseFusionEngine.instance = new ResponseFusionEngine();
    }
    return ResponseFusionEngine.instance;
  }

  /**
   * 여러 모델의 응답을 융합하여 최종 응답 생성
   * @param responses 모델 응답 목록
   * @returns 융합된 응답
   */
  public fuseResponses(responses: ModelResponse[]): string {
    if (responses.length === 0) {
      return "응답할 수 있는 정보가 없습니다.";
    }
    
    if (responses.length === 1) {
      return responses[0].response;
    }
    
    console.log(`응답 융합: ${responses.length}개 모델 응답 통합`);
    
    // 각 모델 응답에서 핵심 포인트 추출
    const pointsByResponse = responses.map(r => {
      return {
        modelId: r.modelId,
        points: this.extractKeyPoints(r.response),
        confidence: r.confidence || this.modelWeights[r.modelId] || 0.5
      };
    });
    
    // 포인트별 점수 계산
    const pointScores: Record<string, number> = {};
    
    pointsByResponse.forEach(pr => {
      pr.points.forEach(point => {
        if (!pointScores[point]) {
          pointScores[point] = 0;
        }
        pointScores[point] += pr.confidence;
      });
    });
    
    // 점수 기반 정렬 및 상위 포인트 선택
    const sortedPoints = Object.entries(pointScores)
      .sort(([, a], [, b]) => b - a)
      .map(([point]) => point);
    
    // 중요 포인트 선별 (최대 5개)
    const topPoints = sortedPoints.slice(0, 5);
    
    // 최종 응답 생성을 위한 전문 모델 선택
    const medicalModel = responses.find(r => 
      r.modelId === "Henrychur/MMed-Llama-3-8B-EnIns");
    
    const generalModel = responses.find(r => 
      r.modelId === "Qwen/Qwen2.5-Omni-7B");
    
    // 의료 모델이 있으면 의료 모델 응답을 기본으로 사용
    let baseResponse = medicalModel ? medicalModel.response : 
      (generalModel ? generalModel.response : responses[0].response);
    
    // 중요 포인트가 응답에 없는 경우 추가
    for (const point of topPoints) {
      if (!baseResponse.includes(point)) {
        baseResponse += `\n\n추가 정보: ${point}`;
      }
    }
    
    return baseResponse;
  }

  /**
   * 텍스트에서 핵심 포인트 추출
   * @param text 텍스트
   * @returns 추출된 핵심 포인트 배열
   */
  private extractKeyPoints(text: string): string[] {
    // 문장 단위로 분리
    const sentences = text.split(/[.!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
    
    // 중복 제거
    const uniqueSentences = [...new Set(sentences)];
    
    // 길이가 긴 문장 우선 선택 (최대 10개)
    return uniqueSentences
      .sort((a, b) => b.length - a.length)
      .slice(0, 10);
  }

  /**
   * 모델 가중치 설정
   * @param modelId 모델 ID
   * @param weight 가중치 (0-1)
   */
  public setModelWeight(modelId: string, weight: number): void {
    this.modelWeights[modelId] = Math.max(0, Math.min(1, weight));
    console.log(`모델 가중치 설정: ${modelId} = ${this.modelWeights[modelId]}`);
  }
}

// 기본 인스턴스 내보내기
export default ResponseFusionEngine.getInstance(); 