import { HfInference } from '@huggingface/inference';

// Hugging Face API 토큰 가져오기
const huggingfaceToken = process.env.HUGGINGFACE_TOKEN || process.env.HUGGINGFACE_API_KEY || "";

// 모델 ID 정의
const HAIM_MODEL_ID = "Henrychur/MMed-Llama-3-8B";
const ECGQA_MODEL_ID = "Qwen/Qwen2.5-Omni-7B";

// Hugging Face 인퍼런스 클라이언트 초기화
const hf = new HfInference(huggingfaceToken);

// 카디오 위험 평가 입력 타입
interface CardiacRiskInput {
  ecgData: number[];
  heartRates: number[];
  oxygenLevels: number[];
  stDeviation?: number;
  medicalHistory?: string[];
}

// 카디오 위험 평가 결과 타입
interface CardiacRiskResult {
  riskScore: number;
  confidence: number;
  interpretation: string;
  factors: {
    factor: string;
    description: string;
    impact: number;
  }[];
  recommendations: string[];
}

// AI 헬퍼 메시지 입력 타입
interface AIHelperMessageInput {
  ecgData: number[];
  heartRates: number[];
  oxygenLevels: number[];
  riskScore: number;
  stDeviation: number;
  arrhythmia: {
    detected: boolean;
    type: string | null;
  };
}

// HAIM (Heart AI Medical) 모델 클래스
class HAIMModel {
  private retryCount = 3;
  private retryDelay = 1000;
  private timeoutMs = 60000; // 60초 타임아웃

