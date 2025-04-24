/**
 * 의료 멀티모달 AI 시스템 - 모델 라우터
 * 입력 데이터 유형에 따라 적절한 AI 모델로 라우팅하는 시스템
 */

// 멀티모달 입력 인터페이스
export interface MultimodalInput {
  text: string;
  image?: Buffer | string;
  audio?: Float32Array | string;
  metadata?: {
    healthData?: any;
    context?: any[];
    pubmed?: any[];
  };
}

// 모델 설정 인터페이스
export interface ModelConfig {
  modelId: string;
  apiPath: string;
  supportsMultimodal: boolean;
  defaultParameters: Record<string, any>;
}

/**
 * 의료 모델 라우터 클래스
 * 입력 데이터 성격에 따라 적절한 모델을 선택합니다.
 */
export class MedicalModelRouter {
  private static instance: MedicalModelRouter;
  
  // 모델 설정
  private models: Record<string, ModelConfig> = {
    "qwen2.5-omni": {
      modelId: "Qwen/Qwen2.5-Omni-7B",
      apiPath: "models/Qwen/Qwen2.5-Omni-7B",
      supportsMultimodal: true,
      defaultParameters: {
        max_new_tokens: 512,
        temperature: 0.7,
        top_p: 0.9
      }
    },
    "mmed-llama": {
      modelId: "Henrychur/MMed-Llama-3-8B-EnIns",
      apiPath: "models/Henrychur/MMed-Llama-3-8B-EnIns",
      supportsMultimodal: false,
      defaultParameters: {
        max_new_tokens: 512,
        temperature: 0.3,
        top_p: 0.95
      }
    }
  };

  // 의료 용어 목록 (간소화됨)
  private medicalTerms: string[] = [
    "심장", "심근경색", "부정맥", "혈압", "맥박", "심박수", "협심증",
    "심부전", "심장마비", "판막", "심전도", "ECG", "EKG", "심방", "심실",
    "고혈압", "저혈압", "당뇨", "인슐린", "콜레스테롤", "혈당"
  ];

  private constructor() {
    console.log('의료 모델 라우터 초기화...');
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): MedicalModelRouter {
    if (!MedicalModelRouter.instance) {
      MedicalModelRouter.instance = new MedicalModelRouter();
    }
    return MedicalModelRouter.instance;
  }

  /**
   * 입력 데이터 분석 및 적절한 모델 선택
   * @param input 멀티모달 입력 데이터
   * @returns 선택된 모델 ID
   */
  public routeQuery(input: MultimodalInput): string {
    // 1. 멀티모달 데이터 여부 확인 (이미지/오디오 존재)
    const isMultimodal = !!input.image || !!input.audio;
    
    // 2. 의료 관련 질의인지 확인
    const inputLower = input.text.toLowerCase();
    const isMedicalQuery = this.medicalTerms.some(term => inputLower.includes(term));
    
    console.log(`입력 분석: 멀티모달=${isMultimodal}, 의료=${isMedicalQuery}`);

    // 3. 라우팅 로직
    if (isMultimodal) {
      // 멀티모달 입력은 항상 Qwen 모델로 라우팅
      return this.models["qwen2.5-omni"].modelId;
    } else if (isMedicalQuery) {
      // 의료 관련 텍스트 질의는 MMed-Llama 모델 우선
      return this.models["mmed-llama"].modelId;
    } else {
      // 일반 질의는 Qwen 모델로 라우팅
      return this.models["qwen2.5-omni"].modelId;
    }
  }

  /**
   * 모델 설정 가져오기
   * @param modelKey 모델 키
   */
  public getModelConfig(modelKey: string): ModelConfig | null {
    return this.models[modelKey] || null;
  }

  /**
   * 모델 ID로 설정 가져오기
   * @param modelId 모델 ID
   */
  public getModelConfigById(modelId: string): ModelConfig | null {
    return Object.values(this.models).find(config => config.modelId === modelId) || null;
  }

  /**
   * 의료 질의 복잡도 평가 (0-1)
   * @param text 입력 텍스트
   */
  private assessMedicalComplexity(text: string): number {
    const textLower = text.toLowerCase();
    const foundTerms = this.medicalTerms.filter(term => textLower.includes(term));
    
    // 발견된 의료 용어 수 / 총 단어 수
    const wordCount = text.split(/\s+/).length;
    const complexity = foundTerms.length / (wordCount || 1);
    
    return Math.min(1, complexity * 3); // 0-1 범위로 정규화
  }
}

// 기본 인스턴스 내보내기
export default MedicalModelRouter.getInstance(); 