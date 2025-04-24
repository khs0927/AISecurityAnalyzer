/**
 * 건강보험심사평가원 병원 정보 API 데이터 가져오기
 * API 엔드포인트: http://apis.data.go.kr/B551182/hospInfoServicev2
 */

import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { db } from '../db';
import { hospitals, hospitalDepartments } from '@shared/schema';
import { eq } from 'drizzle-orm';

// API 인증 키 설정
const API_KEY = 't619sApoYD1s94RX8r8mk68mMtGPVT4qsKp7eG3e86b2tzDANPjoHscFR7C/6i0arJe3lMxEUhELK5o6avD3g=='; // 디코딩 버전 키
const ENCODED_API_KEY = encodeURIComponent(API_KEY);

// API 엔드포인트
const BASE_URL = 'http://apis.data.go.kr/B551182/hospInfoServicev2';

/**
 * 병원 정보 API 호출 함수
 * @param endpoint API 엔드포인트 경로
 * @param params 추가 매개변수
 * @returns 파싱된 XML 데이터
 */
async function fetchHiraApiData(endpoint: string, params: Record<string, any> = {}) {
  try {
    const url = `${BASE_URL}/${endpoint}`;
    const response = await axios.get(url, {
      params: {
        serviceKey: API_KEY, // 디코딩 버전 사용
        ...params,
      },
    });

    // XML 응답 파싱
    const result = await parseStringPromise(response.data);
    return result;
  } catch (error) {
    console.error(`API 호출 오류 (${endpoint}):`, error);
    throw error;
  }
}

/**
 * 시도별 병원 목록 가져오기
 * @param sidoCd 시도 코드
 * @param pageNo 페이지 번호
 * @param numOfRows 페이지당 항목 수
 */
async function getHospitalListBySido(sidoCd: string, pageNo: number = 1, numOfRows: number = 10) {
  try {
    const data = await fetchHiraApiData('getHospBasisList', {
      sidoCd,
      pageNo,
      numOfRows,
    });

    // 응답 데이터 처리
    const items = data?.response?.body?.items?.item || [];
    
    console.log(`${sidoCd} 지역 병원 ${items.length}개 데이터 가져오기 성공`);
    return items;
  } catch (error) {
    console.error(`시도별 병원 목록 가져오기 오류 (${sidoCd}):`, error);
    return [];
  }
}

/**
 * 병원 상세 정보 가져오기
 * @param ykiho 요양기관기호
 */
async function getHospitalDetail(ykiho: string) {
  try {
    const data = await fetchHiraApiData('getHospInfoDetail', {
      ykiho,
    });

    // 응답 데이터 처리
    const detail = data?.response?.body?.items?.item?.[0] || null;
    return detail;
  } catch (error) {
    console.error(`병원 상세 정보 가져오기 오류 (${ykiho}):`, error);
    return null;
  }
}

/**
 * 병원 진료과목 정보 가져오기
 * @param ykiho 요양기관기호
 */
async function getHospitalDepartments(ykiho: string) {
  try {
    const data = await fetchHiraApiData('getDgsbjtInfo', {
      ykiho,
    });

    // 응답 데이터 처리
    const departments = data?.response?.body?.items?.item || [];
    return departments;
  } catch (error) {
    console.error(`병원 진료과목 정보 가져오기 오류 (${ykiho}):`, error);
    return [];
  }
}

/**
 * 병원 데이터 DB에 저장
 * @param hospitalData 병원 데이터
 */