  /**
   * 심근경색 위험도를 평가합니다.
   * @param input 카디오 위험 평가 입력 데이터
   * @returns 위험 평가 결과
   */
  async evaluateCardiacRisk(input: CardiacRiskInput): Promise<CardiacRiskResult> {
    try {
      // ECG 데이터를 요약하여 프롬프트에 포함
      const ecgSummary = this.summarizeEcgData(input.ecgData);
      const heartRateSummary = this.summarizeHeartRates(input.heartRates);
      const oxygenLevelSummary = this.summarizeOxygenLevels(input.oxygenLevels);
      
      // ST 편차 계산 (제공되지 않은 경우)
      const stDeviation = input.stDeviation || this.calculateSTDeviation(input.ecgData);
      
      // 프롬프트 구성
      const prompt = `
심근경색(MI) 위험 평가를 위한 분석:

ECG 데이터 요약:
${ecgSummary}

심박수 데이터:
${heartRateSummary}

산소포화도 데이터:
${oxygenLevelSummary}

ST 분절 편차: ${stDeviation.toFixed(2)}mm

위 정보를 바탕으로 심근경색 위험을 평가하고 다음 형식으로 응답해주세요:

1. 위험도: [0-100 사이의 숫자]
2. 신뢰도: [0-1 사이의 숫자]
3. 해석: [종합적인 분석과 해석]
4. 위험 요인: [각 요인에 대한 설명과 영향도(1-10)]
5. 권장사항: [실행 가능한 권장사항 목록]

응답은 명확하고 의학적으로 정확하게 작성해주세요.
`;

      // 모델 호출 시 재시도 로직 포함
      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt < this.retryCount) {
        try {
          const response = await Promise.race([
            hf.textGeneration({
              model: HAIM_MODEL_ID,
              inputs: prompt,
              parameters: {
                max_new_tokens: 1024,
                temperature: 0.3,
                top_p: 0.95,
              }
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Request timed out')), this.timeoutMs)
            )
          ]);

          // 응답 파싱
          return this.parseCardiacRiskResponse(response.generated_text || "");
        } catch (error) {
          console.error(`HAIM 모델 호출 시도 ${attempt + 1}/${this.retryCount} 실패:`, error);
          lastError = error instanceof Error ? error : new Error(String(error));
          attempt++;

          if (attempt < this.retryCount) {
            // 재시도 전 지연
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
          }
        }
      }

      // 모든 재시도가 실패한 경우 기본 응답 생성
      console.warn("모든 HAIM 모델 호출 재시도 실패, 기본값 반환");
      return this.generateDefaultCardiacRiskResult(
        input.heartRates, 
        input.oxygenLevels, 
        stDeviation,
        lastError?.message || "Unknown error"
      );
    } catch (error) {
      console.error("심장 위험 평가 중 예상치 못한 오류:", error);
      throw new Error(`심장 위험 평가 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * AI 헬퍼 메시지를 생성합니다.
   * @param input AI 헬퍼 메시지 입력 데이터
   * @returns 생성된 헬퍼 메시지
   */
  async generateAIHelperMessage(input: AIHelperMessageInput): Promise<string> {
    try {
      // 상태 요약
      const riskLevel = input.riskScore < 20 ? '낮음' : 
                        input.riskScore < 50 ? '보통' :
                        input.riskScore < 75 ? '높음' : '매우 높음';
      
      // 부정맥 정보
      const arrhythmiaInfo = input.arrhythmia.detected 
        ? `부정맥 감지됨 (유형: ${input.arrhythmia.type || '불명확'})` 
        : '부정맥 감지되지 않음';
      
      // 프롬프트 생성
      const prompt = `
당신은 AI 헬스 어시스턴트입니다. 다음 데이터를 바탕으로 사용자에게 친절하고 도움이 되는 메시지를 생성해주세요.

건강 데이터 요약:
- 위험 점수: ${input.riskScore}/100 (${riskLevel})
- 평균 심박수: ${this.calculateAverage(input.heartRates)}bpm
- 평균 산소포화도: ${this.calculateAverage(input.oxygenLevels)}%
- ST 편차: ${input.stDeviation}mm
- ${arrhythmiaInfo}

이 정보를 바탕으로 다음을 포함하는 도움이 되는 메시지를 생성해주세요:
1. 현재 건강 상태에 대한 간단한 요약
2. 위험 수준에 따른 조언
3. 실행 가능한 다음 단계 제안 (위험이 높으면 의료 도움 권고, 위험이 낮으면 건강 유지 팁 제공)

메시지는 친절하고, 공감적이며, 과도한 의학 용어 사용을 피하고, 300자 이내로 작성해주세요.`;

      // 모델 호출
      const response = await hf.textGeneration({
        model: ECGQA_MODEL_ID,
        inputs: prompt,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.7,
          top_p: 0.95,
        }
      });

      return response.generated_text || this.getDefaultHelperMessage(input);
    } catch (error) {
      console.error("AI 헬퍼 메시지 생성 중 오류:", error);
      return this.getDefaultHelperMessage(input);
    }
  }

  /**
   * ECG 데이터를 요약합니다.
   * @param ecgData ECG 데이터 배열
   * @returns ECG 데이터 요약 문자열
   */
  private summarizeEcgData(ecgData: number[]): string {
    if (!ecgData || ecgData.length === 0) return "ECG 데이터 없음";
    
    // 데이터 크기가 너무 큰 경우 다운샘플링
    let sampledData = ecgData;
    if (ecgData.length > 100) {
      const samplingRate = Math.floor(ecgData.length / 100);
      sampledData = [];
      for (let i = 0; i < ecgData.length; i += samplingRate) {
        sampledData.push(ecgData[i]);
      }
    }
    
    // 통계 계산
    const min = Math.min(...sampledData);
    const max = Math.max(...sampledData);
    const avg = this.calculateAverage(sampledData);
    const std = this.calculateStandardDeviation(sampledData);
    
    // 이상 특성 감지
    const anomalies = this.detectEcgAnomalies(ecgData);
    
    return `- 데이터 포인트: ${ecgData.length}개
- 최소값: ${min.toFixed(2)}, 최대값: ${max.toFixed(2)}, 평균: ${avg.toFixed(2)}, 표준편차: ${std.toFixed(2)}
- 감지된 이상: ${anomalies.length > 0 ? anomalies.join(', ') : '없음'}`;
  }

  /**
   * 심박수 데이터를 요약합니다.
   * @param heartRates 심박수 데이터 배열
   * @returns 심박수 데이터 요약 문자열
   */
  private summarizeHeartRates(heartRates: number[]): string {
    if (!heartRates || heartRates.length === 0) return "심박수 데이터 없음";
    
    const min = Math.min(...heartRates);
    const max = Math.max(...heartRates);
    const avg = this.calculateAverage(heartRates);
    
    let status = "정상";
    if (avg > 100) status = "빈맥";
    else if (avg < 60) status = "서맥";
    
    return `- 데이터 포인트: ${heartRates.length}개
- 최소값: ${min}bpm, 최대값: ${max}bpm, 평균: ${avg.toFixed(1)}bpm
- 상태: ${status}`;
  }

  /**
   * 산소포화도 데이터를 요약합니다.
   * @param oxygenLevels 산소포화도 데이터 배열
   * @returns 산소포화도 데이터 요약 문자열
   */
  private summarizeOxygenLevels(oxygenLevels: number[]): string {
    if (!oxygenLevels || oxygenLevels.length === 0) return "산소포화도 데이터 없음";
    
    const min = Math.min(...oxygenLevels);
    const max = Math.max(...oxygenLevels);
    const avg = this.calculateAverage(oxygenLevels);
    
    let status = "정상";
    if (avg < 95) status = "경미한 저산소증";
    if (avg < 90) status = "중등도 저산소증";
    if (avg < 85) status = "심각한 저산소증";
    
    return `- 데이터 포인트: ${oxygenLevels.length}개
- 최소값: ${min}%, 최대값: ${max}%, 평균: ${avg.toFixed(1)}%
- 상태: ${status}`;
  }

  /**
   * ST 편차를 계산합니다.
   * @param ecgData ECG 데이터 배열
   * @returns 계산된 ST 편차
   */
  private calculateSTDeviation(ecgData: number[]): number {
    // 간단한 구현으로 ST 편차 시뮬레이션
    // 실제로는 ECG 파형 분석을 통해 계산해야 함
    if (!ecgData || ecgData.length === 0) return 0;
    
    // 여기서는 데이터의 변동성을 기반으로 간단한 추정치 반환
    const std = this.calculateStandardDeviation(ecgData);
    return Math.min(Math.max(std / 500, 0), 5); // 0-5mm 범위로 제한
  }

  /**
   * ECG 데이터에서 이상을 감지합니다.
   * @param ecgData ECG 데이터 배열
   * @returns 감지된 이상 목록
   */
  private detectEcgAnomalies(ecgData: number[]): string[] {
    // 실제 구현에서는 복잡한 알고리즘 필요
    // 여기서는 간단한 예시로 대체
    const anomalies: string[] = [];
    
    if (!ecgData || ecgData.length < 50) return anomalies;
    
    // 변동성 계산
    const std = this.calculateStandardDeviation(ecgData);
    const diffData = [];
    
    for (let i = 1; i < ecgData.length; i++) {
      diffData.push(Math.abs(ecgData[i] - ecgData[i-1]));
    }
    
    const avgDiff = this.calculateAverage(diffData);
    
    // 간단한 이상 감지 로직
    if (std > 150) anomalies.push("높은 변동성");
    if (avgDiff > 50) anomalies.push("불규칙한 리듬");
    
    return anomalies;
  }

  /**
   * 카디오 위험 응답을 파싱합니다.
   * @param responseText 모델 응답 텍스트
   * @returns 파싱된 카디오 위험 결과
   */
  private parseCardiacRiskResponse(responseText: string): CardiacRiskResult {
    try {
      // 기본값 설정
      const result: CardiacRiskResult = {
        riskScore: 0,
        confidence: 0,
        interpretation: "",
        factors: [],
        recommendations: []
      };
      
      // 위험도 추출
      const riskMatch = responseText.match(/위험도:\s*(\d+(\.\d+)?)/i);
      if (riskMatch) {
        result.riskScore = parseFloat(riskMatch[1]);
      }
      
      // 신뢰도 추출
      const confidenceMatch = responseText.match(/신뢰도:\s*(\d+(\.\d+)?)/i);
      if (confidenceMatch) {
        result.confidence = parseFloat(confidenceMatch[1]);
        if (result.confidence > 1) result.confidence /= 100; // 100점 만점으로 표현된 경우 조정
      }
      
      // 해석 추출
      const interpretationMatch = responseText.match(/해석:(.*?)(?=(위험\s*요인|권장사항|$))/is);
      if (interpretationMatch) {
        result.interpretation = interpretationMatch[1].trim();
      }
      
      // 위험 요인 추출
      const factorsMatch = responseText.match(/위험\s*요인:(.*?)(?=(권장사항|$))/is);
      if (factorsMatch) {
        const factorsText = factorsMatch[1];
        const factorLines = factorsText.split('\n').filter(line => line.trim().length > 0);
        
        for (const line of factorLines) {
          const bulletMatch = line.match(/(?:[-•*]\s*)?([^:]+)(?::|：)(.*?)(?:(\d+)\/10|\((\d+)\/10\)|$)/i);
          if (bulletMatch) {
            const factor = bulletMatch[1].trim();
            const description = bulletMatch[2]?.trim() || "";
            const impact = bulletMatch[3] ? parseInt(bulletMatch[3]) : 
                          bulletMatch[4] ? parseInt(bulletMatch[4]) : 5;
            
            result.factors.push({ factor, description, impact });
          }
        }
      }
      
      // 권장사항 추출
      const recommendationsMatch = responseText.match(/권장사항:(.*?)$/is);
      if (recommendationsMatch) {
        const recommendationsText = recommendationsMatch[1];
        const recLines = recommendationsText.split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.replace(/^[-•*]\s*/, '').trim());
        
        result.recommendations = recLines;
      }
      
      return result;
    } catch (error) {
      console.error("카디오 위험 응답 파싱 중 오류:", error);
      return {
        riskScore: 0,
        confidence: 0,
        interpretation: "응답 파싱 중 오류가 발생했습니다.",
        factors: [],
        recommendations: []
      };
    }
  }

  /**
   * 기본 카디오 위험 결과를 생성합니다.
   * @param heartRates 심박수 데이터
   * @param oxygenLevels 산소포화도 데이터
   * @param stDeviation ST 편차
   * @param errorMessage 오류 메시지
   * @returns 기본 카디오 위험 결과
   */
  private generateDefaultCardiacRiskResult(
    heartRates: number[],
    oxygenLevels: number[],
    stDeviation: number,
    errorMessage: string
  ): CardiacRiskResult {
    // 기본 위험도 점수 계산 (간단한 휴리스틱)
    let riskScore = 25; // 기본 위험도
    const avgHeartRate = this.calculateAverage(heartRates);
    const avgOxygenLevel = this.calculateAverage(oxygenLevels);
    
    // 심박수 기반 위험도 조정
    if (avgHeartRate > 100) riskScore += 15;
    else if (avgHeartRate > 90) riskScore += 10;
    else if (avgHeartRate < 50) riskScore += 15;
    else if (avgHeartRate < 60) riskScore += 5;
    
    // 산소포화도 기반 위험도 조정
    if (avgOxygenLevel < 90) riskScore += 25;
    else if (avgOxygenLevel < 95) riskScore += 15;
    
    // ST 편차 기반 위험도 조정
    if (stDeviation > 2) riskScore += 20;
    else if (stDeviation > 1) riskScore += 10;
    
    // 최대 100점으로 제한
    riskScore = Math.min(riskScore, 100);
    
    return {
      riskScore,
      confidence: 0.6, // 낮은 신뢰도 표시
      interpretation: `AI 분석 시스템 접근 중 오류가 발생했습니다 (${errorMessage}). 제한된 데이터에 기반한 기본 평가를 제공합니다: 측정된 위험 점수는 ${riskScore}점으로, 정확한 진단을 위해 의료 전문가와 상담하는 것이 좋습니다.`,
      factors: [
        {
          factor: "심박수",
          description: avgHeartRate > 100 ? "빈맥 감지" : 
                      avgHeartRate < 60 ? "서맥 감지" : 
                      "정상 범위",
          impact: avgHeartRate > 100 || avgHeartRate < 50 ? 7 : 
                avgHeartRate > 90 || avgHeartRate < 60 ? 5 : 3
        },
        {
          factor: "산소포화도",
          description: avgOxygenLevel < 90 ? "심각한 저산소증" : 
                      avgOxygenLevel < 95 ? "경미한 저산소증" : 
                      "정상 범위",
          impact: avgOxygenLevel < 90 ? 8 : 
                avgOxygenLevel < 95 ? 6 : 2
        }
      ],
      recommendations: [
        "정확한 진단을 위해 의료 전문가와 상담하세요.",
        "휴식을 취하고 스트레스를 줄이세요.",
        "규칙적인 건강 모니터링을 유지하세요."
      ]
    };
  }

  /**
   * 기본 헬퍼 메시지를 생성합니다.
   * @param input AI 헬퍼 메시지 입력 데이터
   * @returns 기본 헬퍼 메시지
   */
  private getDefaultHelperMessage(input: AIHelperMessageInput): string {
    const riskLevel = input.riskScore < 20 ? '낮음' : 
                     input.riskScore < 50 ? '보통' :
                     input.riskScore < 75 ? '높음' : '매우 높음';
    
    const avgHeartRate = this.calculateAverage(input.heartRates);
    const avgOxygenLevel = this.calculateAverage(input.oxygenLevels);
    
    // 위험 수준에 따른 메시지 조정
    if (input.riskScore >= 75) {
      return `건강 알림: 현재 심장 건강 위험 수준이 매우 높습니다(${input.riskScore}/100). 심박수(${avgHeartRate.toFixed(0)}bpm)와 산소포화도(${avgOxygenLevel.toFixed(0)}%)를 포함한 건강 지표에 주의가 필요합니다. 즉시 의료 전문가와 상담하시고, 증상이 심해지면 응급 서비스에 연락하세요.`;
    } else if (input.riskScore >= 50) {
      return `건강 알림: 현재 심장 건강 위험 수준이 높습니다(${input.riskScore}/100). 심박수(${avgHeartRate.toFixed(0)}bpm)와 산소포화도(${avgOxygenLevel.toFixed(0)}%)를 포함한 건강 지표를 모니터링하세요. 가능한 빨리 의사와 상담하고, 과도한 신체 활동을 피하세요.`;
    } else if (input.riskScore >= 20) {
      return `건강 알림: 현재 심장 건강 위험 수준이 보통입니다(${input.riskScore}/100). 심박수(${avgHeartRate.toFixed(0)}bpm)와 산소포화도(${avgOxygenLevel.toFixed(0)}%)를 지속적으로 모니터링하세요. 건강한 생활 습관을 유지하고, 정기적인 건강 검진을 받는 것이 좋습니다.`;
    } else {
      return `건강 알림: 현재 심장 건강 위험 수준이 낮습니다(${input.riskScore}/100). 심박수(${avgHeartRate.toFixed(0)}bpm)와 산소포화도(${avgOxygenLevel.toFixed(0)}%)가 정상 범위에 있습니다. 건강한 생활 습관을 계속 유지하고, 정기적인 건강 검진을 통해 건강을 관리하세요.`;
    }
  }

  /**
   * 평균을 계산합니다.
   * @param data 숫자 배열
   * @returns 평균
   */
  private calculateAverage(data: number[]): number {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  /**
   * 표준편차를 계산합니다.
   * @param data 숫자 배열
   * @returns 표준편차
   */
  private calculateStandardDeviation(data: number[]): number {
    if (!data || data.length <= 1) return 0;
    
    const avg = this.calculateAverage(data);
    const squareDiffs = data.map(value => {
      const diff = value - avg;
      return diff * diff;
    });
    
    const avgSquareDiff = this.calculateAverage(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
}

// HAIM 모델 인스턴스 생성
export const haimModel = new HAIMModel();