import { Request, Response, Router } from "express";
// import fetch from "node-fetch";  // Node 18 미만 환경에서만 주석 해제

const router = Router();

// ──────────────────────────────────────────────────────────────
// 환경 변수 로드
// ──────────────────────────────────────────────────────────────
const PUBMED_API_KEY = process.env.PUBMED_API_KEY || "";
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN || process.env.HUGGINGFACE_API_KEY || "";

if (!PUBMED_API_KEY) {
  console.error("⚠️ PUBMED_API_KEY가 없습니다. PubMed 검색이 제한됩니다.");
} else {
  console.log("✅ PubMed API 키 설정 완료");
}
if (!HUGGINGFACE_TOKEN) {
  console.error("⚠️ HUGGINGFACE_TOKEN이 없습니다. AI 기능이 제한됩니다.");
} else {
  console.log("✅ Hugging Face API 토큰 설정 완료");
}

// ──────────────────────────────────────────────────────────────
// Hugging Face API 토큰 검증
// ──────────────────────────────────────────────────────────────
async function validateHuggingFaceToken() {
  if (!HUGGINGFACE_TOKEN) {
    console.error("⚠️ HUGGINGFACE_TOKEN이 설정되지 않았습니다!");
    return false;
  }
  
  try {
    // 모델 상태 확인
    const res = await fetch(`https://api-inference.huggingface.co/status/Qwen/Qwen2.5-Omni-7B`, {
      headers: { Authorization: `Bearer ${HUGGINGFACE_TOKEN}` }
    });
    
    if (!res.ok) {
      console.error(`⚠️ Qwen2.5 모델 상태 확인 실패: ${res.status}`);
      const text = await res.text();
      console.error(`응답 내용: ${text}`);
      return false;
    }
    
    const data = await res.json();
    console.log("✅ Qwen2.5 모델 상태:", data);
    return true;
  } catch (error) {
    console.error("⚠️ Hugging Face 토큰 검증 오류:", error);
    return false;
  }
}

// 서버 시작 시 토큰 검증
validateHuggingFaceToken().then(isValid => {
  if (!isValid) {
    console.warn("⚠️ Hugging Face 토큰 검증 실패! AI 기능이 제한될 수 있습니다.");
  } else {
    console.log("✅ Hugging Face 토큰 검증 성공! AI 기능 사용 가능합니다.");
  }
});

// ──────────────────────────────────────────────────────────────
// 시스템(의료) 프롬프트
// ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
당신은 심장 질환 전문 AI 의사 'AI 헬퍼'입니다. 
QWEN2.5-7B-옴니와 MMed-Llama3-8B-EnIns 모델이 결합된 의료 AI 모델로서 다음과 같은 특성을 가집니다:

1. 심장 건강, 특히 심근경색, 심부전, 부정맥 등에 관한 전문 지식을 보유
2. 환자의 심전도(ECG), 산소포화도, 심박수 등 생체 데이터 해석 가능
3. 의학적으로 정확하고 과학적 근거에 기반한 정보만 제공
4. 응급 상황 발생 시 즉각적인 조치를 위한 안내 제공
5. 환자의 증상과 생체 지표를 종합적으로 분석하여 정확한 진단 제시
6. PubMed에서 최신 의학 논문 정보를 참조하여 과학적 근거 제시

다음 원칙을 반드시 준수하세요:
- 확실하지 않은 진단은 하지 않으며, 정확한 의학 지식만 제공합니다.
- 환자에게 심각한 증상이 있을 경우, 반드시 전문의 진료를 권고합니다.
- 의학 전문 용어를 사용하되, 일반인도 이해할 수 있도록 쉽게 설명합니다.
- 한국어로 응답하며, 친절하고 공감적인 태도를 유지합니다.
- 질문과 관련 없는 정보는 제공하지 않습니다.
- PubMed 참조 정보를 가능한 한 포함하여 과학적 근거를 제시합니다.

환자의 생체 데이터가 제공된 경우:
- ECG: 심전도 파형의 정상/비정상 여부, P파, QRS 컴플렉스, T파의 특징 분석
- 산소포화도: 95% 이상은 정상, 90-94%는 경미한 저산소증, 90% 미만은 심각한 저산소증
- 심박수: 60-100bpm 정상, 60bpm 미만은 서맥, 100bpm 초과는 빈맥

