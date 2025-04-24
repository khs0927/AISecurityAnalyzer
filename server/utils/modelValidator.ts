import { monitoringInstance } from '../monitoringInstance';
import { HfInference } from '@huggingface/inference';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config } from '../config';

/**
 * 모델 검증 및 초기화 유틸리티
 * 시스템 시작 시 필요한 AI 모델 상태를 확인하고 초기화합니다.
 */
export class ModelValidator {
  private static instance: ModelValidator;
  
  // 모델 상태 정보
  private modelStatus: Map<string, {
    ready: boolean;
    lastChecked: Date;
    error?: string;
    retries: number;
  }>;
  
  // 설정값
  private settings: {
    maxRetries: number;
    retryDelayMs: number;
    checkIntervalMs: number;
    localModelPath: string;
    modelTimeoutMs: number;
    maxConcurrentChecks: number;
  };
  
  // 현재 검증 중인 모델 수
  private currentChecks: number;
  
  // Hugging Face 클라이언트
  private hfClient: HfInference | null = null;
  
  private constructor() {
    this.modelStatus = new Map();
    this.currentChecks = 0;
    
    this.settings = {
      maxRetries: 3,
      retryDelayMs: 5000,
      checkIntervalMs: 60 * 60 * 1000, // 1시간마다 재확인
      localModelPath: path.join(process.cwd(), 'models'),
      modelTimeoutMs: 30000, // 30초
      maxConcurrentChecks: 2, // 동시에 검증할 수 있는 최대 모델 수
    };
    
    // 로컬 모델 디렉토리 확인
    this.ensureModelDirectory();
  }
  
  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): ModelValidator {
    if (!ModelValidator.instance) {
      ModelValidator.instance = new ModelValidator();
    }
    return ModelValidator.instance;
  }
  
  /**
   * 모델 디렉토리 존재 확인
   */
  private ensureModelDirectory(): void {
    if (!fs.existsSync(this.settings.localModelPath)) {
      try {
        fs.mkdirSync(this.settings.localModelPath, { recursive: true });
        monitoringInstance.log('debug', `모델 디렉토리 생성 완료: ${this.settings.localModelPath}`);
      } catch (error) {
        monitoringInstance.log('error', `모델 디렉토리 생성 실패: ${this.settings.localModelPath}`, { error });
      }
    }
  }
  
  /**
   * Hugging Face 클라이언트 초기화
   * @param apiKey API 키
   */
  public initHuggingFaceClient(apiKey: string): void {
    try {
      this.hfClient = new HfInference(apiKey);
      monitoringInstance.log('info', 'Hugging Face 클라이언트 초기화 완료');
    } catch (error) {
      monitoringInstance.log('error', 'Hugging Face 클라이언트 초기화 실패', { error });
      throw error;
    }
  }
  
  /**
   * 모델 검증
   * @param modelId 모델 식별자 (Hugging Face 모델 ID 또는 로컬 모델 이름)
   * @param modelType 모델 타입 ('hf', 'local', 'api')
   * @param testInput 모델 테스트를 위한 입력 데이터
   * @param apiEndpoint API 엔드포인트 (modelType이 'api'인 경우)
   * @param apiKey API 키 (modelType이 'api'인 경우)
   * @returns 모델 검증 결과 (비동기)
   */
  public async validateModel(
    modelId: string,
    modelType: 'hf' | 'local' | 'api',
    testInput?: any,
    apiEndpoint?: string,
    apiKey?: string
  ): Promise<boolean> {
    // 이미 검증 중인 모델이 너무 많은 경우 대기
    while (this.currentChecks >= this.settings.maxConcurrentChecks) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.currentChecks++;
    
    try {
      monitoringInstance.log('info', `모델 검증 시작: ${modelId} (${modelType})`, { testInput });
      
      // 이미 준비된 모델인 경우 재확인 필요성 검사
      if (this.modelStatus.has(modelId)) {
        const status = this.modelStatus.get(modelId)!;
        
        // 이미 준비되었고 최근에 확인한 경우 바로 결과 반환
        if (
          status.ready && 
          Date.now() - status.lastChecked.getTime() < this.settings.checkIntervalMs
        ) {
          monitoringInstance.log('debug', `모델 이미 준비됨: ${modelId} (마지막 확인: ${status.lastChecked.toISOString()})`);
          return true;
        }
      }
      
      // 상태 초기화
      this.modelStatus.set(modelId, {
        ready: false,
        lastChecked: new Date(),
        retries: 0,
      });
      
      let isReady = false;
      
      switch (modelType) {
        case 'hf':
          isReady = await this.validateHuggingFaceModel(modelId, testInput);
          break;
        case 'local':
          isReady = await this.validateLocalModel(modelId);
          break;
        case 'api':
          isReady = await this.validateApiModel(modelId, apiEndpoint!, apiKey, testInput);
          break;
        default:
          throw new Error(`지원되지 않는 모델 타입: ${modelType}`);
      }
      
      // 상태 업데이트
      this.modelStatus.set(modelId, {
        ready: isReady,
        lastChecked: new Date(),
        error: isReady ? undefined : '모델 검증 실패',
        retries: 0,
      });
      
      monitoringInstance.log(isReady ? 'info' : 'error', `모델 검증 ${isReady ? '성공' : '실패'}: ${modelId}`);
      
      return isReady;
    } catch (error) {
      // 오류 발생 시 상태 업데이트
      const currentStatus = this.modelStatus.get(modelId);
      const retries = (currentStatus?.retries || 0) + 1;
      
      this.modelStatus.set(modelId, {
        ready: false,
        lastChecked: new Date(),
        error: `모델 검증 중 오류: ${error}`,
        retries,
      });
      
      monitoringInstance.log('error', `모델 검증 오류: ${modelId}`, { error, retries });
      
      // 재시도 최대 횟수보다 적은 경우 재시도
      if (retries < this.settings.maxRetries) {
        monitoringInstance.log('info', `모델 검증 재시도 (${retries}/${this.settings.maxRetries}): ${modelId}`);
        
        await new Promise(resolve => setTimeout(resolve, this.settings.retryDelayMs));
        
        this.currentChecks--;
        return this.validateModel(modelId, modelType, testInput, apiEndpoint, apiKey);
      }
      
      return false;
    } finally {
      this.currentChecks--;
    }
  }
  
  /**
   * Hugging Face 모델 검증
   * @param modelId Hugging Face 모델 ID
   * @param testInput 테스트 입력 데이터
   * @returns 검증 결과
   */
  private async validateHuggingFaceModel(modelId: string, testInput?: any): Promise<boolean> {
    if (!this.hfClient) {
      throw new Error('Hugging Face 클라이언트가 초기화되지 않았습니다.');
    }
    
    try {
      // Qwen2.5-Omni-7B 모델 검증
      if (modelId.includes('Qwen') || modelId.includes('qwen')) {
        const testPrompt = testInput?.prompt || 'Explain what this model can do in one sentence.';
        
        await Promise.race([
          this.hfClient.textGeneration({
            model: modelId,
            inputs: testPrompt,
            parameters: {
              max_new_tokens: 50,
              temperature: 0.7,
            },
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('모델 응답 시간 초과')), this.settings.modelTimeoutMs)
          ),
        ]);
        
        return true;
      }
      
      // MMed-Llama-3-8B 모델 검증 (의료 이미지 모델)
      if (modelId.includes('MMed') || modelId.includes('llama')) {
        // 테스트 입력이 이미지인 경우
        if (testInput?.image) {
          const imageData = testInput.image;
          
          await Promise.race([
            this.hfClient.imageToText({
              model: modelId,
              data: imageData,
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('모델 응답 시간 초과')), this.settings.modelTimeoutMs)
            ),
          ]);
        } else {
          // 이미지 없을 경우 단순 모델 정보 조회
          await Promise.race([
            this.hfClient.modelInfo({
              model: modelId,
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('모델 정보 조회 시간 초과')), this.settings.modelTimeoutMs)
            ),
          ]);
        }
        
        return true;
      }
      
      // 기타 모델 타입
      await Promise.race([
        this.hfClient.modelInfo({ model: modelId }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('모델 정보 조회 시간 초과')), this.settings.modelTimeoutMs)
        ),
      ]);
      
      return true;
    } catch (error) {
      monitoringInstance.log('error', `Hugging Face 모델 검증 실패: ${modelId}`, { error });
      return false;
    }
  }
  
  /**
   * 로컬 모델 검증
   * @param modelId 로컬 모델 이름
   * @returns 검증 결과
   */
  private async validateLocalModel(modelId: string): Promise<boolean> {
    try {
      const modelPath = path.join(this.settings.localModelPath, modelId);
      
      // 모델 파일/디렉토리 존재 여부 확인
      if (!fs.existsSync(modelPath)) {
        monitoringInstance.log('error', `로컬 모델을 찾을 수 없음: ${modelPath}`);
        return false;
      }
      
      // 모델 메타데이터 파일 확인
      const metaPath = `${modelPath}.meta.json`;
      
      if (fs.existsSync(metaPath)) {
        const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        
        // 메타데이터 유효성 검사
        if (
          !metaData.version ||
          !metaData.createdAt ||
          !metaData.modelType
        ) {
          monitoringInstance.log('error', `모델 메타데이터 유효하지 않음: ${metaPath}`);
          return false;
        }
      } else {
        // 메타데이터 없이 기본 파일만 확인
        if (fs.statSync(modelPath).isDirectory()) {
          // 디렉토리인 경우 필수 파일 확인
          const files = fs.readdirSync(modelPath);
          
          // 일반적인 모델 구조에 필요한 파일 확인
          const requiredFiles = ['config.json', 'pytorch_model.bin', 'tokenizer.json'];
          
          if (!requiredFiles.some(file => files.includes(file))) {
            monitoringInstance.log('error', `모델 디렉토리에 필수 파일이 없음: ${modelPath}`);
            return false;
          }
        } else {
          // 확장자 확인
          const validExtensions = ['.bin', '.onnx', '.pt', '.h5', '.model'];
          const ext = path.extname(modelPath).toLowerCase();
          
          if (!validExtensions.includes(ext)) {
            monitoringInstance.log('error', `지원되지 않는 모델 파일 형식: ${ext}`);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      monitoringInstance.log('error', `로컬 모델 검증 실패: ${modelId}`, { error });
      return false;
    }
  }
  
  /**
   * API 기반 모델 검증
   * @param modelId 모델 식별자
   * @param apiEndpoint API 엔드포인트
   * @param apiKey API 키
   * @param testInput 테스트 입력 데이터
   * @returns 검증 결과
   */
  private async validateApiModel(
    modelId: string,
    apiEndpoint: string,
    apiKey?: string,
    testInput?: any
  ): Promise<boolean> {
    try {
      // 기본 테스트 입력
      const input = testInput || {
        prompt: "What is the purpose of this model?",
        max_tokens: 10
      };
      
      // API 요청 헤더
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      // API 요청 및 응답 타임아웃 설정
      const response = await axios.post(apiEndpoint, input, {
        headers,
        timeout: this.settings.modelTimeoutMs,
      });
      
      // 응답 상태 확인
      if (response.status !== 200) {
        monitoringInstance.log('error', `API 모델 응답 오류: ${response.status}`, { 
          modelId, 
          statusText: response.statusText 
        });
        return false;
      }
      
      // 응답 데이터 유무 확인
      if (!response.data) {
        monitoringInstance.log('error', `API 모델 응답에 데이터 없음`, { modelId });
        return false;
      }
      
      return true;
    } catch (error) {
      monitoringInstance.log('error', `API 모델 검증 실패: ${modelId}`, { 
        error,
        endpoint: apiEndpoint,
      });
      return false;
    }
  }
  
  /**
   * 모델 준비 상태 조회
   * @param modelId 모델 식별자
   * @returns 모델 준비 상태 및 관련 정보
   */
  public getModelStatus(modelId: string): {
    ready: boolean;
    lastChecked: Date | null;
    error?: string;
    retries: number;
  } {
    if (this.modelStatus.has(modelId)) {
      return { ...this.modelStatus.get(modelId)! };
    }
    
    return {
      ready: false,
      lastChecked: null,
      error: '모델 검증이 실행되지 않음',
      retries: 0,
    };
  }
  
  /**
   * 모든 모델 상태 조회
   */
  public getAllModelStatus(): Map<string, {
    ready: boolean;
    lastChecked: Date;
    error?: string;
    retries: number;
  }> {
    return new Map(this.modelStatus);
  }
  
  /**
   * 설정 업데이트
   * @param settings 새로운 설정값
   */
  public updateSettings(settings: Partial<typeof this.settings>): void {
    this.settings = {
      ...this.settings,
      ...settings,
    };
    
    monitoringInstance.log('info', '모델 검증 설정 업데이트됨', { 
      newSettings: this.settings 
    });
  }
}

// 싱글톤 인스턴스 기본 내보내기
export default ModelValidator.getInstance(); 