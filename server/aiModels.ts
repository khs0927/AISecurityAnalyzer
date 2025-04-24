import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face Inference client - 다양한 환경 변수 지원
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY);

// 사용할 모델 ID 정의
const MODELS = {
  // DeepSeek-V2는 최신 대형 언어 모델로 한국어 지원이 탁월함
  CHAT: 'deepseek-ai/deepseek-v2',
  // 의료 전문 모델로 Qwen2.5를 사용 (최신 모델로 업데이트)
  MEDICAL: 'Qwen/Qwen2.5-Omni-7B',
};

/**
 * 일반 대화용 AI 응답 생성
 * @param prompt 사용자 메시지 또는 질문
 * @param context 이전 대화 컨텍스트
 * @returns AI 응답 문자열
 */
export async function generateChatResponse(prompt: string, context: string = ""): Promise<string> {
  try {
    const systemPrompt = `You are an AI health assistant specializing in cardiovascular health.
    Your role is to provide informational guidance about heart health, risk factors, lifestyle choices, 
    and general wellness. You should be compassionate, clear, and medically accurate.
    
    Important guidelines:
    - Never diagnose specific conditions or provide personalized medical advice
    - Always encourage users to consult healthcare professionals for specific concerns
    - Provide evidence-based information about heart health
    - Be empathetic but professional
    - Keep responses concise and focused on the question
    - Responses should be in Korean unless the user asks in another language
    
    Previous conversation context: ${context}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const response = await hf.textGeneration({
      model: MODELS.CHAT,
      inputs: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n'),
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        do_sample: true,
      } as any
    });

    let content = response.generated_text;
    
    // 응답에서 "assistant: " 부분이 있으면 제거
    if (content.startsWith('assistant: ')) {
      content = content.substring('assistant: '.length);
    }

    return content || "죄송합니다, 응답을 생성하는 데 문제가 발생했습니다. 다시 시도해 주세요.";
  } catch (error) {
    console.error("AI model error:", error);
    return "죄송합니다, AI 상담 기능에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

/**
 * 건강 상담용 의료 전문 AI 응답 생성
 * @param prompt 사용자 메시지 또는 질문
 * @param context 이전 대화 컨텍스트
 * @returns AI 응답 문자열
 */
export async function generateHealthConsultationResponse(prompt: string, context: string = ""): Promise<string> {
  try {
    const systemPrompt = `당신은 심혈관 건강을 전문으로 하는 의료 AI 어시스턴트입니다.
    심장 건강, 위험 요인, 생활 방식 선택 및 일반적인 웰빙에 대한 정보를 제공하는 역할을 합니다.
    의학적으로 정확하고 명확하며 공감적인 응답을 제공하세요.
    
    중요 지침:
    - 절대 구체적인 질환을 진단하거나 개인화된 의료 조언을 제공하지 마세요
    - 항상 사용자에게 구체적인 우려 사항에 대해 의료 전문가와 상담하도록 권장하세요
    - 심장 건강에 대한 증거 기반 정보 제공
    - 공감적이지만 전문적인 태도 유지
    - 응답은 질문에 집중하고 간결해야 함
    - 사용자가 다른 언어로 질문하지 않는 한 응답은 한국어로 제공
    
    이전 대화 컨텍스트: ${context}`;

    // Qwen2.5 모델에 맞게 포맷팅된 프롬프트 제작
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const response = await hf.textGeneration({
      model: MODELS.MEDICAL,
      inputs: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n'),
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false
      } as any
    });

    let content = response.generated_text;
    
    // 응답에서 "assistant: " 부분이 있으면 제거
    if (content.startsWith('assistant: ')) {
      content = content.substring('assistant: '.length);
    }

    return content || "죄송합니다, 응답을 생성하는 데 문제가 발생했습니다. 다시 시도해 주세요.";
  } catch (error) {
    console.error("AI model error:", error);
    return "죄송합니다, AI 상담 기능에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

/**
 * ECG 데이터를 분석하고 건강 평가 제공
 * @param ecgData ECG 데이터 포인트 배열
 * @param userInfo 사용자 정보
 * @returns 구조화된 객체로서의 분석 결과
 */
export async function analyzeECGData(ecgData: number[], userInfo: any): Promise<{
  summary: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  recommendations: string[];
  detectedIssues: string[];
}> {
  try {
    // 토큰 제한으로 인한 ECG 데이터 간소화 - 10번째 포인트마다 샘플링
    const sampledData = ecgData.filter((_, index) => index % 10 === 0);
    
    const prompt = `다음 환자의 ECG 데이터를 분석해주세요:
    - 나이: ${userInfo.age || 'N/A'}
    - 성별: ${userInfo.gender || 'N/A'}
    - 기저질환: ${userInfo.medicalConditions?.join(', ') || '없음'}
    
    ECG 데이터 포인트(샘플링됨): ${JSON.stringify(sampledData)}
    
    다음 정보를 제공해주세요:
    1. 분석 요약
    2. 위험 수준 평가 (낮음, 중간, 높음, 심각)
    3. 감지된 이상 징후나 문제점
    4. 환자를 위한 권장 사항
    
    분석 결과를 다음과 같은 JSON 형식으로 응답해주세요:
    {
      "summary": "분석 요약",
      "riskLevel": "low/moderate/high/critical",
      "recommendations": ["권장사항1", "권장사항2", ...],
      "detectedIssues": ["이슈1", "이슈2", ...]
    }`;

    const messages = [
      { 
        role: 'system', 
        content: "당신은 ECG 데이터를 분석하는 심장전문의 AI 어시스턴트입니다. 요청된 대로 JSON 형식으로 정확하고 전문적인 분석을 제공하세요." 
      },
      { role: 'user', content: prompt }
    ];

    const response = await hf.textGeneration({
      model: MODELS.MEDICAL,
      inputs: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n'),
      parameters: {
        max_new_tokens: 800,
        temperature: 0.3,
        do_sample: false,
        return_full_text: false
      } as any
    });

    let content = response.generated_text;
    
    // JSON 부분만 추출
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from response");
    }
    
    const jsonContent = jsonMatch[0];
    
    // JSON 파싱
    const result = JSON.parse(jsonContent);
    
    return {
      summary: result.summary,
      riskLevel: result.riskLevel as 'low' | 'moderate' | 'high' | 'critical',
      recommendations: result.recommendations,
      detectedIssues: result.detectedIssues
    };
  } catch (error) {
    console.error("AI ECG analysis error:", error);
    return {
      summary: "분석 중 오류가 발생했습니다.",
      riskLevel: "moderate",
      recommendations: ["의사와 상담하세요", "다시 분석을 시도해보세요"],
      detectedIssues: ["데이터 분석 실패"]
    };
  }
}

/**
 * 종합적인 건강 데이터를 분석하고 위험 평가 제공
 * @param healthData 사용자의 건강 지표와 데이터
 * @returns 위험 평가 및 분석
 */
export async function analyzeHealthRisk(healthData: any): Promise<{
  overallRiskScore: number;
  riskFactors: { factor: string; contribution: number; description: string }[];
  suggestions: string[];
}> {
  try {
    const prompt = `다음 심혈관 위험 평가를 위한 건강 데이터를 분석해주세요:
    
    활력 징후:
    - 심박수: ${healthData.heartRate || 'N/A'} BPM
    - 혈압: ${healthData.bloodPressureSystolic || 'N/A'}/${healthData.bloodPressureDiastolic || 'N/A'} mmHg
    - 산소 수준: ${healthData.oxygenLevel || 'N/A'}%
    - 체온: ${healthData.temperature || 'N/A'}°C
    
    환자 정보:
    - 나이: ${healthData.age || 'N/A'}
    - 성별: ${healthData.gender || 'N/A'}
    - 위험 요인: ${healthData.riskFactors?.join(', ') || '없음'}
    
    다음 정보를 제공해주세요:
    1. 전반적인 위험 점수 (0-100)
    2. 전체 위험에 대한 기여도를 포함한 기여 위험 요인 분석
    3. 심장 건강 개선을 위한 맞춤형 제안
    
    다음 JSON 형식으로 응답해주세요:
    {
      "overallRiskScore": 숫자,
      "riskFactors": [
        { "factor": "요인명", "contribution": 숫자, "description": "설명" },
        ...
      ],
      "suggestions": ["제안1", "제안2", ...]
    }`;

    const messages = [
      { 
        role: 'system', 
        content: "당신은 건강 데이터를 기반으로 상세하고 정확한 위험 분석을 제공하는 심혈관 위험 평가 AI입니다. 요청된 대로 JSON 형식으로 분석을 제공하세요." 
      },
      { role: 'user', content: prompt }
    ];

    const response = await hf.textGeneration({
      model: MODELS.MEDICAL,
      inputs: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n'),
      parameters: {
        max_new_tokens: 800,
        temperature: 0.4,
        do_sample: true,
      } as any
    });

    let content = response.generated_text;
    
    // JSON 부분만 추출
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from response");
    }
    
    const jsonContent = jsonMatch[0];
    
    // JSON 파싱
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error("AI risk analysis error:", error);
    return {
      overallRiskScore: 30,
      riskFactors: [
        { factor: "분석 오류", contribution: 100, description: "건강 데이터 분석 중 오류가 발생했습니다." }
      ],
      suggestions: ["다시 분석을 시도해보세요", "정확한 평가를 위해 의료 전문가와 상담하세요"]
    };
  }
}