import { HfInference } from '@huggingface/inference';
import { monitoringInstance } from '../monitoringInstance';

// 환경 변수에서 Hugging Face 토큰 가져오기
const huggingfaceToken = process.env.HUGGINGFACE_TOKEN || process.env.HUGGINGFACE_API_KEY || "";

if (!huggingfaceToken) {
  console.warn("⚠️ HUGGINGFACE_TOKEN이 설정되지 않았습니다. AI 분석 기능이 제한됩니다.");
}

// Hugging Face API 클라이언트 초기화
const hf = new HfInference(huggingfaceToken);

// AI 모델 설정
const AI_MODELS = {
  GENERAL: "Qwen/Qwen2.5-Omni-7B",
  MEDICAL: "Henrychur/MMed-Llama-3-8B"
};

// 분석 결과 타입 정의
export interface SecurityAnalysisResult {
  timestamp: string;
  sourceLanguage: string;
  analysisResults: string;
  vulnerabilities: Vulnerability[];
  overallScore: number;
  recommendations: string[];
}

export interface Vulnerability {
  category: string;
  severity: SeverityLevel;
  description: string;
  score: number;
}

export type SeverityLevel = 'low' | 'medium' | 'high';

export interface AnomalyDetectionResult {
  timestamp: string;
  anomalies: string[];
  riskLevel: string;
  details: string;
}

export interface BehaviorAnalysisResult {
  timestamp: string;
  suspiciousActivities: string[];
  riskLevel: string;
  details: string;
}

export interface SecurityReport {
  timestamp: string;
  summary: string;
  overallRiskLevel: string;
  findings: Array<Vulnerability | AnomalyDetectionResult | BehaviorAnalysisResult>;
  recommendations: string[];
}

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

// 모델 응답 인터페이스
interface ModelResponse {
  generated_text?: string;
  [key: string]: any;
}

// 네트워크 트래픽 데이터 인터페이스
export interface NetworkTrafficData {
  timestamp: string;
  sourceIP: string;
  destinationIP: string;
  protocol: string;
  port: number;
  dataSize: number;
  headers?: Record<string, string>;
  payload?: string;
  duration?: number;
}

// 시스템 행동 데이터 인터페이스
export interface SystemBehaviorData {
  timestamp: string;
  processName: string;
  processId: number;
  user: string;
  resourceUsage: {
    cpu: number;
    memory: number;
    diskIO?: number;
    networkIO?: number;
  };
  actions: string[];
}

/**
 * 코드 보안 취약점 분석 클래스
 */
export class SecurityAnalyzer {
  private readonly securityCategories = [
    '입력 검증 및 XSS 취약점',
    'SQL 인젝션 취약점',
    '인증 및 권한 관련 취약점',
    '민감 정보 노출',
    '암호화 관련 취약점',
    '의존성 취약점'
  ];

  /**
   * 소스 코드의 보안 취약점을 분석합니다.
   * @param sourceCode 분석할 소스 코드
   * @param language 프로그래밍 언어 (기본값: javascript)
   * @returns 취약점 분석 결과
   */
  async analyzeCode(sourceCode: string, language = 'javascript'): Promise<SecurityAnalysisResult> {
    try {
      monitoringInstance.log('info', `코드 분석 시작: ${language} 코드, 길이: ${sourceCode.length}자`);
      
      // 분석 프롬프트 생성
      const prompt = this.createCodeAnalysisPrompt(sourceCode, language);

      // 여러 모델을 사용한 분석 실행
      const [qwenResponse, mmedResponse] = await Promise.all([
        this.callTextGenerationModel(AI_MODELS.GENERAL, prompt),
        this.callTextGenerationModel(AI_MODELS.MEDICAL, prompt)
      ]);

      // 두 모델의 결과를 결합하여 더 포괄적인 분석 결과 생성
      const combinedAnalysis = this.combineAnalysisResults(
        qwenResponse.generated_text || "",
        mmedResponse.generated_text || ""
      );
      
      // 분석 결과 구조화
      const result: SecurityAnalysisResult = {
        timestamp: new Date().toISOString(),
        sourceLanguage: language,
        analysisResults: combinedAnalysis,
        vulnerabilities: this.extractVulnerabilities(combinedAnalysis),
        overallScore: this.calculateOverallScore(combinedAnalysis),
        recommendations: this.extractRecommendations(combinedAnalysis),
      };
      
      monitoringInstance.log('info', `코드 분석 완료: 취약점 ${result.vulnerabilities.length}개 발견, 점수: ${result.overallScore}/10`);
      return result;
    } catch (error) {
      return this.handleError<SecurityAnalysisResult>('코드 보안 분석', error);
    }
  }

