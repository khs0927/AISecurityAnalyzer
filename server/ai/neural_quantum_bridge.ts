import { HfInference } from '@huggingface/inference';

// Hugging Face API 토큰 가져오기
const huggingfaceToken = process.env.HUGGINGFACE_TOKEN || process.env.HUGGINGFACE_API_KEY || "";

// 모델 ID 정의
const QWEN_MODEL_ID = "Qwen/Qwen2.5-Omni-7B";
const MED_MODEL_ID = "Henrychur/MMed-Llama-3-8B";

// Hugging Face 인퍼런스 클라이언트 초기화
const hf = new HfInference(huggingfaceToken);

// 의료 쿼리 분석 입력 타입
interface MedicalQueryInput {
  query: string;
  category?: string;
  medicalContext?: {
    heartRate?: number;
    oxygenLevel?: number;
    ecgData?: number[];
    bloodPressure?: {
      systolic: number;
      diastolic: number;
    };
    temperature?: number;
    medicalHistory?: string[];
  };
  bioData?: number[][];
}

// 의료 쿼리 분석 결과 타입
interface MedicalQueryResult {
  response: string;
  confidence: number;
  medicalDomain: string;
  recommendations: string[];
  requiredTests?: string[];
  additionalContext?: string;
  processingTime: number;
}

/**
 * 신경-양자 브릿지 클래스
 * 신경망과 양자 최적화를 결합한 하이브리드 모델 접근 방식 시뮬레이션
 */
class NeuralQuantumBridge {
  private retryCount = 3;
  private retryDelay = 1000;
  private timeoutMs = 60000; // 60초 타임아웃