async function saveHospitalData(hospitalData: any) {
  try {
    const {
      ykiho,          // 요양기관기호
      yadmNm,         // 병원명
      addr,           // 주소
      telno,          // 전화번호
      XPos,           // 경도
      YPos,           // 위도
      clCdNm,         // 종별코드명
      estbDd,         // 설립일자
      drTotCnt,       // 의사총수
      cmdcGdrCnt,     // 한의사수
      pnursCnt,       // 조산사수
      nursCnt,        // 간호사수
    } = hospitalData;
    
    // 병원 기본 정보 저장
    const isEmergency = clCdNm.includes('응급') || clCdNm.includes('종합병원');
    const isHeartCenter = false; // 심장 전문 여부는 추가 정보가 필요
    
    // 기존 병원 검색
    const existingHospital = await db.select()
      .from(hospitals)
      .where(eq(hospitals.hiraId, ykiho))
      .limit(1);
    
    if (existingHospital.length > 0) {
      // 기존 병원 정보 업데이트
      await db.update(hospitals)
        .set({
          name: yadmNm,
          address: addr,
          phone: telno,
          latitude: parseFloat(YPos) || null,
          longitude: parseFloat(XPos) || null,
          isEmergency,
          isHeartCenter,
          specialty: [clCdNm],
          updatedAt: new Date(),
        })
        .where(eq(hospitals.hiraId, ykiho));
      
      console.log(`병원 정보 업데이트: ${yadmNm}`);
      return existingHospital[0].id;
    } else {
      // 새 병원 정보 추가
      const [newHospital] = await db.insert(hospitals)
        .values({
          hiraId: ykiho,
          name: yadmNm,
          address: addr,
          phone: telno,
          latitude: parseFloat(YPos) || null,
          longitude: parseFloat(XPos) || null,
          isEmergency,
          isOpen24h: isEmergency, // 응급의료기관은 24시간 운영 가정
          isHeartCenter,
          specialty: [clCdNm],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      console.log(`새 병원 정보 추가: ${yadmNm}`);
      return newHospital.id;
    }
  } catch (error) {
    console.error('병원 데이터 저장 오류:', error);
    return null;
  }
}

/**
 * 병원 진료과목 DB에 저장
 * @param hospitalId 병원 ID
 * @param departments 진료과목 목록
 */
async function saveDepartments(hospitalId: number, departments: any[]) {
  if (!hospitalId || !departments.length) return;
  
  try {
    // 기존 진료과목 삭제
    await db.delete(hospitalDepartments)
      .where(eq(hospitalDepartments.hospitalId, hospitalId));
    
    // 새 진료과목 추가
    for (const dept of departments) {
      await db.insert(hospitalDepartments)
        .values({
          hospitalId,
          name: dept.dgsbjtCdNm, // 진료과목명
          description: dept.dgsbjtPrSdrCnt ? `의사 ${dept.dgsbjtPrSdrCnt}명` : null, // 전문의 수
          doctors: parseInt(dept.dgsbjtPrSdrCnt) || 0,
          createdAt: new Date(),
        });
    }
    
    console.log(`병원 ID ${hospitalId}의 진료과목 ${departments.length}개 저장 완료`);
  } catch (error) {
    console.error(`진료과목 저장 오류 (병원 ID: ${hospitalId}):`, error);
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    // 시도 코드 목록 (일부 예시)
    const sidoCodes = [
      '110000', // 서울
      '210000', // 부산
      '220000', // 인천
      '230000', // 대구
      '240000', // 광주
      '250000', // 대전
      '260000', // 울산
    ];
    
    let totalHospitalCount = 0;
    
    // 각 시도별로 병원 정보 가져오기
    for (const sidoCd of sidoCodes) {
      console.log(`${sidoCd} 지역 병원 데이터 가져오기 시작...`);
      
      // 페이징 처리 (첫 페이지만 샘플로 가져옴)
      const hospitals = await getHospitalListBySido(sidoCd, 1, 10);
      
      for (const hospital of hospitals) {
        // 병원 기본 정보 저장
        const hospitalId = await saveHospitalData(hospital);
        if (!hospitalId) continue;
        
        // 병원 진료과목 정보 가져오기
        const departments = await getHospitalDepartments(hospital.ykiho);
        
        // 진료과목 정보 저장
        await saveDepartments(hospitalId, departments);
        
        totalHospitalCount++;
      }
      
      console.log(`${sidoCd} 지역 병원 데이터 가져오기 완료`);
    }
    
    console.log(`총 ${totalHospitalCount}개 병원 데이터 가져오기 및 저장 완료!`);
  } catch (error) {
    console.error('메인 실행 오류:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().then(() => {
    console.log('건강보험심사평가원 병원 정보 데이터 가져오기 완료');
    process.exit(0);
  }).catch((error) => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  });
}

export {
  getHospitalListBySido,
  getHospitalDetail,
  getHospitalDepartments,
};