  /**
   * 멀티모달 데이터를 분석합니다.
   * @param input 멀티모달 입력 데이터
   * @returns 분석 결과
   */
  async analyzeMultimodal(input: MultimodalInput): Promise<ModelResponse> {
    try {
      monitoringInstance.log('info', '멀티모달 분석 시작', { 
        hasText: !!input.text, 
        hasImage: !!input.image,
        hasAudio: !!input.audio,
        hasVideo: !!input.video
      });

      // 멀티모달 입력 처리
      const payload = await this.prepareMultimodalPayload(input);

      // Qwen2.5-Omni-7B 모델을 사용한 멀티모달 분석
      const response = await hf.request({
        model: AI_MODELS.GENERAL,
        data: payload,
      });

      monitoringInstance.log('info', '멀티모달 분석 완료');
      return response;
    } catch (error) {
      return this.handleError<ModelResponse>('멀티모달 분석', error);
    }
  }

  /**
   * 네트워크 트래픽의 이상을 감지합니다.
   * @param trafficData 네트워크 트래픽 데이터
   * @returns 이상 감지 결과
   */
  async detectNetworkAnomalies(trafficData: NetworkTrafficData): Promise<AnomalyDetectionResult> {
    try {
      monitoringInstance.log('info', '네트워크 이상 감지 시작', { 
        sourceIP: trafficData.sourceIP,
        protocol: trafficData.protocol
      });
      
      // TODO: 실제 네트워크 이상 감지 로직 구현
      // 현재는 샘플 구현만 제공
      
      // 샘플 결과
      const result: AnomalyDetectionResult = {
        timestamp: new Date().toISOString(),
        anomalies: [],
        riskLevel: 'low',
        details: '이상 트래픽이 감지되지 않았습니다.',
      };
      
      monitoringInstance.log('info', '네트워크 이상 감지 완료', { riskLevel: result.riskLevel });
      return result;
    } catch (error) {
      return this.handleError<AnomalyDetectionResult>('네트워크 이상 감지', error);
    }
  }

  /**
   * 시스템 행동 분석을 수행합니다.
   * @param behaviorData 시스템 행동 데이터
   * @returns 행동 분석 결과
   */
  async analyzeBehavior(behaviorData: SystemBehaviorData): Promise<BehaviorAnalysisResult> {
    try {
      monitoringInstance.log('info', '시스템 행동 분석 시작', { 
        process: behaviorData.processName,
        pid: behaviorData.processId
      });
      
      // TODO: 실제 행동 분석 로직 구현
      // 현재는 샘플 구현만 제공
      
      // 샘플 결과
      const result: BehaviorAnalysisResult = {
        timestamp: new Date().toISOString(),
        suspiciousActivities: [],
        riskLevel: 'low',
        details: '의심스러운 행동이 감지되지 않았습니다.',
      };
      
      monitoringInstance.log('info', '시스템 행동 분석 완료', { riskLevel: result.riskLevel });
      return result;
    } catch (error) {
      return this.handleError<BehaviorAnalysisResult>('시스템 행동 분석', error);
    }
  }