  /**
   * 의료 쿼리를 분석합니다.
   * @param input 의료 쿼리 입력 데이터
   * @returns 의료 쿼리 분석 결과
   */
  async analyzeMedicalQuery(input: MedicalQueryInput): Promise<MedicalQueryResult> {
    const startTime = Date.now();
    
    try {
      // 바이오 데이터 요약 생성
      const bioDataSummary = this.summarizeBioData(input.bioData);
      
      // 의료 컨텍스트 요약 생성
      const medicalContextSummary = this.summarizeMedicalContext(input.medicalContext);
      
      // 의료 도메인 감지 (질문 분류)
      const medicalDomain = await this.detectMedicalDomain(input.query);
      
      // 프롬프트 생성
      const prompt = this.generateMedicalQueryPrompt(
        input.query,
        input.category || "",
        medicalContextSummary,
        bioDataSummary,
        medicalDomain
      );
      
      // 병렬로 두 모델 호출
      const [qwenResponse, medResponse] = await Promise.all([
        this.callModelWithRetry(QWEN_MODEL_ID, prompt),
        this.callModelWithRetry(MED_MODEL_ID, prompt)
      ]);
      
      // 응답 결합
      const combinedResponse = this.combineResponses(
        qwenResponse,
        medResponse,
        medicalDomain
      );
      
      // 권장 사항 추출
      const recommendations = this.extractRecommendations(combinedResponse);
      
      // 필요한 검사 추출
      const requiredTests = this.extractRequiredTests(combinedResponse);
      
      // 결과 반환
      return {
        response: combinedResponse,
        confidence: 0.85, // 기본 신뢰도
        medicalDomain,
        recommendations,
        requiredTests,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error("의료 쿼리 분석 중 오류:", error);
      
      // 오류 발생 시 대체 응답 생성
      return {
        response: this.generateFallbackResponse(input.query, input.category),
        confidence: 0.5, // 낮은 신뢰도
        medicalDomain: "general",
        recommendations: [
          "증상이 계속되면 의사와 상담하세요.",
          "건강한 식단과 규칙적인 운동을 유지하세요.",
          "충분한 수면을 취하고 스트레스를 관리하세요."
        ],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 모델을 호출하고 재시도 로직을 적용합니다.
   * @param modelId 모델 ID
   * @param prompt 프롬프트
   * @returns 생성된 텍스트
   */
  private async callModelWithRetry(modelId: string, prompt: string): Promise<string> {
    let attempt = 0;
    
    while (attempt < this.retryCount) {
      try {
        const response = await Promise.race([
          hf.textGeneration({
            model: modelId,
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
        
        return response.generated_text || "";
      } catch (error) {
        console.error(`모델 ${modelId} 호출 시도 ${attempt + 1}/${this.retryCount} 실패:`, error);
        attempt++;
        
        if (attempt < this.retryCount) {
          // 재시도 전 지연
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        } else {
          throw error;
        }
      }
    }
    
    return ""; // 도달하지 않는 코드이지만 TypeScript 컴파일러를 위해 필요
  }

  /**
   * 바이오 데이터를 요약합니다.
   * @param bioData 바이오 데이터 배열
   * @returns 바이오 데이터 요약 문자열
   */
  private summarizeBioData(bioData?: number[][]): string {
    if (!bioData || bioData.length === 0) return "생체 데이터 없음";
    
    let summary = "";
    
    // 첫 번째 배열은 심박수로 가정
    if (bioData[0] && bioData[0].length > 0) {
      const heartRates = bioData[0];
      const avgHeartRate = this.calculateAverage(heartRates);
      summary += `- 평균 심박수: ${avgHeartRate.toFixed(1)}bpm\n`;
      
      let heartRateStatus = "정상";
      if (avgHeartRate > 100) heartRateStatus = "빈맥";
      else if (avgHeartRate < 60) heartRateStatus = "서맥";
      
      summary += `- 심박수 상태: ${heartRateStatus}\n`;
    }
    
    // 두 번째 배열은 산소포화도로 가정
    if (bioData[1] && bioData[1].length > 0) {
      const oxygenLevels = bioData[1];
      const avgOxygenLevel = this.calculateAverage(oxygenLevels);
      summary += `- 평균 산소포화도: ${avgOxygenLevel.toFixed(1)}%\n`;
      
      let oxygenStatus = "정상";
      if (avgOxygenLevel < 95) oxygenStatus = "경미한 저산소증";
      if (avgOxygenLevel < 90) oxygenStatus = "중등도 저산소증";
      if (avgOxygenLevel < 85) oxygenStatus = "심각한 저산소증";
      
      summary += `- 산소포화도 상태: ${oxygenStatus}\n`;
    }
    
    return summary;
  }

  /**
   * 의료 컨텍스트를 요약합니다.
   * @param medicalContext 의료 컨텍스트 객체
   * @returns 의료 컨텍스트 요약 문자열
   */
  private summarizeMedicalContext(medicalContext?: MedicalQueryInput['medicalContext']): string {
    if (!medicalContext) return "의료 컨텍스트 데이터 없음";
    
    let summary = "";
    
    if (medicalContext.heartRate) {
      summary += `- 심박수: ${medicalContext.heartRate}bpm`;
      if (medicalContext.heartRate > 100) summary += " (빈맥)";
      else if (medicalContext.heartRate < 60) summary += " (서맥)";
      else summary += " (정상)";
      summary += "\n";
    }
    
    if (medicalContext.oxygenLevel) {
      summary += `- 산소포화도: ${medicalContext.oxygenLevel}%`;
      if (medicalContext.oxygenLevel < 95) summary += " (경미한 저산소증)";
      else if (medicalContext.oxygenLevel < 90) summary += " (중등도 저산소증)";
      else if (medicalContext.oxygenLevel < 85) summary += " (심각한 저산소증)";
      else summary += " (정상)";
      summary += "\n";
    }
    
    if (medicalContext.bloodPressure) {
      const { systolic, diastolic } = medicalContext.bloodPressure;
      summary += `- 혈압: ${systolic}/${diastolic} mmHg`;
      
      if (systolic >= 140 || diastolic >= 90) summary += " (고혈압)";
      else if (systolic <= 90 || diastolic <= 60) summary += " (저혈압)";
      else summary += " (정상)";
      
      summary += "\n";
    }
    
    if (medicalContext.temperature) {
      summary += `- 체온: ${medicalContext.temperature}°C`;
      
      if (medicalContext.temperature > 37.5) summary += " (발열)";
      else if (medicalContext.temperature < 36.0) summary += " (저체온)";
      else summary += " (정상)";
      
      summary += "\n";
    }
    
    if (medicalContext.ecgData && medicalContext.ecgData.length > 0) {
      summary += "- ECG 데이터 있음\n";
    }
    
    if (medicalContext.medicalHistory && medicalContext.medicalHistory.length > 0) {
      summary += `- 병력: ${medicalContext.medicalHistory.join(", ")}\n`;
    }
    
    return summary;
  }

  /**
   * 의료 도메인을 감지합니다.
   * @param query 쿼리 문자열
   * @returns 감지된 의료 도메인
   */
  private async detectMedicalDomain(query: string): Promise<string> {
    // 키워드 기반 간단한 분류
    const lowerQuery = query.toLowerCase();
    
    // 심장 관련 키워드
    if (/심장|맥박|심박|심전도|가슴[^\s]*통증|가슴[^\s]*답답|흉통|협심증|심근경색|부정맥/.test(lowerQuery)) {
      return "cardiology";
    }
    
    // 호흡기 관련 키워드
    if (/폐|기관지|호흡|숨|가래|기침|천식|폐렴|코로나|코비드/.test(lowerQuery)) {
      return "pulmonology";
    }
    
    // 소화기 관련 키워드
    if (/위|장|소화|복통|설사|변비|구토|메스꺼움|식욕|소화불량|위산|역류|속쓰림/.test(lowerQuery)) {
      return "gastroenterology";
    }
    
    // 신경 관련 키워드
    if (/두통|편두통|어지러움|현기증|신경|뇌|발작|간질|경련|마비|저림|감각|의식|기억력/.test(lowerQuery)) {
      return "neurology";
    }
    
    // 당뇨/내분비 관련 키워드
    if (/당뇨|혈당|갈증|인슐린|호르몬|갑상선|내분비/.test(lowerQuery)) {
      return "endocrinology";
    }
    
    // 피부 관련 키워드
    if (/피부|발진|가려움|두드러기|습진|여드름|건선|탈모/.test(lowerQuery)) {
      return "dermatology";
    }
    
    // 근골격계 관련 키워드
    if (/관절|근육|뼈|허리|목|어깨|무릎|통증|염좌|골절|염증|관절염|류마티스/.test(lowerQuery)) {
      return "orthopedics";
    }
    
    // 심리/정신 관련 키워드
    if (/우울|불안|스트레스|공황|강박|불면|수면|환각|환청|정신|심리/.test(lowerQuery)) {
      return "psychiatry";
    }
    
    // 알레르기/면역 관련 키워드
    if (/알레르기|면역|재채기|콧물|비염|아토피|두드러기/.test(lowerQuery)) {
      return "allergy_immunology";
    }
    
    // 일반 의학/건강 관련
    return "general_medicine";
  }

  /**
   * 의료 쿼리 프롬프트를 생성합니다.
   * @param query 쿼리 문자열
   * @param category 카테고리
   * @param medicalContextSummary 의료 컨텍스트 요약
   * @param bioDataSummary 바이오 데이터 요약
   * @param domain 의료 도메인
   * @returns 생성된 프롬프트
   */
  private generateMedicalQueryPrompt(
    query: string,
    category: string,
    medicalContextSummary: string,
    bioDataSummary: string,
    domain: string
  ): string {
    return `의료 질문에 답변하는 전문 AI 의료 보조사입니다.

사용자 질문: "${query}"

질문 카테고리: ${category || '일반'}
의료 도메인: ${domain}

의료 컨텍스트:
${medicalContextSummary}

생체 데이터:
${bioDataSummary}

위 정보를 바탕으로 정확하고 유용한 의학 정보를 제공해주세요. 응답은 다음 가이드라인을 따라야 합니다:

1. 정확하고 최신 의학 지식에 기반해야 합니다.
2. 환자의 상태에 적합한 맞춤형 정보여야 합니다.
3. 명확하고 이해하기 쉬운 용어를 사용해야 합니다.
4. 적절한 경우 의사 상담을 권장해야 합니다.
5. 불확실한 경우에는 확신을 주지 않아야 합니다.

응답에서는 증상에 대한 가능한 설명, 적절한 경우 권장 사항, 그리고 언제 의료 도움을 구해야 하는지에 대한 지침을 포함해주세요.`;
  }

  /**
   * 두 모델의 응답을 결합합니다.
   * @param qwenResponse Qwen 모델 응답
   * @param medResponse Med 모델 응답
   * @param domain 의료 도메인
   * @returns 결합된 응답
   */
  private combineResponses(
    qwenResponse: string,
    medResponse: string,
    domain: string
  ): string {
    // 응답이 없는 경우 처리
    if (!qwenResponse && !medResponse) {
      return "죄송합니다. 현재 AI 시스템에 문제가 발생했습니다. 나중에 다시 시도해주세요.";
    }
    
    if (!qwenResponse) return medResponse;
    if (!medResponse) return qwenResponse;
    
    // 응답 길이 확인 및 조정
    const maxLength = 1500; // 최대 응답 길이
    
    // 도메인에 따른 결합 가중치 설정
    let qwenWeight, medWeight;
    
    switch (domain) {
      case "cardiology":
      case "pulmonology":
      case "neurology":
      case "endocrinology":
        // 전문적인 의료 영역은 MMed 모델에 가중치 부여
        qwenWeight = 0.3;
        medWeight = 0.7;
        break;
        
      case "general_medicine":
      case "allergy_immunology":
      case "dermatology":
        // 일반적인 의료 영역은 균등한 가중치
        qwenWeight = 0.5;
        medWeight = 0.5;
        break;
        
      default:
        // 기타 도메인은 Qwen에 가중치 부여 (더 포괄적인 지식)
        qwenWeight = 0.7;
        medWeight = 0.3;
    }
    
    // 응답 세그먼트 추출
    const qwenSegments = this.extractResponseSegments(qwenResponse);
    const medSegments = this.extractResponseSegments(medResponse);
    
    // 결합된 응답 생성
    let combinedResponse = "";
    
    // 1. 모델 응답 유사성 확인
    const similarity = this.calculateTextSimilarity(qwenResponse, medResponse);
    
    // 2. 유사성이 높으면 더 신뢰할 수 있는 응답 선택
    if (similarity > 0.7) {
      // 응답이 매우 유사하면 더 전문적인 응답 선택
      combinedResponse = domain.includes("ology") ? medResponse : qwenResponse;
    } else {
      // 3. 유사성이 낮으면 세그먼트 결합
      // 설명 부분 결합
      if (qwenSegments.explanation && medSegments.explanation) {
        combinedResponse += this.combineTextSegments(
          qwenSegments.explanation, 
          medSegments.explanation,
          qwenWeight, 
          medWeight
        );
      } else {
        combinedResponse += qwenSegments.explanation || medSegments.explanation || "";
      }
      
      combinedResponse += "\n\n";
      
      // 권장사항 결합
      if (qwenSegments.recommendations && medSegments.recommendations) {
        combinedResponse += "권장 사항:\n";
        combinedResponse += this.combineRecommendations(
          qwenSegments.recommendations,
          medSegments.recommendations
        );
      } else {
        combinedResponse += qwenSegments.recommendations || medSegments.recommendations || "";
      }
      
      combinedResponse += "\n\n";
      
      // 주의사항 결합 (있는 경우)
      if (qwenSegments.warnings || medSegments.warnings) {
        combinedResponse += "주의 사항:\n";
        combinedResponse += qwenSegments.warnings || medSegments.warnings || "";
      }
    }
    
    // 최대 길이 제한
    if (combinedResponse.length > maxLength) {
      combinedResponse = combinedResponse.substring(0, maxLength) + "...";
    }
    
    return combinedResponse;
  }

  /**
   * 두 텍스트 세그먼트를 결합합니다.
   * @param text1 첫 번째 텍스트
   * @param text2 두 번째 텍스트
   * @param weight1 첫 번째 텍스트 가중치
   * @param weight2 두 번째 텍스트 가중치
   * @returns 결합된 텍스트
   */
  private combineTextSegments(
    text1: string,
    text2: string,
    weight1: number,
    weight2: number
  ): string {
    // 간단한 방법: 가중치가 높은 텍스트를 먼저 포함
    if (weight1 >= weight2) {
      return text1;
    } else {
      return text2;
    }
  }

  /**
   * 권장사항을 결합합니다.
   * @param rec1 첫 번째 권장사항
   * @param rec2 두 번째 권장사항
   * @returns 결합된 권장사항
   */
  private combineRecommendations(rec1: string, rec2: string): string {
    // 항목 추출
    const items1 = rec1.split('\n').filter(line => line.trim().length > 0);
    const items2 = rec2.split('\n').filter(line => line.trim().length > 0);
    
    // 중복 제거 및 결합
    const allItems = new Set([...items1, ...items2]);
    return Array.from(allItems).join('\n');
  }

  /**
   * 응답에서 세그먼트를 추출합니다.
   * @param response 응답 텍스트
   * @returns 추출된 세그먼트
   */
  private extractResponseSegments(response: string): {
    explanation: string;
    recommendations: string;
    warnings: string;
  } {
    const segments = {
      explanation: "",
      recommendations: "",
      warnings: ""
    };
    
    // 설명 부분 추출 (첫 부분부터 권장사항이나 주의사항 전까지)
    const explanationMatch = response.match(/^(.*?)(?:권장\s*사항|주의\s*사항|참고\s*사항|조언|다음과\s*같은\s*조치|다음을\s*권장|가능한\s*원인|⚠️|$)/s);
    if (explanationMatch) {
      segments.explanation = explanationMatch[1].trim();
    } else {
      segments.explanation = response;
    }
    
    // 권장사항 추출
    const recommendationsMatch = response.match(/(?:권장\s*사항|조언|다음과\s*같은\s*조치|다음을\s*권장)(?:\s*:\s*|\s*\n\s*)(.*?)(?:주의\s*사항|참고\s*사항|⚠️|$)/s);
    if (recommendationsMatch) {
      segments.recommendations = recommendationsMatch[1].trim();
    }
    
    // 주의사항 추출
    const warningsMatch = response.match(/(?:주의\s*사항|참고\s*사항|⚠️)(?:\s*:\s*|\s*\n\s*)(.*?)$/s);
    if (warningsMatch) {
      segments.warnings = warningsMatch[1].trim();
    }
    
    return segments;
  }

  /**
   * 두 텍스트의 유사성을 계산합니다.
   * @param text1 첫 번째 텍스트
   * @param text2 두 번째 텍스트
   * @returns 유사성 점수 (0-1)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    // 간단한 자카드 유사도 구현
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    // 교집합 계산
    const intersection = new Set();
    for (const word of words1) {
      if (words2.has(word)) {
        intersection.add(word);
      }
    }
    
    // 합집합 계산
    const union = new Set([...words1, ...words2]);
    
    // 자카드 유사도 = 교집합 크기 / 합집합 크기
    return intersection.size / union.size;
  }

  /**
   * 응답에서 권장사항을 추출합니다.
   * @param response 응답 텍스트
   * @returns 추출된 권장사항 배열
   */
  private extractRecommendations(response: string): string[] {
    // 권장사항 부분 추출
    const recommendationsMatch = response.match(/(?:권장\s*사항|조언|다음과\s*같은\s*조치|다음을\s*권장)(?:\s*:\s*|\s*\n\s*)(.*?)(?:주의\s*사항|참고\s*사항|$)/s);
    
    if (!recommendationsMatch) return [];
    
    const recommendationsText = recommendationsMatch[1].trim();
    
    // 항목 분할
    return recommendationsText
      .split(/\n/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  /**
   * 응답에서 필요한 검사를 추출합니다.
   * @param response 응답 텍스트
   * @returns 추출된 필요 검사 배열
   */
  private extractRequiredTests(response: string): string[] | undefined {
    // "검사" 관련 문구 찾기
    const testsMatch = response.match(/(?:필요한\s*검사|권장되는\s*검사|추가\s*검사|다음\s*검사)(?:\s*:\s*|\s*\n\s*)(.*?)(?:\n\n|다음|$)/s);
    
    if (!testsMatch) return undefined;
    
    const testsText = testsMatch[1].trim();
    
    // 항목 분할
    return testsText
      .split(/\n/)
      .map(item => item.trim().replace(/^[•-]\s*/, ''))
      .filter(item => item.length > 0);
  }

  /**
   * 대체 응답을 생성합니다.
   * @param query 쿼리 문자열
   * @param category 카테고리
   * @returns 생성된 대체 응답
   */
  private generateFallbackResponse(query: string, category?: string): string {
    const lowerQuery = query.toLowerCase();
    
    // 카테고리 또는 쿼리 기반 응답 생성
    if (category === "lifestyle" || /생활|습관|운동|식이|식단|수면|스트레스/.test(lowerQuery)) {
      return `건강한 생활 습관은 전반적인 건강에 매우 중요합니다.

다음 사항을 권장합니다:
• 규칙적인 운동: 주 150분 이상의 중강도 운동이 이상적입니다.
• 균형 잡힌 식단: 과일, 채소, 통곡물, 건강한 단백질을 충분히 섭취하세요.
• 충분한 수면: 성인은 하루 7-9시간의 수면이 필요합니다.
• 스트레스 관리: 명상, 심호흡, 취미 활동 등으로 스트레스를 관리하세요.
• 금연 및 적절한 음주: 흡연을 피하고 음주를 제한하세요.

개인의 건강 상태에 따라 적절한 생활 습관 변화가 다를 수 있으므로, 구체적인 내용은 의료 전문가와 상담하는 것이 좋습니다.`;
    } else if (category === "symptoms" || /증상|아프|통증|불편|문제/.test(lowerQuery)) {
      return `증상의 원인은 다양할 수 있으며, 정확한 진단을 위해서는 의료 전문가의 평가가 필요합니다.

다음 사항을 고려하세요:
• 증상의 지속 시간, 심각도, 악화/완화 요인을 기록하세요.
• 증상이 일상생활에 영향을 미치거나 걱정된다면 의사와 상담하세요.
• 갑작스러운 심한 증상은 응급 치료가 필요할 수 있습니다.

구체적인 증상에 대한 자세한 정보를 제공해 주시면 더 맞춤화된 정보를 제공해 드릴 수 있습니다.`;
    } else if (category === "medications" || /약|약물|복용|처방|부작용/.test(lowerQuery)) {
      return `약물 치료는 개인의 건강 상태, 다른 약물과의 상호작용, 그리고 개인적인 요인에 따라 다릅니다.

약물 복용 시 일반적인 지침:
• 의사나 약사의 지시에 따라 정확한 용량과 시간에 복용하세요.
• 모든 약물의 부작용과 상호작용에 대해 알아두세요.
• 처방약은 의사와 상담 없이 복용을 중단하거나 용량을 변경하지 마세요.
• 모든 약물(처방약, 비처방약, 건강보조식품)을 의료 제공자에게 알리세요.

특정 약물에 대한 질문이 있으시면 더 구체적인 정보를 요청해 주세요.`;
    } else {
      return `안녕하세요! 건강 관련 질문에 도움을 드릴 수 있습니다.

현재 시스템 제한으로 인해 상세한 분석이 어렵습니다. 건강에 관한 다음 일반적인 조언을 참고해 주세요:

• 규칙적인 건강 검진을 받으세요.
• 균형 잡힌 식단과 규칙적인 운동을 유지하세요.
• 충분한 수면과 스트레스 관리는 건강에 필수적입니다.
• 지속적인 증상이 있다면 의료 전문가와 상담하세요.

더 구체적인 정보나 특정 건강 주제에 대해 알고 싶으시면 질문을 더 자세히 해주시기 바랍니다.`;
    }
  }

  /**
   * 평균을 계산합니다.
   * @param data 숫자 배열
   * @returns 계산된 평균
   */
  private calculateAverage(data: number[]): number {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }
}

// 신경-양자 브릿지 인스턴스 생성
export const neuralQuantumBridge = new NeuralQuantumBridge();