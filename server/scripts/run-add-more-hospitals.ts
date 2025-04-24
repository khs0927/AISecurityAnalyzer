/**
 * 전국 모든 지역 병원 추가 실행 스크립트
 */
import { addMoreNationwideHospitals } from './add-more-hospitals';

// 메인 함수
async function main() {
  console.log('전국 모든 지역 병원 데이터 추가 시작...');
  
  try {
    const result = await addMoreNationwideHospitals();
    console.log('전국 모든 지역 병원 데이터 추가 결과:', result);
  } catch (error) {
    console.error('전국 모든 지역 병원 데이터 추가 오류:', error);
  }
}

// 스크립트 실행
main().catch(console.error);