  /**
   * 종합 보안 보고서를 생성합니다.
   * @param analysisResults 다양한 분석 결과
   * @returns 종합 보안 보고서
   */
  async generateSecurityReport(analysisResults: Array<SecurityAnalysisResult | AnomalyDetectionResult | BehaviorAnalysisResult>): Promise<SecurityReport> {
    try {
      monitoringInstance.log('info', '보안 보고서 생성 시작', { resultCount: analysisResults.length });
      
      // TODO: 더 강화된 보안 보고서 생성 로직 구현
      // 현재는 샘플 구현만 제공
      
      // 권장 사항 수집
      const allRecommendations: string[] = [];
      const findings = [];
      let highestRisk = 'low';
      
      for (const result of analysisResults) {
        if ('vulnerabilities' in result) {
          // SecurityAnalysisResult 처리
          findings.push(...result.vulnerabilities);
          allRecommendations.push(...result.recommendations);
          
          // 가장 높은 위험도 찾기
          const hasHighSeverity = result.vulnerabilities.some(v => v.severity === 'high');
          if (hasHighSeverity) highestRisk = 'high';
          else if (highestRisk !== 'high' && result.vulnerabilities.some(v => v.severity === 'medium')) {
            highestRisk = 'medium';
          }
        } else if ('anomalies' in result || 'suspiciousActivities' in result) {
          findings.push(result);
          if (result.riskLevel === 'high') highestRisk = 'high';
          else if (highestRisk !== 'high' && result.riskLevel === 'medium') {
            highestRisk = 'medium';
          }
        }
      }
      
      // 중복 제거
      const uniqueRecommendations = Array.from(new Set(allRecommendations));
      
      // 보고서 생성
      const report: SecurityReport = {
        timestamp: new Date().toISOString(),
        summary: `종합 보안 분석 결과: ${findings.length}개의 발견 사항, 위험도 ${highestRisk}`,
        overallRiskLevel: highestRisk,
        findings,
        recommendations: uniqueRecommendations,
      };
      
      monitoringInstance.log('info', '보안 보고서 생성 완료', { 
        riskLevel: report.overallRiskLevel,
        findingsCount: report.findings.length
      });
      
      return report;
    } catch (error) {
      return this.handleError<SecurityReport>('보안 보고서 생성', error);
    }
  }

  /**
   * 분석 텍스트에서 취약점을 추출합니다.
   * @param analysisText 분석 텍스트
   * @returns 추출된 취약점 목록
   */
  private extractVulnerabilities(analysisText: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    
    this.securityCategories.forEach(category => {
      const regex = new RegExp(`${category}[\\s\\S]*?(\\d+)[\\s\\S]*?([^\\d\\n].*?)(?=\\d|$)`, 'i');
      const match = analysisText.match(regex);
      
      if (match) {
        const score = parseInt(match[1], 10);
        const description = match[2].trim();
        
        vulnerabilities.push({
          category,
          severity: this.getSeverityFromScore(score),
          description,
          score
        });
      }
    });
    
    return vulnerabilities;
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
   * 코드 분석 프롬프트를 생성합니다.
   * @param sourceCode 분석할 소스 코드
   * @param language 프로그래밍 언어
   * @returns 생성된 프롬프트
   */
  private createCodeAnalysisPrompt(sourceCode: string, language: string): string {
    return `
다음 ${language} 코드의 보안 취약점을 분석하고 점수화해주세요:

\`\`\`${language}
${sourceCode}
\`\`\`

다음 카테고리에 따라 분석해 주세요:
${this.securityCategories.map((cat, idx) => `${idx + 1}. ${cat}`).join('\n')}

각 카테고리별로 0-10점 척도로 평가하고, 발견된 취약점과 해결 방법을 제시해주세요.
    `;
  }

  /**
   * 텍스트 생성 모델을 호출합니다.
   * @param model 모델 ID
   * @param prompt 입력 프롬프트
   * @returns 모델 응답
   */
  private async callTextGenerationModel(model: string, prompt: string): Promise<ModelResponse> {
    return await hf.textGeneration({
      model,
      inputs: prompt,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.3,
        top_p: 0.95,
      }
    });
  }

  /**
   * 멀티모달 입력을 처리하여 API 요청 페이로드를 준비합니다.
   * @param input 멀티모달 입력
   * @returns 준비된 페이로드
   */
  private async prepareMultimodalPayload(input: MultimodalInput): Promise<any> {
    const payload: any = {
      inputs: {},
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9
      }
    };

