// 간단한 테스트 스크립트
console.log('테스트 시작: ' + new Date().toISOString());

// 하드코딩된 토큰 (실제 사용시에는 환경 변수에서 로드할 것)
const HUGGINGFACE_TOKEN = "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";
const QWEN_MODEL_ID = 'Qwen/Qwen2.5-Omni-7B';

async function checkModelStatus() {
  console.log(`모델 상태 확인 중...`);
  try {
    const url = `https://api-inference.huggingface.co/status/${QWEN_MODEL_ID}`;
    console.log('API URL:', url);
    
    const response = await fetch(url, {
      headers: { 
        Authorization: `Bearer ${HUGGINGFACE_TOKEN}` 
      }
    });
    
    console.log('응답 상태:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`모델 상태:`, data);
      return data;
    } else {
      const errorText = await response.text();
      console.error(`실패:`, errorText);
      return null;
    }
  } catch (error) {
    console.error(`오류:`, error);
    return null;
  }
}

// 메인 함수
async function main() {
  try {
    console.log('테스트 시작');
    await checkModelStatus();
    console.log('테스트 완료');
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

// 실행
main(); 