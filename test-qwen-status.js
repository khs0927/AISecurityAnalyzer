// Qwen2.5 모델 상태 테스트 스크립트
require('dotenv').config();
// Node.js 18 이상에서는 내장 fetch API 사용 가능

// 시작 로그
console.log('스크립트 시작: ' + new Date().toISOString());

try {
  const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
  const QWEN_MODEL_ID = 'Qwen/Qwen2.5-Omni-7B';

  console.log('환경 설정 로드 완료');
  
  if (!HUGGINGFACE_TOKEN) {
    console.error('❌ HUGGINGFACE_TOKEN 환경 변수가 설정되어 있지 않습니다.');
    process.exit(1);
  }

  // 모델 상태 확인 함수
  async function checkModelStatus() {
    console.log(`[${new Date().toISOString()}] ${QWEN_MODEL_ID} 모델 상태 확인 중...`);
    
    try {
      const url = `https://api-inference.huggingface.co/status/${QWEN_MODEL_ID}`;
      console.log('API 호출 URL:', url);
      
      const response = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${HUGGINGFACE_TOKEN}` 
        }
      });
      
      console.log('응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ 모델 상태: ${JSON.stringify(data)}`);
        return data;
      } else {
        const errorText = await response.text();
        console.error(`❌ 모델 상태 확인 실패: ${response.status} ${errorText}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ 모델 상태 확인 오류:`, error);
      return null;
    }
  }

  // 간단한 테스트 함수
  async function testModel() {
    console.log(`[${new Date().toISOString()}] ${QWEN_MODEL_ID} 모델 테스트 중...`);
    
    try {
      const prompt = "심장 건강에 좋은 음식 5가지를 알려주세요.";
      const payload = {
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
          return_full_text: false
        }
      };
      
      console.log('요청 데이터:', JSON.stringify(payload));
      
      const response = await fetch(`https://api-inference.huggingface.co/models/${QWEN_MODEL_ID}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      console.log('응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ 모델 테스트 성공!`);
        console.log(`📝 질문: ${prompt}`);
        console.log(`📝 응답: ${data.generated_text}`);
        return true;
      } else {
        const errorText = await response.text();
        console.log(`❌ 모델 테스트 실패: ${response.status} ${errorText}`);
        
        if (errorText.includes("loading") || errorText.includes("still loading")) {
          console.log(`⏳ 모델이 로딩 중입니다. 잠시 후 다시 시도하세요.`);
        }
        
        return false;
      }
    } catch (error) {
      console.error(`❌ 모델 테스트 오류:`, error);
      return false;
    }
  }

  // 메인 함수
  async function main() {
    console.log('🔍 Qwen2.5 모델 상태 테스트 시작');
    console.log('==========================================');
    
    // 토큰 정보 출력 (보안을 위해 일부만 표시)
    const tokenPreview = HUGGINGFACE_TOKEN.substring(0, 4) + '...' + 
                      HUGGINGFACE_TOKEN.substring(HUGGINGFACE_TOKEN.length - 4);
    console.log(`🔑 API 토큰: ${tokenPreview}`);
    
    // 모델 상태 확인
    await checkModelStatus();
    
    // 모델 테스트
    console.log('\n🧪 모델 테스트 시작');
    console.log('==========================================');
    await testModel();
    
    console.log('\n✨ 테스트 완료');
  }

  // 스크립트 실행
  main().catch(error => {
    console.error('❌ 프로그램 실행 중 오류 발생:', error);
  });
} catch (error) {
  console.error('❌ 스크립트 초기화 중 오류 발생:', error);
} 