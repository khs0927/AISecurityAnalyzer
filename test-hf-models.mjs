// Hugging Face 모델 테스트 스크립트
import fetch from 'node-fetch';

// 환경 변수 설정 (실제 사용 시 .env 파일이나 환경 변수로 설정하세요)
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN || "hf_sample_api_key_for_testing";

// 모델 ID 정의
const MODELS = {
  "qwen2.5-omni": "Qwen/Qwen2.5-Omni-7B",
  "mmed-llama": "Henrychur/MMed-Llama-3-8B-EnIns"
};

// 모델 상태 확인 함수
async function checkModelStatus(modelId) {
  try {
    console.log(`[${new Date().toISOString()}] ${modelId} 모델 상태 확인 중...`);
    
    const url = `https://api-inference.huggingface.co/status/${modelId}`;
    const response = await fetch(url, {
      headers: { 
        Authorization: `Bearer ${HUGGINGFACE_TOKEN}` 
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[${new Date().toISOString()}] ${modelId} 상태: ${data.state}`);
      return data;
    } else {
      const errorText = await response.text();
      console.error(`[${new Date().toISOString()}] ${modelId} 상태 확인 실패: ${response.status} ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${modelId} 상태 확인 오류:`, error);
    return null;
  }
}

// 모델 워밍업 함수
async function warmupModel(modelId) {
  try {
    console.log(`[${new Date().toISOString()}] ${modelId} 모델 워밍업 시작...`);
    
    const warmupPrompt = "심장 건강에 대해 간략히 설명해주세요.";
    const payload = {
      inputs: warmupPrompt,
      parameters: {
        max_new_tokens: 100,
        temperature: 0.7
      }
    };
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[${new Date().toISOString()}] ${modelId} 워밍업 성공`);
      console.log(`응답 샘플:`, data);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`[${new Date().toISOString()}] ${modelId} 워밍업 결과: ${response.status} ${errorText}`);
      
      if (errorText.includes("loading") || errorText.includes("Load model error")) {
        console.log(`모델이 로딩 중입니다. 잠시 후 다시 시도하세요.`);
      }
      
      return false;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${modelId} 워밍업 오류:`, error);
    return false;
  }
}

// 이미지 포함 멀티모달 테스트 (Qwen 모델용)
async function testMultimodalQwen() {
  try {
    console.log(`[${new Date().toISOString()}] Qwen2.5-Omni-7B 멀티모달 테스트...`);
    
    // 실제 이미지는 Base64로 인코딩된 문자열로 대체해야 합니다
    // 여기서는 테스트를 위해 간단한 텍스트만 보냅니다
    const payload = {
      inputs: "심장 건강에 좋은 음식을 추천해주세요.",
      parameters: {
        max_new_tokens: 150,
        temperature: 0.7
      }
    };
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${MODELS["qwen2.5-omni"]}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[${new Date().toISOString()}] Qwen 멀티모달 테스트 성공`);
      console.log(`응답:`, data);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`[${new Date().toISOString()}] Qwen 멀티모달 테스트 결과: ${response.status} ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Qwen 멀티모달 테스트 오류:`, error);
    return false;
  }
}

// 의료 전문 MMed-Llama 테스트
async function testMedicalLlama() {
  try {
    console.log(`[${new Date().toISOString()}] MMed-Llama-3-8B 의료 질문 테스트...`);
    
    const medicalPrompt = "심근경색의 증상과 응급 처치법은 무엇인가요?";
    const payload = {
      inputs: medicalPrompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.3
      }
    };
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${MODELS["mmed-llama"]}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[${new Date().toISOString()}] MMed-Llama 테스트 성공`);
      console.log(`응답:`, data);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`[${new Date().toISOString()}] MMed-Llama 테스트 결과: ${response.status} ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] MMed-Llama 테스트 오류:`, error);
    return false;
  }
}

// 메인 테스트 함수
async function runTests() {
  console.log("=== Hugging Face 모델 테스트 시작 ===");
  console.log(`API 토큰: ${HUGGINGFACE_TOKEN.substring(0, 5)}...${HUGGINGFACE_TOKEN.substring(HUGGINGFACE_TOKEN.length - 4)}`);
  
  // 모델 상태 확인
  for (const [name, modelId] of Object.entries(MODELS)) {
    await checkModelStatus(modelId);
  }
  
  // 모델 워밍업
  console.log("\n=== 모델 워밍업 시작 ===");
  for (const [name, modelId] of Object.entries(MODELS)) {
    await warmupModel(modelId);
  }
  
  // 기능 테스트
  console.log("\n=== 기능 테스트 시작 ===");
  await testMultimodalQwen();
  await testMedicalLlama();
  
  console.log("\n=== 모든 테스트 완료 ===");
}

// 테스트 실행
runTests().catch(error => {
  console.error("테스트 중 오류 발생:", error);
}); 