모든 답변은 과학적이고 의학적으로 정확해야 하며, 환자의 건강과 안전을 최우선으로 고려하세요.
`;

// ──────────────────────────────────────────────────────────────
// PubMed 검색 함수 (E-utilities)
// ──────────────────────────────────────────────────────────────
async function searchPubMed(query: string, maxResults = 3): Promise<any[]> {
  try {
    const q = encodeURIComponent(query);
    const url1 = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${q}&retmode=json&retmax=${maxResults}&api_key=${PUBMED_API_KEY}`;
    const r1 = await fetch(url1);
    const d1: any = await r1.json();
    const ids: string[] = d1.esearchresult?.idlist || [];
    if (!ids.length) return [];

    const url2 = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json&api_key=${PUBMED_API_KEY}`;
    const r2 = await fetch(url2);
    const d2: any = await r2.json();
    const res: any = d2.result || {};

    return ids.map(id => {
      const art = res[id] || {};
      return {
        id,
        title: art.title,
        authors: (art.authors||[]).map((a:any)=>a.name).join(", "),
        journal: art.fulljournalname || art.source,
        pubDate: art.pubdate,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      };
    });
  } catch (e) {
    console.error("PubMed 검색 오류:", e);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────
// HF 호출 공통 함수
// ──────────────────────────────────────────────────────────────
async function invokeHF(modelId: string, inputs: string, params = {}): Promise<any> {
  console.log(`HF 모델 호출: ${modelId}`, inputs.substring(0, 100) + "...");
  console.log(`파라미터:`, JSON.stringify(params));
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃 설정
    
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs, parameters: params }),
        signal: controller.signal
      });
      
      // 응답 상태 로깅 추가
      console.log(`HF API 응답 상태 코드: ${res.status}`);
      
      if (!res.ok) {
        const txt = await res.text();
        console.error(`HF API 오류 응답 내용: ${txt}`);
        
        // 모델이 로딩 중인 경우
        if (txt.includes("loading") || txt.includes("Load model")) {
          console.log("모델이 로딩 중입니다. 백업 응답을 생성합니다.");
          return { generated_text: "현재 AI 모델이 준비 중입니다. 잠시 후 다시 시도해주세요." };
        }
        
        throw new Error(`HuggingFace API 오류 ${res.status}: ${txt}`);
      }
      
      const data = await res.json();
      
      // 응답 구조 로깅 추가
      console.log("HF API 응답 구조:", JSON.stringify(data).substring(0, 300) + "...");
      
      // 응답 형식 정규화
      return normalizeHfResponse(data);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("HF API 호출 타임아웃 발생");
      return { generated_text: "AI 응답 시간이 초과되었습니다. 다시 시도해주세요." };
    }
    console.error("HF API 호출 중 예외 발생:", error);
    throw error;
  }
}

/**
 * Hugging Face API 응답 형식 정규화 함수
 */
function normalizeHfResponse(response: any): any {
  // 이미 normalized response 형식인 경우
  if (typeof response === 'object' && 'generated_text' in response) {
    return response;
  }
  
  // 배열 형식인 경우 (가장 일반적인 형식)
  if (Array.isArray(response)) {
    if (response.length > 0) {
      return response[0];  // 첫 번째 결과 반환
    }
    return { generated_text: "" };
  }
  
  // 객체이지만 generated_text가 없는 경우
  if (typeof response === 'object') {
    // 다양한 필드 중 하나 선택
    const textField = response.generated_text || response.text || response.output || response.content;
    if (textField) {
      return { generated_text: textField };
    }
    
    // generations 배열이 있는 경우
    if (Array.isArray(response.generations) && response.generations.length > 0) {
      return { generated_text: response.generations[0].text || "" };
    }
  }
  
  // 문자열인 경우
  if (typeof response === 'string') {
    return { generated_text: response };
  }
  
  // 기본 응답
  console.warn("알 수 없는 응답 형식:", JSON.stringify(response).substring(0, 200));
  return { generated_text: "" };
}

// ──────────────────────────────────────────────────────────────
// 1) 일반 대화용 엔드포인트 (/api/ai/chat)
// ──────────────────────────────────────────────────────────────
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { userId, message, context = "[]", healthData } = req.body;
    if (!userId || !message) return res.status(400).json({ error: "userId, message 필요" });

    const ctx = JSON.parse(context) || [];
    const pubmed = await searchPubMed(`${message} heart cardiac`);

    // 프롬프트 조립
    let prompt = [
      { role: "system", content: SYSTEM_PROMPT },
      ...ctx.map((d: any) => ({
        role: d.sender === "user" ? "user" : "assistant",
        content: d.content,
      })),
      {
        role: "user",
        content: [
          message,
          healthData
            ? `\n\n건강 데이터:\n- 심박수: ${healthData.heartRate||"N/A"}\n- 산소포화도: ${healthData.oxygenLevel||"N/A"}`
            : "",
          pubmed.length
            ? "\n\n논문:\n" +
              pubmed.map((p,i) => `${i+1}. ${p.title} (${p.url})`).join("\n")
            : "",
        ].join("")
      }
    ]
      .map(m => `${m.role === "user" ? "사용자" : "AI"}: ${m.content}`)
      .join("\n\n");

    // HF 호출 (QWEN2.5-Omni-7B)
    try {
      const hfOut: any = await invokeHF("Qwen/Qwen2.5-Omni-7B", prompt, {
        max_new_tokens: 512,
        temperature: 0.4,
        return_full_text: false
      });
      
      // 다양한 응답 형식 처리
      let aiText = "";
      
      console.log("응답 타입:", typeof hfOut);
      
      if (Array.isArray(hfOut)) {
        console.log("배열 형식 응답 처리");
        aiText = hfOut[0]?.generated_text || "";
      } else if (typeof hfOut === 'object') {
        console.log("객체 형식 응답 처리");
        // 다양한 필드명 시도
        aiText = hfOut.generated_text || hfOut.text || hfOut.output || hfOut.content || "";
        
        // 객체가 배열 속성을 가질 경우
        if (!aiText && Array.isArray(hfOut.generations)) {
          aiText = hfOut.generations[0]?.text || "";
        }
      } else if (typeof hfOut === 'string') {
        console.log("문자열 형식 응답 처리");
        aiText = hfOut;
      }
      
      // 텍스트 추출 실패 시 대체 메시지
      if (!aiText) {
        console.warn("응답에서 텍스트를 추출할 수 없습니다:", JSON.stringify(hfOut));
        aiText = "응답 처리 중 오류가 발생했습니다. 다시 시도해주세요.";
      }
      
      // AI: 접두어 제거
      aiText = aiText.replace(/^AI:\s*/i, "");
      
      return res.json({ aiResponse: aiText.trim(), pubmedReferences: pubmed });
    } catch (error) {
      console.error("HF 호출 오류:", error);
      // 에러 발생 시에도 aiResponse 필드를 포함시켜 프론트엔드 호환성 유지
      return res.status(500).json({ 
        error: "AI 모델 호출 중 오류가 발생했습니다",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
        pubmedReferences: pubmed,
        aiResponse: "죄송합니다. 현재 AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      });
    }
  } catch (e: any) {
    console.error("/chat 오류:", e);
    return res.status(500).json({ error: e.message || "알 수 없는 오류" });
  }
});

// ──────────────────────────────────────────────────────────────
// 2) JSON 진단 엔드포인트 (/api/ai/v1/analyze)
// ──────────────────────────────────────────────────────────────
router.post("/v1/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text 필요" });

    const pubmed = await searchPubMed(text);
    const analPrompt = `
