import { HfInference } from '@huggingface/inference';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import modelCache from '../utils/modelCache';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { monitoringInstance } from '../monitoringInstance';

// Hugging Face API 클라이언트 초기화 - 다양한 환경 변수 형식 지원
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY || config.huggingface.apiKey);

// 멀티모달 입력 인터페이스 정의
export interface MultimodalInput {
  text?: string;
  image?: Buffer | string; // 이미지 데이터 또는 Base64 인코딩된 문자열
  audio?: Float32Array | Buffer; // 오디오 데이터
  video?: {
    frames: Buffer[]; // 비디오 프레임
    audioTrack?: Float32Array | Buffer; // 비디오 오디오 트랙
  };
}

/**
 * 코드 보안 취약점 분석 클래스
 */
export class SecurityAnalyzer {
  // 캐싱 설정
  private useCache: boolean = true; // 캐싱 활성화 여부
  private modelIds = {
    qwen: "Qwen/Qwen2.5-Omni-7B",
    mmed: "Henrychur/MMed-Llama-3-8B"
  };
  
  // 배치 처리 설정
  private requestQueue: Map<string, Array<{request: unknown, resolve: (value: unknown) => void, reject: (reason?: unknown) => void}>> = new Map();
  private processingBatch: boolean = false;
  private batchTimeoutMs: number = 50; // 배치 처리 대기 시간 (ms)
  private maxConcurrentRequests: number = 2; // 동시 요청 수 제한
  private activeRequests: number = 0;
  private requestSemaphore: Promise<void> = Promise.resolve();
  
  /**
   * 소스 코드의 보안 취약점을 분석합니다.
   * @param sourceCode 분석할 소스 코드
   * @param language 프로그래밍 언어 (기본값: javascript)
   * @returns 취약점 분석 결과
   */
  async analyzeCode(sourceCode: string, language = 'javascript'): Promise<SecurityAnalysisResult> {
    const startTime = Date.now();
    monitoringInstance.log('info', '코드 보안 분석 시작', { language, codeLength: sourceCode.length });

    try {
      await this.validateModels();

      // 캐시 키 생성
      const cacheKey = modelCache.generateKey('sourceCode', JSON.stringify({
        code: sourceCode,
        language,
      }));

      // 캐시에서 결과 확인
      const cachedResult = modelCache.get(cacheKey);
      if (cachedResult) {
        monitoringInstance.log('info', '캐시된 분석 결과 사용', { language });
        monitoringInstance.logPerformance('analyzeSourceCode', Date.now() - startTime, true, { cached: true });
        return cachedResult;
      }
      
      // 분석 프롬프트 생성
      const prompt = `
다음 ${language} 코드의 보안 취약점을 분석하고 점수화해주세요:

\`\`\`${language}
${sourceCode}
\`\`\`

다음 카테고리에 따라 분석해 주세요:
1. 입력 검증 및 XSS 취약점
2. SQL 인젝션 취약점
3. 인증 및 권한 관련 취약점
4. 민감 정보 노출
5. 암호화 관련 취약점
6. 의존성 취약점

각 카테고리별로 0-10점 척도로 평가하고, 발견된 취약점과 해결 방법을 제시해주세요.
      `;

      // 병렬로 두 모델 호출 (성능 향상)
      const [qwenResponse, mmedResponse] = await Promise.all([
        // Qwen 2.5 Omni 모델을 사용한 코드 취약점 분석
        this.queueRequest(this.modelIds.qwen, {
          inputs: prompt,
          parameters: {
            max_new_tokens: 1024,
            temperature: 0.3,
            top_p: 0.95,
          }
        }),
        
        // MMed-Llama-3-8B 모델을 사용한 코드 취약점 분석 (의료 도메인 특화)
        this.queueRequest(this.modelIds.mmed, {
          inputs: prompt,
          parameters: {
            max_new_tokens: 1024,
            temperature: 0.3,
            top_p: 0.95,
          }
        })
      ]);

      // 두 모델의 결과를 결합하여 더 포괄적인 분석 결과 생성
      const combinedAnalysis = this.combineAnalysisResults(
        qwenResponse.generated_text || "",
        mmedResponse.generated_text || ""
      );
      
      // 분석 결과 구조화
      const result = {
        timestamp: new Date().toISOString(),
        sourceLanguage: language,
        analysisResults: combinedAnalysis,
        vulnerabilities: this.extractVulnerabilities(combinedAnalysis),
        overallScore: this.calculateOverallScore(combinedAnalysis),
        recommendations: this.extractRecommendations(combinedAnalysis),
      };
      
      // 캐시에 결과 저장 (24시간 유효)
      modelCache.set(cacheKey, result, 24 * 60 * 60);
      
      monitoringInstance.logPerformance('analyzeSourceCode', Date.now() - startTime, true);
      return result;
    } catch (error) {
      monitoringInstance.log('error', '코드 보안 분석 중 오류 발생', { error: (error as Error).message, stack: (error as Error).stack }, 'model');
      throw new Error('보안 분석 실패: ' + (error as Error).message);
    }
  }

