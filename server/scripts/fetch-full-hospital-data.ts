/**
 * 건강보험심사평가원 API를 이용하여 전국 병원 데이터를 가져와 데이터베이스에 저장하는 스크립트
 */

import { db } from '../db';
import { hospitals, hospitalDepartments } from '@shared/schema';
import { eq } from 'drizzle-orm';

// 내장 모듈 사용
import https from 'https';
import { promisify } from 'util';
import { parseString } from 'xml2js';

// xml2js 프로미스 버전 생성
const parseStringPromise = promisify(parseString);

// API 키 설정
const API_KEY = process.env.HIRA_API_KEY || 't61l9sApoYD1s94RX8r8mk68mMtGPVT4gsKp7eG3e86b2tzDANPjoHscFR7C/6i0arJe3lMxEUhELK5o6avD3g==';
const ENCODED_API_KEY = encodeURIComponent(API_KEY);

// API 엔드포인트
const API_BASE_URL = 'http://apis.data.go.kr/B551182/hospInfoServicev2';
const HOSPITAL_LIST_ENDPOINT = `${API_BASE_URL}/getHospBasisList`;
const HOSPITAL_DETAIL_ENDPOINT = `${API_BASE_URL}/getHospInfo`;
const HOSPITAL_DEPT_ENDPOINT = `${API_BASE_URL}/getDgsbjtInfo`;
const EMERGENCY_INFO_ENDPOINT = `${API_BASE_URL}/getEgytBassInfoInqire`;

// 특수 진료 과목 목록
const HEART_RELATED_DEPTS = ['순환기내과', '심장내과', '심장외과', '심장혈관외과', '흉부외과', '심혈관센터'];

/**
 * XML API 호출 함수 (내장 https 모듈 사용)
 */
