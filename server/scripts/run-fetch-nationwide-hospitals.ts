/**
 * 전국 병원 정보 가져오기 직접 실행 스크립트
 */
import { fetchNationwideHospitals } from './fetch-nationwide-hospitals';

// 메인 함수
async function main() {
  console.log('전국 병원 정보 가져오기 시작...');
  
  try {
    const result = await fetchNationwideHospitals();
    console.log('전국 병원 정보 가져오기 결과:', result);
  } catch (error) {
    console.error('전국 병원 정보 가져오기 오류:', error);
  }
}

// 스크립트 실행
main().catch(console.error);