  /**
   * 멀티모달 데이터를 분석합니다.
   * @param input 멀티모달 입력 데이터
   * @returns 분석 결과
   */
  async analyzeMultimodal(input: MultimodalInput): Promise<unknown> {
    const startTime = Date.now();
    monitoringInstance.log('info', '멀티모달 보안 분석 시작', { dataTypes: Object.keys(input) });

    try {
      await this.validateModels();

      // 각 데이터 타입에 대한 해시 생성
      const dataHash = this.generateMultimodalDataHash(input);
      
      // 캐시 키 생성
      const cacheKey = modelCache.generateKey('multimodal', JSON.stringify({
        dataHash,
      }));

      // 캐시에서 결과 확인
      const cachedResult = modelCache.get(cacheKey);
      if (cachedResult) {
        monitoringInstance.log('info', '캐시된 멀티모달 분석 결과 사용', { dataTypes: Object.keys(input) });
        monitoringInstance.logPerformance('analyzeMultimodal', Date.now() - startTime, true, { cached: true });
        return cachedResult;
      }
      
      const payload: Record<string, unknown> = {
        inputs: {},
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          top_p: 0.9
        }
      };

      // 멀티모달 입력 처리
      const inputs = payload.inputs as Record<string, unknown>;

      if (input.text) {
        inputs.text = input.text;
      }

      if (input.image) {
        inputs.images = [
          input.image instanceof Buffer ? 
            await this.encodeImageToBase64(input.image) : 
            input.image
        ];
      }

      if (input.audio) {
        inputs.audio = [
          input.audio instanceof Float32Array ? 
            Array.from(input.audio) : 
            await this.encodeAudioToBase64(input.audio as Buffer)
        ];
      }

      if (input.video) {
        inputs.video = {
          frames: await Promise.all(input.video.frames.map(frame => 
            this.encodeImageToBase64(frame)
          )),
          audioTrack: input.video.audioTrack ? 
            Array.from(input.video.audioTrack instanceof Float32Array ? 
              input.video.audioTrack : 
              new Float32Array(input.video.audioTrack as Buffer)
            ) : 
            undefined
        };
      }

      // Qwen2.5-Omni-7B 모델을 사용한 멀티모달 분석
      const response = await this.queueRequest(this.modelIds.qwen, payload);
      
      // 캐시에 결과 저장 (12시간 유효)
      modelCache.set(cacheKey, response, 12 * 60 * 60);
      
      monitoringInstance.logPerformance('analyzeMultimodal', Date.now() - startTime, true);
      return response;
    } catch (error) {
      monitoringInstance.log('error', '멀티모달 분석 중 오류 발생', { error: (error as Error).message, stack: (error as Error).stack }, 'model');
      throw new Error('멀티모달 분석 실패: ' + (error as Error).message);
    }
  }

  /**
   * 네트워크 트래픽의 이상을 감지합니다.
   * @param trafficData 네트워크 트래픽 데이터
   * @returns 이상 감지 결과
   */
  async detectNetworkAnomalies(trafficData: unknown): Promise<AnomalyDetectionResult> {
    // 네트워크 이상 감지 로직 구현
    // 여기서는 샘플 구현만 제공
    return {
      timestamp: new Date().toISOString(),
      anomalies: [],
      riskLevel: 'low',
      details: '이상 트래픽이 감지되지 않았습니다.',
    };
  }

  /**
   * 시스템 행동 분석을 수행합니다.
   * @param behaviorData 시스템 행동 데이터
   * @returns 행동 분석 결과
   */
  async analyzeBehavior(behaviorData: unknown): Promise<BehaviorAnalysisResult> {
    // 행동 분석 로직 구현
    // 여기서는 샘플 구현만 제공
    return {
      timestamp: new Date().toISOString(),
      suspiciousActivities: [],
      riskLevel: 'low',
      details: '의심스러운 행동이 감지되지 않았습니다.',
    };
  }

  /**
   * 종합 보안 보고서를 생성합니다.
   * @param analysisResults 다양한 분석 결과
   * @returns 종합 보안 보고서
   */
  async generateSecurityReport(analysisResults: unknown[]): Promise<SecurityReport> {
    // 보안 보고서 생성 로직 구현
    return {
      timestamp: new Date().toISOString(),
      summary: '종합 보안 분석 결과',
      overallRiskLevel: 'medium',
      findings: [],
      recommendations: [],
    };
  }

  /**
   * 분석 텍스트에서 취약점을 추출합니다.
   * @param analysisText 분석 텍스트
   * @returns 취약점 배열
   */
  private extractVulnerabilities(analysisText: string): Vulnerability[] {
    try {
      const vulnerabilities: Vulnerability[] = [];
      
      // 카테고리 정의
      const categories = [
        '입력 검증 및 XSS 취약점',
        'SQL 인젝션 취약점',
        '인증 및 권한 관련 취약점',
        '민감 정보 노출',
        '암호화 관련 취약점',
        '의존성 취약점'
      ];
      
      // 각 카테고리별 취약점 추출
      for (const category of categories) {
        const categoryContent = this.extractCategoryContent(analysisText, category);
        if (categoryContent) {
          // 점수 추출 (0-10 사이의 숫자)
          const scoreMatch = categoryContent.match(/(\d+(\.\d+)?)\s*\/\s*10|점수\s*:\s*(\d+(\.\d+)?)|평가\s*:\s*(\d+(\.\d+)?)/i);
          let score = 0;
          
          if (scoreMatch) {
            // 여러 캡처 그룹 중에서 숫자가 포함된 그룹 찾기
            const scoreStr = scoreMatch[1] || scoreMatch[3] || scoreMatch[5];
            score = parseFloat(scoreStr);
          }
          
          // 취약점 설명 추출
          let description = categoryContent.replace(/(\d+(\.\d+)?)\s*\/\s*10|점수\s*:\s*(\d+(\.\d+)?)|평가\s*:\s*(\d+(\.\d+)?)/g, '').trim();
          
          // 불필요한 제목이나 접두사 제거
          description = description.replace(new RegExp(`^${category}(\\s*:)?`, 'i'), '').trim();
          
          // 설명이 너무 길면 줄이기
          if (description.length > 500) {
            description = description.substring(0, 497) + '...';
          }
          
          vulnerabilities.push({
            category,
            score,
            severity: this.getSeverityFromScore(score),
            description
          });
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      monitoringInstance.log('error', '취약점 추출 중 오류 발생', { error }, 'model');
      return [];
    }
  }

  /**
   * 점수에 따른 심각도를 반환합니다.
   * @param score 점수 (0-10)
   * @returns 심각도 수준
   */
  private getSeverityFromScore(score: number): SeverityLevel {
    if (score >= 8) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * 분석 텍스트에서 총점을 계산합니다.
   * @param analysisText 분석 텍스트
   * @returns 계산된 총점
   */
  private calculateOverallScore(analysisText: string): number {
    // 모든 점수를 찾아 평균 계산
    const scores: number[] = [];
    const scoreRegex = /(\d+)\s*\/\s*10|점수[^\d]*(\d+)/g;
    let match;
    
    while ((match = scoreRegex.exec(analysisText)) !== null) {
      const score = parseInt(match[1] || match[2], 10);
      if (!isNaN(score) && score >= 0 && score <= 10) {
        scores.push(score);
      }
    }
    
    if (scores.length === 0) return 5; // 기본값
    
    // 점수가 높을수록 취약점이 많으므로, 역으로 계산
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(10 - avg); // 10에서 뺌 (높은 점수 = 낮은 보안)
  }

  /**
   * 분석 텍스트에서 권장 사항을 추출합니다.
   * @param analysisText 분석 텍스트
   * @returns 추출된 권장 사항 목록
   */
  private extractRecommendations(analysisText: string): string[] {
    // 권장 사항 추출 로직
    const recommendations: string[] = [];
    
    // "해결 방법", "권장 사항", "개선 방법" 등의 키워드 이후 내용 추출
    const recommendationRegex = /(?:해결\s*방법|권장\s*사항|개선\s*방법)[^\n]*:\s*([^\n]+)/gi;
    let match;
    
    while ((match = recommendationRegex.exec(analysisText)) !== null) {
      if (match[1]) {
        recommendations.push(match[1].trim());
      }
    }
    
    return recommendations;
  }

  /**
   * 두 모델의 분석 결과를 결합합니다.
   * @param qwenAnalysis Qwen 모델 분석 결과
   * @param mmedAnalysis MMed-Llama 모델 분석 결과
   * @returns 결합된 분석 결과
   */
  private combineAnalysisResults(qwenAnalysis: string, mmedAnalysis: string): string {
    // 카테고리별로 추출
    const categories = [
      '입력 검증 및 XSS 취약점',
      'SQL 인젝션 취약점',
      '인증 및 권한 관련 취약점',
      '민감 정보 노출',
      '암호화 관련 취약점',
      '의존성 취약점'
    ];
    
    let combinedResult = "# 보안 분석 결과 (Qwen2.5-Omni 및 MMed-Llama-3 모델 기반)\n\n";
    
    categories.forEach(category => {
      combinedResult += `## ${category}\n`;
      
      // Qwen 결과에서 해당 카테고리 추출
      const qwenMatch = this.extractCategoryContent(qwenAnalysis, category);
      if (qwenMatch) {
        combinedResult += `### Qwen2.5-Omni 분석:\n${qwenMatch}\n\n`;
      }
      
      // MMed-Llama 결과에서 해당 카테고리 추출
      const mmedMatch = this.extractCategoryContent(mmedAnalysis, category);
      if (mmedMatch) {
        combinedResult += `### MMed-Llama-3 분석:\n${mmedMatch}\n\n`;
      }
      
      combinedResult += "\n";
    });
    
    // 권장사항 추출 및 결합
    combinedResult += "## 개선 권장사항\n";
    
    const qwenRecommendations = this.extractRecommendations(qwenAnalysis);
    const mmedRecommendations = this.extractRecommendations(mmedAnalysis);
    
    // Set을 사용하여 중복 제거 (타입스크립트 호환성 개선)
    const allRecommendations = Array.from(new Set([...qwenRecommendations, ...mmedRecommendations]));
    allRecommendations.forEach(rec => {
      combinedResult += `- ${rec}\n`;
    });
    
    return combinedResult;
  }

  /**
   * 분석 텍스트에서 특정 카테고리의 내용을 추출합니다.
   * @param analysisText 분석 텍스트
   * @param category 카테고리 이름
   * @returns 추출된 카테고리 내용
   */
  private extractCategoryContent(analysisText: string, category: string): string | null {
    const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escapedCategory}[\\s\\S]*?((?=\\d+\\.|## |\\n\\n|$))`, 'i');
    const match = analysisText.match(regex);
    return match ? match[0].trim() : null;
  }

  /**
   * 이미지 버퍼를 Base64 문자열로 인코딩합니다.
   * @param imageBuffer 이미지 버퍼
   * @returns Base64 인코딩된 문자열
   */
  private async encodeImageToBase64(imageBuffer: Buffer): Promise<string> {
    try {
      return imageBuffer.toString('base64');
    } catch (error) {
      monitoringInstance.log('error', '이미지 인코딩 실패', { error }, 'model');
      throw new Error('이미지 인코딩 실패');
    }
  }

  /**
   * 오디오 버퍼를 Base64 문자열로 인코딩합니다.
   * @param audioBuffer 오디오 버퍼
   * @returns Base64 인코딩된 문자열
   */
  private async encodeAudioToBase64(audioBuffer: Buffer): Promise<string> {
    try {
      return audioBuffer.toString('base64');
    } catch (error) {
      monitoringInstance.log('error', '오디오 인코딩 실패', { error }, 'model');
      throw new Error('오디오 인코딩 실패');
    }
  }

  /**
   * 지연 로딩을 위한 모델 검증 메서드
   * 모델이 준비되었는지 확인하고 필요시 초기화합니다.
   */
  async validateModels(): Promise<boolean> {
    const startTime = Date.now();
    monitoringInstance.log('info', 'AI 모델 유효성 검사 시작', { models: this.modelIds });
    let allValid = true;

    for (const modelKey in this.modelIds) {
      const modelId = this.modelIds[modelKey as keyof typeof this.modelIds];
      try {
        // 간단한 API 호출로 모델 상태 확인 (예: textGeneration 또는 zeroShotClassification 사용)
        await hf.request({
          model: modelId,
          data: { inputs: 'test' }, // 간단한 테스트 입력
          task: 'text-generation' // 또는 다른 적절한 task
        });
        monitoringInstance.log('info', `모델 ${modelId} 유효성 검사 통과`, {}, 'model');
      } catch (error) {
        monitoringInstance.log('error', `모델 ${modelId} 유효성 검사 실패`, {
          error: (error as Error).message,
        }, 'model');
        allValid = false;
      }
    }
    monitoringInstance.logPerformance('validateModels', Date.now() - startTime, allValid);
    return allValid;
  }

  /**
   * 모델 요청을 큐에 추가하고 배치 처리 수행
   * @param modelId 모델 ID
   * @param request 요청 내용
   * @returns 모델 응답
   */
  private async queueRequest(modelId: string, request: unknown): Promise<unknown> {
    // 동시 요청 수 제한 관리
    if (this.activeRequests >= this.maxConcurrentRequests) {
      await this.requestSemaphore;
    }
    
    return new Promise((resolve, reject) => {
      // 모델별 큐가 없으면 생성
      if (!this.requestQueue.has(modelId)) {
        this.requestQueue.set(modelId, []);
      }
      
      // 요청을 큐에 추가
      this.requestQueue.get(modelId)!.push({
        request,
        resolve,
        reject
      });
      
      // 배치 처리 시작 (아직 진행 중이 아니라면)
      if (!this.processingBatch) {
        this.processBatchRequests();
      }
    });
  }
  
  /**
   * 배치 요청 처리 실행
   * 일정 시간(batchTimeoutMs) 동안 요청을 모아서 한 번에 처리
   */
  private async processBatchRequests(): Promise<void> {
    try {
      // 배치 처리 중 표시
      this.processingBatch = true;
      
      // 일정 시간 대기
      await new Promise(resolve => setTimeout(resolve, this.batchTimeoutMs));
      
      // 모든 모델 큐 처리
      const processingPromises: Promise<void>[] = [];
      
      for (const [modelId, requests] of this.requestQueue.entries()) {
        if (requests.length > 0) {
          processingPromises.push(this.processSingleModelBatch(modelId, requests));
          
          // 처리 시작한 요청은 큐에서 제거
          this.requestQueue.set(modelId, []);
        }
      }
      
      // 모든 배치 처리 완료 대기
      await Promise.all(processingPromises);
      
    } catch (error) {
      monitoringInstance.log('error', '배치 요청 처리 중 오류 발생', { error }, 'model');
    } finally {
      // 아직 큐에 요청이 남아있다면 계속 처리
      const hasRemainingRequests = [...this.requestQueue.values()].some(queue => queue.length > 0);
      
      if (hasRemainingRequests) {
        this.processBatchRequests();
      } else {
        this.processingBatch = false;
      }
    }
  }
  
  /**
   * 단일 모델에 대한 배치 처리
   * @param modelId 모델 ID
   * @param requests 요청 배열
   */
  private async processSingleModelBatch(
    modelId: string, 
    requests: Array<{request: unknown, resolve: (value: unknown) => void, reject: (reason?: unknown) => void}>
  ): Promise<void> {
    // 동시 요청 수 제한 적용
    this.activeRequests++;
    let semaphoreResolver: (() => void) | null = null;
    this.requestSemaphore = new Promise<void>(resolve => {
      semaphoreResolver = resolve;
    });
    
    try {
      if (requests.length === 1) {
        // 단일 요청 처리
        await this.processSingleRequest(modelId, requests[0]);
      } else {
        // 여러 요청 병렬 처리
        await this.processMultipleRequests(modelId, requests);
      }
    } catch (error) {
      // 배치 전체 처리 실패 - 모든 요청에 오류 반환
      monitoringInstance.log('error', `${modelId} 배치 처리 중 오류 발생`, { error }, 'model');
      requests.forEach(({ reject }) => reject(error));
    } finally {
      // 동시 요청 수 제한 해제
      this.activeRequests--;
      if (semaphoreResolver) {
        semaphoreResolver();
      }
    }
  }

  /**
   * 단일 요청 처리
   */
  private async processSingleRequest(
    modelId: string,
    { request, resolve, reject }: {request: unknown, resolve: (value: unknown) => void, reject: (reason?: unknown) => void}
  ): Promise<void> {
    try {
      const result = await this.sendRequestToModel(modelId, request);
      resolve(result);
    } catch (error) {
      monitoringInstance.log('error', `${modelId} 단일 요청 처리 실패`, { error }, 'model');
      reject(error);
    }
  }

  /**
   * 다중 요청 병렬 처리
   */
  private async processMultipleRequests(
    modelId: string,
    requests: Array<{request: unknown, resolve: (value: unknown) => void, reject: (reason?: unknown) => void}>
  ): Promise<void> {
    try {
      // 병렬 처리
      await Promise.all(
        requests.map(({ request, resolve, reject }) => 
          this.processSingleRequest(modelId, { request, resolve, reject })
        )
      );
    } catch (error) {
      // 전체 병렬 처리 실패 시 개별 요청으로 폴백
      // 이 에러는 Promise.all 내부에서 처리되므로 여기까지 오면 다른 이유
      monitoringInstance.log('error', `${modelId} 병렬 처리 실패, 순차 처리로 전환`, { error }, 'model');
      
      // 순차적으로 처리 시도
      for (const reqData of requests) {
        await this.processSingleRequest(modelId, reqData).catch(() => {
          // 이미 processSingleRequest 내부에서 로깅 및 reject 처리됨
        });
      }
    }
  }
  
  /**
   * 모델에 실제 요청 전송
   * @param modelId 모델 ID
   * @param request 요청 내용
   * @returns 모델 응답
   */
  private async sendRequestToModel(modelId: string, request: unknown): Promise<unknown> {
    const startTime = Date.now();
    let success = false;
    
    try {
      // Hugging Face API 호출
      // TypeScript 타입 강화를 위한 타입 가드
      if (!request || typeof request !== 'object') {
        throw new Error('유효하지 않은 요청 형식');
      }
      
      const reqObj = request as Record<string, unknown>;
      let response;
      
      // 텍스트 생성 요청 처리
      if (reqObj.inputs && typeof reqObj.inputs === 'object' && 'text' in (reqObj.inputs as object)) {
        response = await hf.textGeneration({ 
          model: modelId, 
          inputs: (reqObj.inputs as { text: string }).text,
          parameters: reqObj.parameters as Record<string, unknown>
        });
      }
      // 멀티모달 입력 처리
      else if (reqObj.inputs && typeof reqObj.inputs === 'object') {
        response = await hf.request({ 
          model: modelId, 
          data: reqObj.inputs,
          parameters: reqObj.parameters as Record<string, unknown>
        });
      }
      // 기본 요청 처리
      else {
        response = await hf.request({ 
          model: modelId, 
          data: reqObj,
          task: 'text-generation'
        });
      }

      success = true;
      monitoringInstance.logPerformance('modelApiCall', Date.now() - startTime, success, { modelId });
      return response;
    } catch (error) {
      success = false;
      monitoringInstance.logPerformance('modelApiCall', Date.now() - startTime, success, { modelId });
      monitoringInstance.log('error', `Hugging Face API 호출 실패 (${modelId})`, {
        error: (error as Error).message,
      }, 'model');
      throw error;
    }
  }

  /**
   * 캐싱 설정
   * @param useCache 캐싱 활성화 여부
   */
  public setCaching(useCache: boolean): void {
    this.useCache = useCache;
    monitoringInstance.log('info', `캐싱 설정 변경: ${useCache ? '활성화' : '비활성화'}`, {}, 'model');
  }
  
  /**
   * 캐시 초기화
   */
  public clearCache(): void {
    modelCache.clear();
    monitoringInstance.log('info', '모델 캐시 초기화 완료', {}, 'model');
  }

  /**
   * 멀티모달 데이터에 대한 해시 생성
   */
  private generateMultimodalDataHash(data: MultimodalInput): Record<string, string> {
    const hash: Record<string, string> = {};
    
    // 텍스트 데이터 해싱
    if (data.text) {
      hash.text = crypto.createHash('sha256').update(data.text).digest('hex');
    }
    
    // 이미지 데이터 해싱
    if (data.image) {
      const imageBuffer = data.image instanceof Buffer ? data.image : Buffer.from(data.image);
      hash.image = crypto.createHash('md5').update(imageBuffer).digest('hex');
    }
    
    // 오디오 데이터 해싱
    if (data.audio) {
      const audioBuffer = data.audio instanceof Buffer ? data.audio : Buffer.from(data.audio.buffer);
      hash.audio = crypto.createHash('md5').update(audioBuffer).digest('hex');
    }
    
    // 비디오 데이터 해싱
    if (data.video && data.video.frames.length > 0) {
      const frameBuffer = data.video.frames[0];
      hash.video = crypto.createHash('md5').update(frameBuffer).digest('hex');
    }
    
    return hash;
  }
}

// 인터페이스 정의
export type SeverityLevel = 'low' | 'medium' | 'high';

export interface Vulnerability {
  category: string;
  severity: SeverityLevel;
  description: string;
  score: number;
}

export interface SecurityAnalysisResult {
  timestamp: string;
  sourceLanguage: string;
  analysisResults: string;
  vulnerabilities: Vulnerability[];
  overallScore: number; // 0-10, 높을수록 취약
  recommendations: string[];
}

export interface AnomalyDetectionResult {
  timestamp: string;
  anomalies: string[];
  riskLevel: SeverityLevel;
  details: string;
}

export interface BehaviorAnalysisResult {
  timestamp: string;
  suspiciousActivities: string[];
  riskLevel: SeverityLevel;
  details: string;
}

export interface SecurityReport {
  timestamp: string;
  summary: string;
  overallRiskLevel: SeverityLevel;
  findings: string[];
  recommendations: string[];
}

// 기본 인스턴스 생성 및 내보내기
export const securityAnalyzer = new SecurityAnalyzer();