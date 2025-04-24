#!/usr/bin/env node

// Qwen2.5 API 테스트 스크립트
// 사용법: node test-qwen-api.js
require('dotenv').config();

// 환경변수에서 토큰 가져오기
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN || 
                         process.env.HUGGINGFACE_API_KEY || 
                         process.env.HF_TOKEN || 
                         process.env.HF_API_KEY;
                         
if (!HUGGINGFACE_TOKEN) {
  console.error('❌ HUGGINGFACE_TOKEN 환경변수가 설정되어 있지 않습니다.');
  console.error('   .env 파일에 HUGGINGFACE_TOKEN을 설정하거나 환경변수로 전달하세요.');
  process.exit(1);
}

// 토큰 정보 출력 (보안을 위해 일부만 표시)
const maskedToken = HUGGINGFACE_TOKEN.substring(0, 4) + '...' + HUGGINGFACE_TOKEN.substring(HUGGINGFACE_TOKEN.length - 4);
console.log(`🔑 Hugging Face 토큰: ${maskedToken}`);

// 모델 ID
const MODEL_ID = 'Qwen/Qwen2.5-Omni-7B';
console.log(`🤖 테스트할 모델: ${MODEL_ID}`);

/**
 * 모델 상태 확인
 */
async function checkModelStatus() {
  console.log('\n🔍 모델 상태 확인 중...');
  
  try {
    const url = `https://api-inference.huggingface.co/status/${MODEL_ID}`;
    console.log(`📡 API 요청: ${url}`);
    
    const response = await fetch(url, {
      headers: { 
        Authorization: `Bearer ${HUGGINGFACE_TOKEN}` 
      }
    });
    
    console.log(`🔄 응답 상태 코드: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 모델 상태:', data);
      return data;
    } else {
      const errorText = await response.text();
      console.error(`❌ 모델 상태 확인 실패: ${response.status}`);
      console.error(`📝 오류 응답: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error('❌ 모델 상태 확인 중 오류 발생:', error);
    return null;
  }
}

/**
 * 간단한 텍스트 생성 테스트
 */
async function testTextGeneration() {
  console.log('\n🧪 텍스트 생성 테스트 중...');
  
  try {
    const url = `https://api-inference.huggingface.co/models/${MODEL_ID}`;
    console.log(`📡 API 요청: ${url}`);
    
    const prompt = "다음은 심장 건강을 유지하기 위한 좋은 습관 5가지입니다:";
    console.log(`📝 프롬프트: "${prompt}"`);
    
    // 두 가지 방식으로 테스트: return_full_text=true와 false
    for (const returnFullText of [true, false]) {
      console.log(`\n🔄 테스트 ${returnFullText ? '(전체 텍스트 반환)' : '(생성된 텍스트만 반환)'}`);
      
      const payload = {
        inputs: prompt,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.7,
          return_full_text: returnFullText
        }
      };
      
      console.log('📦 요청 데이터:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`🔄 응답 상태 코드: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 응답 타입:', typeof data);
        console.log('✅ 응답이 배열인가?', Array.isArray(data));
        console.log('✅ 응답 구조:', JSON.stringify(data, null, 2));
        
        // 응답 텍스트 추출 테스트
        let extractedText = '';
        if (Array.isArray(data)) {
          extractedText = data[0]?.generated_text || '';
          console.log('📋 배열에서 텍스트 추출:', extractedText ? '성공' : '실패');
        } else if (typeof data === 'object') {
          extractedText = data.generated_text || data.text || data.output || data.content || '';
          console.log('📋 객체에서 텍스트 추출:', extractedText ? '성공' : '실패');
        }
        
        if (extractedText) {
          console.log('📃 추출된 텍스트 (일부):', extractedText.substring(0, 100) + '...');
        } else {
          console.warn('⚠️ 텍스트를 추출할 수 없었습니다');
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ 텍스트 생성 실패: ${response.status}`);
        console.error(`📝 오류 응답: ${errorText}`);
      }
    }
  } catch (error) {
    console.error('❌ 텍스트 생성 테스트 중 오류 발생:', error);
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('🚀 Qwen2.5 API 테스트 시작');
  console.log('==============================');
  
  // 토큰 형식 유효성 검증
  if (!HUGGINGFACE_TOKEN.startsWith('hf_')) {
    console.warn('⚠️ 토큰이 "hf_"로 시작하지 않습니다. 올바른 Hugging Face 토큰인지 확인하세요.');
  }
  
  // 모델 상태 확인
  const status = await checkModelStatus();
  if (!status) {
    console.error('❌ 모델 상태 확인에 실패했습니다. 토큰 또는 API 접근 권한을 확인하세요.');
    process.exit(1);
  }
  
  // 모델이 로딩 중이면 대기 (선택 사항)
  if (status.state === 'loading') {
    console.log('⏳ 모델이 로딩 중입니다. 잠시 기다려 주세요...');
    // 실제 구현에서는 일정 시간 기다리는 로직 추가 가능
  }
  
  // 텍스트 생성 테스트
  await testTextGeneration();
  
  console.log('\n✨ 테스트 완료');
}

// 실행
main().catch(error => {
  console.error('❌ 프로그램 실행 중 오류 발생:', error);
  process.exit(1);
}); 