질문: "${text}"
아래 JSON 형식으로 답해주세요:
{
  "diagnosis": "...",
  "risk": { "score": 0-100, "level": "낮음/중간/높음", "confidence": 0.0-1.0 },
  "recommendations": ["...", "..."]
}
`;
    const full = SYSTEM_PROMPT + "\n\n" + analPrompt;
    
    try {
      const hfOut: any = await invokeHF("Qwen/Qwen2.5-Omni-7B", full, {
        max_new_tokens: 512,
        temperature: 0.3,
        return_full_text: false
      });
      
      // 다양한 응답 형식 처리
      let gen = "";
      
      if (Array.isArray(hfOut)) {
        gen = hfOut[0]?.generated_text || "";
      } else if (typeof hfOut === 'object') {
        gen = hfOut.generated_text || hfOut.text || hfOut.output || hfOut.content || "";
        if (!gen && Array.isArray(hfOut.generations)) {
          gen = hfOut.generations[0]?.text || "";
        }
      } else if (typeof hfOut === 'string') {
        gen = hfOut;
      }
      
      if (!gen) {
        console.warn("응답에서 텍스트를 추출할 수 없습니다:", JSON.stringify(hfOut));
        gen = "{ \"error\": \"응답 처리 중 오류가 발생했습니다\" }";
      }
      
      let payload;
      try {
        const m = gen.match(/\{[\s\S]*\}/);
        payload = m ? JSON.parse(m[0]) : { raw: gen };
      } catch {
        payload = { raw: gen };
      }

      return res.json({ ...payload, pubmedReferences: pubmed });
    } catch (error) {
      console.error("분석 호출 오류:", error);
      return res.status(500).json({
        error: "AI 분석 중 오류가 발생했습니다",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
        pubmedReferences: pubmed
      });
    }
  } catch (e: any) {
    console.error("/v1/analyze 오류:", e);
    return res.status(500).json({ error: e.message || "오류 발생" });
  }
});

// ──────────────────────────────────────────────────────────────
// 3) 실시간 위험도 (/api/ai/v1/realtime-risk)
// ──────────────────────────────────────────────────────────────
router.post("/v1/realtime-risk", (req, res) => {
  const { heartRate, oxygenLevel } = req.body;
  let score = 0;
  const reasons: string[] = [];
  if (heartRate !== undefined) {
    if (heartRate < 60) { score += 20; reasons.push("서맥"); }
    else if (heartRate > 100) { score += 20; reasons.push("빈맥"); }
  }
  if (oxygenLevel !== undefined) {
    if (oxygenLevel < 90) { score += 30; reasons.push("심각 저산소증"); }
    else if (oxygenLevel < 95) { score += 15; reasons.push("경미 저산소증"); }
  }
  const level = score >= 50 ? "높음" : score >= 20 ? "중간" : "낮음";
  const recs = ["정기 검진"];
  if (score >= 50) recs.push("응급 지원 요청");
  return res.json({ riskScore: score, riskLevel: level, reasons, recommendations: recs, timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────────────────────────
// 4) 상담 엔드포인트 (/api/ai/v1/consult)
// ──────────────────────────────────────────────────────────────
router.post("/v1/consult", async (req, res) => {
  try {
    const { message, healthData } = req.body;
    if (!message) return res.status(400).json({ error: "message 필요" });

    const pubmed = await searchPubMed(message + " heart");
    
    // 건강 데이터 추가
    let fullPrompt = message;
    if (healthData) {
      fullPrompt += `\n\n내 건강 정보:
- 심박수: ${healthData.heartRate || "N/A"}
- 산소포화도: ${healthData.oxygenLevel || "N/A"}
- 체온: ${healthData.temperature || "N/A"}°C
- 혈압: ${healthData.systolic || "N/A"}/${healthData.diastolic || "N/A"} mmHg
`;
    }
    
    // PubMed 정보 추가
    if (pubmed.length) {
      fullPrompt += "\n\n관련 의학 연구:\n";
      pubmed.forEach((p, i) => {
        fullPrompt += `${i+1}. ${p.title} (${p.journal}, ${p.pubDate})\n`;
        fullPrompt += `   출처: ${p.url}\n`;
      });
    }
    
    // 시스템 프롬프트와 사용자 질문 조합
    const prompt = SYSTEM_PROMPT + "\n\n사용자: " + fullPrompt;
    
    try {
      const hfOut: any = await invokeHF("Qwen/Qwen2.5-Omni-7B", prompt, {
        max_new_tokens: 800,
        temperature: 0.5,
        return_full_text: false
      });
      
      // 다양한 응답 형식 처리
      let aiText = "";
      
      if (Array.isArray(hfOut)) {
        aiText = hfOut[0]?.generated_text || "";
      } else if (typeof hfOut === 'object') {
        aiText = hfOut.generated_text || hfOut.text || hfOut.output || hfOut.content || "";
        if (!aiText && Array.isArray(hfOut.generations)) {
          aiText = hfOut.generations[0]?.text || "";
        }
      } else if (typeof hfOut === 'string') {
        aiText = hfOut;
      }
      
      if (!aiText) {
        console.warn("응답에서 텍스트를 추출할 수 없습니다:", JSON.stringify(hfOut));
        aiText = "죄송합니다. 현재 AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
      }
      
      // AI: 접두어 제거
      aiText = aiText.replace(/^AI:\s*/i, "");
      
      return res.json({
        response: aiText.trim(),
        references: pubmed.map(p => ({ title: p.title, url: p.url }))
      });
    } catch (error) {
      console.error("상담 호출 오류:", error);
      return res.status(500).json({
        error: "AI 상담 중 오류가 발생했습니다",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      });
    }
  } catch (e: any) {
    console.error("/v1/consult 오류:", e);
    return res.status(500).json({ error: e.message || "오류 발생" });
  }
});

// ──────────────────────────────────────────────────────────────
// 5) /analyze : 건강 데이터 분석 (기본 메디컬 분석)
// ──────────────────────────────────────────────────────────────
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { heartRate, oxygenLevel, ecgData } = req.body;

    if (!heartRate && !oxygenLevel && !ecgData) {
      return res.status(400).json({ error: "분석할 건강 데이터가 필요합니다." });
    }

    // 검색어 구성
    let searchQuery = "cardiac ";
    if (heartRate) searchQuery += `heart rate ${heartRate < 60 ? "bradycardia" : (heartRate > 100 ? "tachycardia" : "normal")} `;
    if (oxygenLevel) searchQuery += `oxygen saturation ${oxygenLevel < 90 ? "hypoxemia severe" : (oxygenLevel < 95 ? "hypoxemia mild" : "normal")} `;
    if (ecgData) searchQuery += "ECG analysis ";
    
    // PubMed 검색
    const pubmedResults = await searchPubMed(searchQuery);

    // 프롬프트 구성
    const analysisPrompt = `