async function callApi(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`API 호출: ${url}`);
    
    const httpModule = url.startsWith('https:') ? https : require('http');
    
    const req = httpModule.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`API 응답 오류: ${res.statusCode} ${res.statusMessage}`));
        return;
      }
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', async () => {
        try {
          // XML 데이터를 JSON으로 변환
          const jsonData = await parseStringPromise(data);
          
          // API 응답 코드 확인
          const resultCode = jsonData.response?.header?.[0]?.resultCode?.[0];
          if (resultCode !== '00') {
            const resultMsg = jsonData.response?.header?.[0]?.resultMsg?.[0] || '알 수 없는 오류';
            reject(new Error(`API 오류 코드: ${resultCode}, 메시지: ${resultMsg}`));
            return;
          }
          
          resolve(jsonData);
        } catch (parseError) {
          reject(new Error(`XML 파싱 오류: ${parseError.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`API 호출 오류: ${error.message}`));
    });
    
    req.end();
  });
}

/**
 * 페이지별 병원 목록 가져오기
 */
async function fetchHospitalListByPage(pageNo: number, numOfRows: number = 100): Promise<any> {
  const url = `${HOSPITAL_LIST_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`;
  
  try {
    const data = await callApi(url);
    const totalCount = parseInt(data.response?.body?.[0]?.totalCount?.[0] || '0');
    const items = data.response?.body?.[0]?.items?.[0]?.item || [];
    
    return {
      totalCount,
      items,
      pageNo,
      numOfRows
    };
  } catch (error) {
    console.error(`병원 목록 (페이지 ${pageNo}) 가져오기 오류:`, error);
    throw error;
  }
}

/**
 * 병원 상세 정보 가져오기
 */
async function fetchHospitalDetail(hpid: string): Promise<any> {
  const url = `${HOSPITAL_DETAIL_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&HPID=${hpid}`;
  
  try {
    const data = await callApi(url);
    const items = data.response?.body?.[0]?.items?.[0]?.item || [];
    return items.length > 0 ? items[0] : null;
  } catch (error) {
    console.error(`병원 상세 정보 (HPID: ${hpid}) 가져오기 오류:`, error);
    return null;
  }
}

/**
 * 병원 진료과목 정보 가져오기
 */
async function fetchHospitalDepartments(hpid: string): Promise<any> {
  const url = `${HOSPITAL_DEPT_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&HPID=${hpid}`;
  
  try {
    const data = await callApi(url);
    return data.response?.body?.[0]?.items?.[0]?.item || [];
  } catch (error) {
    console.error(`병원 진료과목 정보 (HPID: ${hpid}) 가져오기 오류:`, error);
    return [];
  }
}

/**
 * 응급실 운영 정보 가져오기
 */
async function fetchEmergencyInfo(hpid: string): Promise<any> {
  const url = `${EMERGENCY_INFO_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&HPID=${hpid}`;
  
  try {
    const data = await callApi(url);
    const items = data.response?.body?.[0]?.items?.[0]?.item || [];
    return items.length > 0 ? items[0] : null;
  } catch (error) {
    console.error(`응급실 정보 (HPID: ${hpid}) 가져오기 오류:`, error);
    return null;
  }
}

/**
 * API 데이터를 데이터베이스 형식으로 변환
 */
function transformHospitalData(hospitalItem: any, detailItem?: any, deptItems?: any[], emergencyItem?: any): any {
  // 심장 관련 과목이 있는지 확인
  const hasHeartDept = deptItems?.some(dept => 
    HEART_RELATED_DEPTS.includes(dept.dgsbjtCdNm?.[0] || '')
  ) || false;
  
  // 진료과목 목록 추출
  const deptNames = deptItems?.map(dept => dept.dgsbjtCdNm?.[0]).filter(Boolean) || [];
  
  return {
    hiraId: hospitalItem.hpid?.[0],
    name: hospitalItem.dutyName?.[0] || '',
    type: hospitalItem.dutyDivNam?.[0] || '',
    category: hospitalItem.dgsbjtCdNm?.[0] || '',
    address: hospitalItem.dutyAddr?.[0] || '',
    zipCode: hospitalItem.postCdn1?.[0] || '',
    phone: hospitalItem.dutyTel1?.[0] || '',
    latitude: parseFloat(hospitalItem.wgs84Lat?.[0] || '0'),
    longitude: parseFloat(hospitalItem.wgs84Lon?.[0] || '0'),
    isEmergency: hospitalItem.dutyEmcls?.[0] === '1' || (emergencyItem ? true : false),
    isOpen24h: hospitalItem.duty24?.[0] === '1',
    isHeartCenter: hasHeartDept,
    specialty: deptNames.length > 0 ? deptNames : [],
    openingHours: {
      monday: hospitalItem.dutyTime1s?.[0] && hospitalItem.dutyTime1c?.[0] ? 
        { open: hospitalItem.dutyTime1s?.[0], close: hospitalItem.dutyTime1c?.[0] } : null,
      tuesday: hospitalItem.dutyTime2s?.[0] && hospitalItem.dutyTime2c?.[0] ? 
        { open: hospitalItem.dutyTime2s?.[0], close: hospitalItem.dutyTime2c?.[0] } : null,
      wednesday: hospitalItem.dutyTime3s?.[0] && hospitalItem.dutyTime3c?.[0] ? 
        { open: hospitalItem.dutyTime3s?.[0], close: hospitalItem.dutyTime3c?.[0] } : null,
      thursday: hospitalItem.dutyTime4s?.[0] && hospitalItem.dutyTime4c?.[0] ? 
        { open: hospitalItem.dutyTime4s?.[0], close: hospitalItem.dutyTime4c?.[0] } : null,
      friday: hospitalItem.dutyTime5s?.[0] && hospitalItem.dutyTime5c?.[0] ? 
        { open: hospitalItem.dutyTime5s?.[0], close: hospitalItem.dutyTime5c?.[0] } : null,
      saturday: hospitalItem.dutyTime6s?.[0] && hospitalItem.dutyTime6c?.[0] ? 
        { open: hospitalItem.dutyTime6s?.[0], close: hospitalItem.dutyTime6c?.[0] } : null,
      sunday: hospitalItem.dutyTime7s?.[0] && hospitalItem.dutyTime7c?.[0] ? 
        { open: hospitalItem.dutyTime7s?.[0], close: hospitalItem.dutyTime7c?.[0] } : null,
      holiday: hospitalItem.dutyTime8s?.[0] && hospitalItem.dutyTime8c?.[0] ? 
        { open: hospitalItem.dutyTime8s?.[0], close: hospitalItem.dutyTime8c?.[0] } : null,
    },
    websiteUrl: hospitalItem.dutyUrl?.[0] || '',
    imageUrl: null,
    description: detailItem?.dutyMapimg?.[0] || '',
    // 추가 상세 정보
    hospitalRoom: detailItem?.dutyHayn?.[0] === 'Y' ? parseInt(detailItem?.dutyHano?.[0] || '0') : 0,
    doctorCount: detailItem?.dutyDrTotCnt?.[0] ? parseInt(detailItem?.dutyDrTotCnt?.[0]) : 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * 병원 데이터 저장 함수
 */
async function saveHospitalData(hospitalData: any): Promise<number | undefined> {
  try {
    // 기존 병원 확인
    const existingHospital = await db.select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.hiraId, hospitalData.hiraId))
      .limit(1);
      
    if (existingHospital.length > 0) {
      // 기존 병원 업데이트
      await db.update(hospitals)
        .set({
          ...hospitalData,
          updatedAt: new Date()
        })
        .where(eq(hospitals.hiraId, hospitalData.hiraId));
        
      console.log(`병원 업데이트: ${hospitalData.name} (${hospitalData.hiraId})`);
      return existingHospital[0].id;
    } else {
      // 새 병원 추가
      const result = await db.insert(hospitals)
        .values(hospitalData)
        .returning({ id: hospitals.id });
        
      if (result.length > 0) {
        console.log(`병원 추가: ${hospitalData.name} (${hospitalData.hiraId})`);
        return result[0].id;
      }
    }
  } catch (error) {
    console.error(`병원 저장 오류 (${hospitalData.name}):`, error);
  }
  
  return undefined;
}

/**
 * 진료과목 정보 저장 함수
 */
async function saveDepartmentData(hospitalId: number, deptItems: any[]): Promise<void> {
  try {
    for (const dept of deptItems) {
      const deptName = dept.dgsbjtCdNm?.[0];
      const deptCode = dept.dgsbjtCd?.[0];
      
      if (!deptName || !deptCode) continue;
      
      try {
        // 기존 진료과목 확인
        const existingDept = await db.select({ id: hospitalDepartments.id })
          .from(hospitalDepartments)
          .where(eq(hospitalDepartments.hospitalId, hospitalId))
          .where(eq(hospitalDepartments.name, deptName))
          .limit(1);
          
        // 의사 수 정보
        const doctorCount = parseInt(dept.dgsbjtDrCnt?.[0] || '0');
        
        if (existingDept.length > 0) {
          // 기존 진료과목 업데이트
          await db.update(hospitalDepartments)
            .set({
              doctors: doctorCount,
              description: `진료코드: ${deptCode}`
            })
            .where(eq(hospitalDepartments.id, existingDept[0].id));
        } else {
          // 새 진료과목 추가
          await db.insert(hospitalDepartments)
            .values({
              hospitalId,
              name: deptName,
              doctors: doctorCount,
              description: `진료코드: ${deptCode}`,
              createdAt: new Date()
            });
        }
      } catch (deptError) {
        console.error(`진료과목 저장 오류 (병원ID: ${hospitalId}, 과목: ${deptName}):`, deptError);
      }
    }
  } catch (error) {
    console.error(`진료과목 저장 오류 (병원ID: ${hospitalId}):`, error);
  }
}

/**
 * 전체 병원 데이터 가져오기 및 저장 함수
 */
async function fetchAndSaveAllHospitalData(maxPages: number = 10): Promise<void> {
  try {
    // 첫 페이지로 전체 개수 파악
    const firstPage = await fetchHospitalListByPage(1, 100);
    const totalCount = firstPage.totalCount;
    const totalPages = Math.ceil(totalCount / 100);
    
    console.log(`총 ${totalCount}개 병원 정보, ${totalPages}페이지 중 최대 ${maxPages}페이지까지 가져옵니다.`);
    
    // 처리 진행률 표시 변수
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // 첫 페이지 데이터 저장
    console.log(`페이지 1/${Math.min(totalPages, maxPages)} 처리 중...`);
    
    for (const hospitalItem of firstPage.items) {
      try {
        const hpid = hospitalItem.hpid?.[0];
        if (!hpid) continue;
        
        // 상세 정보 가져오기 (병렬 처리)
        const [detailItem, deptItems, emergencyItem] = await Promise.all([
          fetchHospitalDetail(hpid),
          fetchHospitalDepartments(hpid),
          fetchEmergencyInfo(hpid)
        ]);
        
        // 데이터 변환 및 저장
        const hospitalData = transformHospitalData(hospitalItem, detailItem, deptItems, emergencyItem);
        const hospitalId = await saveHospitalData(hospitalData);
        
        if (hospitalId && deptItems.length > 0) {
          await saveDepartmentData(hospitalId, deptItems);
        }
        
        successCount++;
      } catch (itemError) {
        console.error(`병원 데이터 처리 오류:`, itemError);
        errorCount++;
      }
      
      processedCount++;
      
      // 매 10개마다 진행 상황 출력
      if (processedCount % 10 === 0) {
        console.log(`진행률: ${processedCount}/${totalCount} (성공: ${successCount}, 오류: ${errorCount})`);
      }
      
      // API 호출 제한 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 나머지 페이지 처리
    for (let page = 2; page <= Math.min(totalPages, maxPages); page++) {
      try {
        console.log(`페이지 ${page}/${Math.min(totalPages, maxPages)} 처리 중...`);
        
        const pageData = await fetchHospitalListByPage(page, 100);
        
        for (const hospitalItem of pageData.items) {
          try {
            const hpid = hospitalItem.hpid?.[0];
            if (!hpid) continue;
            
            // 상세 정보 가져오기 (병렬 처리)
            const [detailItem, deptItems, emergencyItem] = await Promise.all([
              fetchHospitalDetail(hpid),
              fetchHospitalDepartments(hpid),
              fetchEmergencyInfo(hpid)
            ]);
            
            // 데이터 변환 및 저장
            const hospitalData = transformHospitalData(hospitalItem, detailItem, deptItems, emergencyItem);
            const hospitalId = await saveHospitalData(hospitalData);
            
            if (hospitalId && deptItems.length > 0) {
              await saveDepartmentData(hospitalId, deptItems);
            }
            
            successCount++;
          } catch (itemError) {
            console.error(`병원 데이터 처리 오류:`, itemError);
            errorCount++;
          }
          
          processedCount++;
          
          // 매 10개마다 진행 상황 출력
          if (processedCount % 10 === 0) {
            console.log(`진행률: ${processedCount}/${totalCount} (성공: ${successCount}, 오류: ${errorCount})`);
          }
          
          // API 호출 제한 방지를 위한 딜레이
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 페이지 간 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (pageError) {
        console.error(`페이지 ${page} 처리 오류:`, pageError);
      }
    }
    
    console.log(`데이터 수집 완료. 총 ${processedCount}개 처리 (성공: ${successCount}, 오류: ${errorCount})`);
  } catch (error) {
    console.error('전체 데이터 수집 오류:', error);
    throw error;
  }
}

/**
 * 지역별 병원 데이터 가져오기 (시도별)
 */
async function fetchHospitalsByRegion(sidoCd: string, maxPages: number = 5): Promise<void> {
  try {
    // 첫 페이지로 전체 개수 파악
    const url = `${HOSPITAL_LIST_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&pageNo=1&numOfRows=100&sidoCd=${sidoCd}`;
    const data = await callApi(url);
    
    const totalCount = parseInt(data.response?.body?.[0]?.totalCount?.[0] || '0');
    const totalPages = Math.ceil(totalCount / 100);
    const items = data.response?.body?.[0]?.items?.[0]?.item || [];
    
    console.log(`시도코드 ${sidoCd}: 총 ${totalCount}개 병원 정보, ${totalPages}페이지 중 최대 ${maxPages}페이지까지 가져옵니다.`);
    
    // 처리 진행률 표시 변수
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // 첫 페이지 데이터 저장
    console.log(`페이지 1/${Math.min(totalPages, maxPages)} 처리 중...`);
    
    for (const hospitalItem of items) {
      try {
        const hpid = hospitalItem.hpid?.[0];
        if (!hpid) continue;
        
        // 상세 정보 가져오기 (병렬 처리)
        const [detailItem, deptItems, emergencyItem] = await Promise.all([
          fetchHospitalDetail(hpid),
          fetchHospitalDepartments(hpid),
          fetchEmergencyInfo(hpid)
        ]);
        
        // 데이터 변환 및 저장
        const hospitalData = transformHospitalData(hospitalItem, detailItem, deptItems, emergencyItem);
        const hospitalId = await saveHospitalData(hospitalData);
        
        if (hospitalId && deptItems.length > 0) {
          await saveDepartmentData(hospitalId, deptItems);
        }
        
        successCount++;
      } catch (itemError) {
        console.error(`병원 데이터 처리 오류:`, itemError);
        errorCount++;
      }
      
      processedCount++;
      
      // 매 10개마다 진행 상황 출력
      if (processedCount % 10 === 0) {
        console.log(`진행률: ${processedCount}/${totalCount} (성공: ${successCount}, 오류: ${errorCount})`);
      }
      
      // API 호출 제한 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 나머지 페이지 처리
    for (let page = 2; page <= Math.min(totalPages, maxPages); page++) {
      try {
        console.log(`페이지 ${page}/${Math.min(totalPages, maxPages)} 처리 중...`);
        
        const pageUrl = `${HOSPITAL_LIST_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&pageNo=${page}&numOfRows=100&sidoCd=${sidoCd}`;
        const pageData = await callApi(pageUrl);
        const pageItems = pageData.response?.body?.[0]?.items?.[0]?.item || [];
        
        for (const hospitalItem of pageItems) {
          try {
            const hpid = hospitalItem.hpid?.[0];
            if (!hpid) continue;
            
            // 상세 정보 가져오기 (병렬 처리)
            const [detailItem, deptItems, emergencyItem] = await Promise.all([
              fetchHospitalDetail(hpid),
              fetchHospitalDepartments(hpid),
              fetchEmergencyInfo(hpid)
            ]);
            
            // 데이터 변환 및 저장
            const hospitalData = transformHospitalData(hospitalItem, detailItem, deptItems, emergencyItem);
            const hospitalId = await saveHospitalData(hospitalData);
            
            if (hospitalId && deptItems.length > 0) {
              await saveDepartmentData(hospitalId, deptItems);
            }
            
            successCount++;
          } catch (itemError) {
            console.error(`병원 데이터 처리 오류:`, itemError);
            errorCount++;
          }
          
          processedCount++;
          
          // 매 10개마다 진행 상황 출력
          if (processedCount % 10 === 0) {
            console.log(`진행률: ${processedCount}/${totalCount} (성공: ${successCount}, 오류: ${errorCount})`);
          }
          
          // API 호출 제한 방지를 위한 딜레이
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 페이지 간 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (pageError) {
        console.error(`페이지 ${page} 처리 오류:`, pageError);
      }
    }
    
    console.log(`시도코드 ${sidoCd} 데이터 수집 완료. 총 ${processedCount}개 처리 (성공: ${successCount}, 오류: ${errorCount})`);
    
  } catch (error) {
    console.error(`시도코드 ${sidoCd} 데이터 수집 오류:`, error);
    throw error;
  }
}

/**
 * 병원 종류별 데이터 가져오기
 */
async function fetchHospitalsByType(sgguCd: string, maxPages: number = 3): Promise<void> {
  try {
    // 첫 페이지로 전체 개수 파악
    const url = `${HOSPITAL_LIST_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&pageNo=1&numOfRows=100&sgguCd=${sgguCd}`;
    const data = await callApi(url);
    
    const totalCount = parseInt(data.response?.body?.[0]?.totalCount?.[0] || '0');
    const totalPages = Math.ceil(totalCount / 100);
    const items = data.response?.body?.[0]?.items?.[0]?.item || [];
    
    console.log(`시군구코드 ${sgguCd}: 총 ${totalCount}개 병원 정보, ${totalPages}페이지 중 최대 ${maxPages}페이지까지 가져옵니다.`);
    
    // 처리 진행률 표시 변수
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // 첫 페이지 데이터 저장
    console.log(`페이지 1/${Math.min(totalPages, maxPages)} 처리 중...`);
    
    for (const hospitalItem of items) {
      try {
        const hpid = hospitalItem.hpid?.[0];
        if (!hpid) continue;
        
        // 상세 정보 가져오기 (병렬 처리)
        const [detailItem, deptItems, emergencyItem] = await Promise.all([
          fetchHospitalDetail(hpid),
          fetchHospitalDepartments(hpid),
          fetchEmergencyInfo(hpid)
        ]);
        
        // 데이터 변환 및 저장
        const hospitalData = transformHospitalData(hospitalItem, detailItem, deptItems, emergencyItem);
        const hospitalId = await saveHospitalData(hospitalData);
        
        if (hospitalId && deptItems.length > 0) {
          await saveDepartmentData(hospitalId, deptItems);
        }
        
        successCount++;
      } catch (itemError) {
        console.error(`병원 데이터 처리 오류:`, itemError);
        errorCount++;
      }
      
      processedCount++;
      
      // 매 10개마다 진행 상황 출력
      if (processedCount % 10 === 0) {
        console.log(`진행률: ${processedCount}/${totalCount} (성공: ${successCount}, 오류: ${errorCount})`);
      }
      
      // API 호출 제한 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 나머지 페이지 처리는 생략 (maxPages에 따라 처리)
    
    console.log(`시군구코드 ${sgguCd} 데이터 수집 완료. 총 ${processedCount}개 처리 (성공: ${successCount}, 오류: ${errorCount})`);
    
  } catch (error) {
    console.error(`시군구코드 ${sgguCd} 데이터 수집 오류:`, error);
    throw error;
  }
}

/**
 * 주요 지역 병원 데이터 가져오기
 */
export async function fetchMajorCitiesHospitalData(): Promise<void> {
  try {
    // 주요 시도 지역 코드 (서울, 부산, 대구, 인천, 광주, 대전, 울산)
    const majorCityCodes = ['110000', '210000', '220000', '230000', '240000', '250000', '260000'];
    
    // 시도별로 데이터 순차 수집
    for (const sidoCd of majorCityCodes) {
      console.log(`\n===== 시도코드 ${sidoCd} 병원 데이터 수집 시작 =====\n`);
      await fetchHospitalsByRegion(sidoCd, 3); // 각 지역별 최대 3페이지(300개)까지만 가져오기
      
      // 지역 간 딜레이
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n===== 주요 도시 병원 데이터 수집 완료 =====\n');
  } catch (error) {
    console.error('주요 도시 데이터 수집 오류:', error);
    throw error;
  }
}

/**
 * 심장 전문 병원 데이터 가져오기
 */
export async function fetchHeartSpecialtyHospitals(): Promise<void> {
  try {
    console.log('\n===== 심장 전문 병원 데이터 수집 시작 =====\n');
    
    // 서울, 경기 지역의 상급종합병원, 종합병원 데이터 가져오기
    const regions = ['110000', '310000']; // 서울, 경기도
    
    for (const sidoCd of regions) {
      const url = `${HOSPITAL_LIST_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&pageNo=1&numOfRows=100&sidoCd=${sidoCd}`;
      const data = await callApi(url);
      
      const items = data.response?.body?.[0]?.items?.[0]?.item || [];
      
      // 종합병원 필터링
      const largeHospitals = items.filter(item => {
        const hospitalType = item.dutyDivNam?.[0] || '';
        return hospitalType.includes('상급종합') || hospitalType.includes('종합병원');
      });
      
      console.log(`시도코드 ${sidoCd}에서 ${largeHospitals.length}개 종합병원 발견`);
      
      for (const hospitalItem of largeHospitals) {
        try {
          const hpid = hospitalItem.hpid?.[0];
          if (!hpid) continue;
          
          // 진료과목 정보만 먼저 가져와서 심장 관련 과목이 있는지 확인
          const deptItems = await fetchHospitalDepartments(hpid);
          
          const hasHeartDept = deptItems.some(dept => 
            HEART_RELATED_DEPTS.includes(dept.dgsbjtCdNm?.[0] || '')
          );
          
          // 심장 관련 과목이 있는 병원만 상세 정보 가져오기
          if (hasHeartDept) {
            console.log(`심장 전문 병원 발견: ${hospitalItem.dutyName?.[0]} (${hpid})`);
            
            const [detailItem, emergencyItem] = await Promise.all([
              fetchHospitalDetail(hpid),
              fetchEmergencyInfo(hpid)
            ]);
            
            // 데이터 변환 및 저장
            const hospitalData = transformHospitalData(hospitalItem, detailItem, deptItems, emergencyItem);
            hospitalData.isHeartCenter = true; // 심장 전문 병원으로 표시
            
            const hospitalId = await saveHospitalData(hospitalData);
            
            if (hospitalId) {
              await saveDepartmentData(hospitalId, deptItems);
            }
          }
        } catch (error) {
          console.error(`병원 데이터 처리 오류:`, error);
        }
        
        // API 호출 제한 방지를 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log('\n===== 심장 전문 병원 데이터 수집 완료 =====\n');
  } catch (error) {
    console.error('심장 전문 병원 데이터 수집 오류:', error);
    throw error;
  }
}

// 메인 실행 함수
async function main() {
  try {
    console.log('병원 데이터 수집 시작...');
    
    // 1. 주요 도시 병원 데이터 가져오기
    await fetchMajorCitiesHospitalData();
    
    // 2. 심장 전문 병원 데이터 가져오기
    await fetchHeartSpecialtyHospitals();
    
    console.log('모든 데이터 수집 작업 완료!');
    process.exit(0);
  } catch (error) {
    console.error('데이터 수집 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시 메인 함수 호출
if (require.main === module) {
  main();
}