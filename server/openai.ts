import OpenAI from "openai";

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

/**
 * Generate an AI response for health consultation
 * @param prompt The user's message or query
 * @param context Previous conversation context
 * @returns AI response as string
 */
export async function generateHealthConsultationResponse(prompt: string, context: string = ""): Promise<string> {
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

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content ?? "죄송합니다, 응답을 생성하는 데 문제가 발생했습니다. 다시 시도해 주세요.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "죄송합니다, AI 상담 기능에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

/**
 * Analyze ECG data and provide a health assessment
 * @param ecgData Array of ECG data points
 * @param userInfo User information for context
 * @returns Analysis results as a structured object
 */
export async function analyzeECGData(ecgData: number[], userInfo: any): Promise<{
  summary: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  recommendations: string[];
  detectedIssues: string[];
}> {
  try {
    // Simplify ECG data to avoid token limits - sample every 10th point
    const sampledData = ecgData.filter((_, index) => index % 10 === 0);
    
    const prompt = `Analyze the following ECG data for a patient with these characteristics:
    - Age: ${userInfo.age}
    - Gender: ${userInfo.gender}
    - Medical conditions: ${userInfo.medicalConditions?.join(', ') || 'None reported'}
    
    ECG data points (sampled): ${JSON.stringify(sampledData)}
    
    Please provide:
    1. A summary of your analysis
    2. A risk level assessment (low, moderate, high, or critical)
    3. Any detected abnormalities or issues
    4. Recommendations for the patient
    
    Respond in JSON format with the following structure:
    {
      "summary": "Brief summary of analysis",
      "riskLevel": "low/moderate/high/critical",
      "recommendations": ["rec1", "rec2", ...],
      "detectedIssues": ["issue1", "issue2", ...]
    }`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { 
          role: "system", 
          content: "You are a cardiologist AI assistant that analyzes ECG data. Provide accurate, professional analysis in JSON format as requested." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    // Using non-null assertion because the response_format is set to json_object
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const content = response.choices[0].message.content!;
    const result = JSON.parse(content);
    return {
      summary: result.summary,
      riskLevel: result.riskLevel as 'low' | 'moderate' | 'high' | 'critical',
      recommendations: result.recommendations,
      detectedIssues: result.detectedIssues
    };
  } catch (error) {
    console.error("OpenAI ECG analysis error:", error);
    return {
      summary: "분석 중 오류가 발생했습니다.",
      riskLevel: "moderate",
      recommendations: ["의사와 상담하세요", "다시 분석을 시도해보세요"],
      detectedIssues: ["데이터 분석 실패"]
    };
  }
}

/**
 * Analyze comprehensive health data and provide risk assessment
 * @param healthData User's health metrics and data
 * @returns Risk assessment and analysis
 */
export async function analyzeHealthRisk(healthData: any): Promise<{
  overallRiskScore: number;
  riskFactors: { factor: string; contribution: number; description: string }[];
  suggestions: string[];
}> {
  try {
    const prompt = `Analyze the following health data for cardiovascular risk assessment:
    
    Vital signs:
    - Heart rate: ${healthData.heartRate || 'N/A'} BPM
    - Blood pressure: ${healthData.bloodPressureSystolic || 'N/A'}/${healthData.bloodPressureDiastolic || 'N/A'} mmHg
    - Oxygen level: ${healthData.oxygenLevel || 'N/A'}%
    - Temperature: ${healthData.temperature || 'N/A'}°C
    
    Patient information:
    - Age: ${healthData.age || 'N/A'}
    - Gender: ${healthData.gender || 'N/A'}
    - Risk factors: ${healthData.riskFactors?.join(', ') || 'None reported'}
    
    Please provide:
    1. An overall risk score (0-100)
    2. Analysis of contributing risk factors with their relative contribution to the overall risk
    3. Personalized suggestions for improving heart health
    
    Respond in JSON format with the following structure:
    {
      "overallRiskScore": number,
      "riskFactors": [
        { "factor": "name", "contribution": number, "description": "explanation" },
        ...
      ],
      "suggestions": ["suggestion1", "suggestion2", ...]
    }`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { 
          role: "system", 
          content: "You are a cardiovascular risk assessment AI that provides detailed and accurate risk analysis based on health data. Provide your analysis in JSON format as requested." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    // Using non-null assertion because the response_format is set to json_object
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const content = response.choices[0].message.content!;
    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI risk analysis error:", error);
    return {
      overallRiskScore: 30,
      riskFactors: [
        { factor: "분석 오류", contribution: 100, description: "건강 데이터 분석 중 오류가 발생했습니다." }
      ],
      suggestions: ["다시 분석을 시도해보세요", "정확한 평가를 위해 의료 전문가와 상담하세요"]
    };
  }
}