다음 환자의 건강 데이터를 분석해주세요:

${heartRate ? `- 심박수: ${heartRate} bpm` : ""}
${oxygenLevel ? `- 산소포화도: ${oxygenLevel}%` : ""}
${ecgData ? `- ECG 데이터: 제공됨` : ""}

분석 결과를 다음 형식으로 JSON으로 제공해주세요:
{
  "normalRanges": {
    "heartRate": "정상 심박수 범위는 60-100bpm입니다.",
    "oxygenLevel": "정상 산소포화도는 95% 이상입니다."
  },
  "status": {
    "heartRate": "정상/비정상",
    "oxygenLevel": "정상/비정상"
  },
  "riskAssessment": {
    "score": 0-100,
    "level": "낮음/중간/높음"
  },
  "medicalOpinion": "의학적 소견을 여기에 작성하세요.",
  "recommendations": [
    "권장사항1",
    "권장사항2"
  ]
}`;

    // 논문 정보 추가
    let fullPrompt = analysisPrompt;
    if (pubmedResults.length > 0) {
      fullPrompt += "\n\n관련 의학 논문 정보:";
      pubmedResults.forEach((paper, idx) => {
        fullPrompt += `\n${idx+1}. "${paper.title}" - ${paper.authors}. ${paper.journal}, ${paper.pubDate}.`;
      });
    }

    try {
      // HF 호출
      const hfOut = await invokeHF("Qwen/Qwen2.5-Omni-7B", SYSTEM_PROMPT + "\n\n" + fullPrompt, {
        max_new_tokens: 1024,
        temperature: 0.3,
        return_full_text: false
      });
      
      // 다양한 응답 형식 처리
      let generated = "";
      
      if (Array.isArray(hfOut)) {
        generated = hfOut[0]?.generated_text || "";
      } else if (typeof hfOut === 'object') {
        generated = hfOut.generated_text || hfOut.text || hfOut.output || hfOut.content || "";
        if (!generated && Array.isArray(hfOut.generations)) {
          generated = hfOut.generations[0]?.text || "";
        }
      } else if (typeof hfOut === 'string') {
        generated = hfOut;
      }
      
      if (!generated) {
        console.warn("응답에서 텍스트를 추출할 수 없습니다:", JSON.stringify(hfOut));
        generated = "{ \"error\": \"응답 처리 중 오류가 발생했습니다\" }";
      }

      // JSON 추출 시도
      let analysisResult;
      try {
        const jsonMatch = generated.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("JSON 형식이 아닙니다");
        }
      } catch (parseError) {
        console.error("JSON 파싱 오류:", parseError);
        analysisResult = {
          analysis: generated,
          format: "text"
        };
      }

      return res.status(200).json({
        analysis: analysisResult,
        pubmedReferences: pubmedResults
      });
    } catch (error) {
      console.error("분석 API 오류:", error);
      return res.status(500).json({
        error: "건강 데이터 분석 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
        pubmedReferences: pubmedResults
      });
    }
  } catch (error: any) {
    console.error("건강 데이터 분석 오류:", error);
    return res.status(500).json({
      error: "건강 데이터 분석 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

export default router;