    if (input.text) {
      payload.inputs.text = input.text;
    }

    if (input.image) {
      payload.inputs.images = [
        input.image instanceof Buffer ? 
          await this.encodeImageToBase64(input.image) : 
          input.image
      ];
    }

    if (input.audio) {
      payload.inputs.audio = [
        input.audio instanceof Float32Array ? 
          Array.from(input.audio) : 
          await this.encodeAudioToBase64(input.audio as Buffer)
      ];
    }

    if (input.video) {
      payload.inputs.video = {
        frames: await Promise.all(input.video.frames.map(frame => 
          this.encodeImageToBase64(frame)
        )),
        audioTrack: input.video.audioTrack ? 
          (input.video.audioTrack instanceof Float32Array ? 
            Array.from(input.video.audioTrack) : 
            await this.encodeAudioToBase64(input.video.audioTrack as Buffer)
          ) : 
          undefined
      };
    }

    return payload;
  }

  /**
   * 두 모델의 분석 결과를 결합합니다.
   * @param qwenAnalysis Qwen 모델 분석 결과
   * @param mmedAnalysis MMed-Llama 모델 분석 결과
   * @returns 결합된 분석 결과
   */
  private combineAnalysisResults(qwenAnalysis: string, mmedAnalysis: string): string {
    let combinedResult = "# 보안 분석 결과 (Qwen2.5-Omni 및 MMed-Llama-3 모델 기반)\n\n";
    
    this.securityCategories.forEach(category => {
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
    
    // Set을 사용하여 중복 제거
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
   * 이미지를 Base64로 인코딩합니다.
   * @param imageBuffer 이미지 버퍼
   * @returns Base64 인코딩된 문자열
   */
  private async encodeImageToBase64(imageBuffer: Buffer): Promise<string> {
    return imageBuffer.toString('base64');
  }

  /**
   * 오디오를 Base64로 인코딩합니다.
   * @param audioBuffer 오디오 버퍼
   * @returns Base64 인코딩된 문자열
   */
  private async encodeAudioToBase64(audioBuffer: Buffer): Promise<string> {
    return audioBuffer.toString('base64');
  }

  /**
   * 지연 로딩을 위한 모델 검증 메서드
   * 모델이 준비되었는지 확인하고 필요시 초기화합니다.
   */
  async validateModels(): Promise<boolean> {
    try {
      monitoringInstance.log('info', '모델 검증 시작');
      
      const models = {
        qwen: AI_MODELS.GENERAL,
        mmed: AI_MODELS.MEDICAL
      };
      
      // 모델 가용성 확인 (간단한 요청으로 테스트)
      for (const [name, modelId] of Object.entries(models)) {
        const testResponse = await hf.textGeneration({
          model: modelId,
          inputs: "test",
          parameters: {
            max_new_tokens: 5
          }
        });
        
        if (!testResponse.generated_text) {
          monitoringInstance.log('warn', `${name} 모델(${modelId})이 응답하지 않습니다.`);
          return false;
        }
      }
      
      monitoringInstance.log('info', '모델 검증 완료: 모든 모델 사용 가능');
      return true;
    } catch (error) {
      return this.handleError<boolean>('모델 검증', error, false);
    }
  }
  
  /**
   * 오류를 처리하고 기본값을 반환합니다.
   * @param operationName 작업 이름
   * @param error 오류 객체
   * @param defaultValue 기본값 (옵션)
   * @returns 기본값 또는 에러를 던집니다.
   */
  private handleError<T>(operationName: string, error: unknown, defaultValue?: T): T {
    const errorMessage = error instanceof Error ? error.message : String(error);
    monitoringInstance.log('error', `${operationName} 중 오류 발생: ${errorMessage}`);
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    throw new Error(`${operationName} 실패: ${errorMessage}`);
  }
}

// 분석기 인스턴스 생성 및 내보내기
export const securityAnalyzer = new SecurityAnalyzer();