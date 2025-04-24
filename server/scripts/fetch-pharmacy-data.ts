/**
 * 건강보험심사평가원 API를 이용하여 약국 데이터를 가져와 데이터베이스에 저장하는 스크립트
 */

import { db } from '../db';
import { pharmacies } from '@shared/schema';
import { eq } from 'drizzle-orm';

// 내장 모듈 사용
import http from 'http';
import https from 'https';
import { promisify } from 'util';
import { parseString } from 'xml2js';

// xml2js 프로미스 버전 생성
const parseStringPromise = promisify(parseString);

// API 키 설정
const API_KEY = process.env.HIRA_API_KEY || 't61l9sApoYD1s94RX8r8mk68mMtGPVT4gsKp7eG3e86b2tzDANPjoHscFR7C/6i0arJe3lMxEUhELK5o6avD3g==';
const ENCODED_API_KEY = encodeURIComponent(API_KEY);

// API 엔드포인트
const API_BASE_URL = 'http://apis.data.go.kr/B551182/pharmacyInfoService';
const PHARMACY_LIST_ENDPOINT = `${API_BASE_URL}/getParmacyBasisList`;
const PHARMACY_DETAIL_ENDPOINT = `${API_BASE_URL}/getParmacyFullDown`;

/**
 * XML API 호출 함수 (내장 https 모듈 사용)
 */
async function callApi(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`API 호출: ${url}`);
    
    const httpModule = url.startsWith('https:') ? https : http;
    
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
        } catch (parseError: any) {
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
 * 페이지별 약국 목록 가져오기
 */
async function fetchPharmacyListByPage(pageNo: number, numOfRows: number = 100): Promise<any> {
  const url = `${PHARMACY_LIST_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`;
  
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
    console.error(`약국 목록 (페이지 ${pageNo}) 가져오기 오류:`, error);
    throw error;
  }
}

/**
 * 약국 상세 정보 가져오기
 */
async function fetchPharmacyDetail(hpid: string): Promise<any> {
  const url = `${PHARMACY_DETAIL_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&hpid=${hpid}`;
  
  try {
    const data = await callApi(url);
    const items = data.response?.body?.[0]?.items?.[0]?.item || [];
    return items.length > 0 ? items[0] : null;
  } catch (error) {
    console.error(`약국 상세 정보 (HPID: ${hpid}) 가져오기 오류:`, error);
    return null;
  }
}

/**
 * API 데이터를 데이터베이스 형식으로 변환
 */
function transformPharmacyData(pharmacyItem: any, detailItem?: any): any {
  const result = {
    hiraId: pharmacyItem.hpid?.[0],
    name: pharmacyItem.dutyName?.[0] || '',
    address: pharmacyItem.dutyAddr?.[0] || '',
    zipCode: pharmacyItem.postCdn1?.[0] || '',
    phone: pharmacyItem.dutyTel1?.[0] || '',
    latitude: parseFloat(pharmacyItem.wgs84Lat?.[0] || '0'),
    longitude: parseFloat(pharmacyItem.wgs84Lon?.[0] || '0'),
    isOpen24h: pharmacyItem.duty24?.[0] === '1',
    openingHours: {
      monday: pharmacyItem.dutyTime1s?.[0] && pharmacyItem.dutyTime1c?.[0] ? 
        { open: pharmacyItem.dutyTime1s?.[0], close: pharmacyItem.dutyTime1c?.[0] } : null,
      tuesday: pharmacyItem.dutyTime2s?.[0] && pharmacyItem.dutyTime2c?.[0] ? 
        { open: pharmacyItem.dutyTime2s?.[0], close: pharmacyItem.dutyTime2c?.[0] } : null,
      wednesday: pharmacyItem.dutyTime3s?.[0] && pharmacyItem.dutyTime3c?.[0] ? 
        { open: pharmacyItem.dutyTime3s?.[0], close: pharmacyItem.dutyTime3c?.[0] } : null,
      thursday: pharmacyItem.dutyTime4s?.[0] && pharmacyItem.dutyTime4c?.[0] ? 
        { open: pharmacyItem.dutyTime4s?.[0], close: pharmacyItem.dutyTime4c?.[0] } : null,
      friday: pharmacyItem.dutyTime5s?.[0] && pharmacyItem.dutyTime5c?.[0] ? 
        { open: pharmacyItem.dutyTime5s?.[0], close: pharmacyItem.dutyTime5c?.[0] } : null,
      saturday: pharmacyItem.dutyTime6s?.[0] && pharmacyItem.dutyTime6c?.[0] ? 
        { open: pharmacyItem.dutyTime6s?.[0], close: pharmacyItem.dutyTime6c?.[0] } : null,
      sunday: pharmacyItem.dutyTime7s?.[0] && pharmacyItem.dutyTime7c?.[0] ? 
        { open: pharmacyItem.dutyTime7s?.[0], close: pharmacyItem.dutyTime7c?.[0] } : null,
      holiday: pharmacyItem.dutyTime8s?.[0] && pharmacyItem.dutyTime8c?.[0] ? 
        { open: pharmacyItem.dutyTime8s?.[0], close: pharmacyItem.dutyTime8c?.[0] } : null,
    },
    websiteUrl: pharmacyItem.dutyUrl?.[0] || '',
    imageUrl: null,
    description: '약국',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return result;
}

/**
 * 약국 데이터 저장 함수
 */
async function savePharmacyData(pharmacyData: any): Promise<number | undefined> {
  try {
    // 기존 약국 확인
    const existingPharmacy = await db.select({ id: pharmacies.id })
      .from(pharmacies)
      .where(eq(pharmacies.hiraId, pharmacyData.hiraId))
      .limit(1);
      
    if (existingPharmacy.length > 0) {
      // 기존 약국 업데이트
      await db.update(pharmacies)
        .set({
          ...pharmacyData,
          updatedAt: new Date()
        })
        .where(eq(pharmacies.hiraId, pharmacyData.hiraId));
        
      console.log(`약국 업데이트: ${pharmacyData.name} (${pharmacyData.hiraId})`);
      return existingPharmacy[0].id;
    } else {
      // 새 약국 추가
      const result = await db.insert(pharmacies)
        .values(pharmacyData)
        .returning({ id: pharmacies.id });
        
      if (result.length > 0) {
        console.log(`약국 추가: ${pharmacyData.name} (${pharmacyData.hiraId})`);
        return result[0].id;
      }
    }
  } catch (error) {
    console.error(`약국 저장 오류 (${pharmacyData.name}):`, error);
  }
  
  return undefined;
}

/**
 * 전체 약국 데이터 가져오기 및 저장 함수
 */
async function fetchAndSaveAllPharmacyData(maxPages: number = 10): Promise<void> {
  try {
    // 첫 페이지로 전체 개수 파악
    const firstPage = await fetchPharmacyListByPage(1, 100);
    const totalCount = firstPage.totalCount;
    const totalPages = Math.ceil(totalCount / 100);
    
    console.log(`총 ${totalCount}개 약국 정보, ${totalPages}페이지 중 최대 ${maxPages}페이지까지 가져옵니다.`);
    
    // 처리 진행률 표시 변수
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // 첫 페이지 데이터 저장
    console.log(`페이지 1/${Math.min(totalPages, maxPages)} 처리 중...`);
    
    for (const pharmacyItem of firstPage.items) {
      try {
        const hpid = pharmacyItem.hpid?.[0];
        if (!hpid) continue;
        
        // 상세 정보 가져오기
        const detailItem = await fetchPharmacyDetail(hpid);
        
        // 데이터 변환 및 저장
        const pharmacyData = transformPharmacyData(pharmacyItem, detailItem);
        await savePharmacyData(pharmacyData);
        
        successCount++;
      } catch (itemError) {
        console.error(`약국 데이터 처리 오류:`, itemError);
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
        
        const pageData = await fetchPharmacyListByPage(page, 100);
        
        for (const pharmacyItem of pageData.items) {
          try {
            const hpid = pharmacyItem.hpid?.[0];
            if (!hpid) continue;
            
            // 상세 정보 가져오기
            const detailItem = await fetchPharmacyDetail(hpid);
            
            // 데이터 변환 및 저장
            const pharmacyData = transformPharmacyData(pharmacyItem, detailItem);
            await savePharmacyData(pharmacyData);
            
            successCount++;
          } catch (itemError) {
            console.error(`약국 데이터 처리 오류:`, itemError);
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
 * 지역별 약국 데이터 가져오기 (시도별)
 */
async function fetchPharmaciesByRegion(sidoCd: string, maxPages: number = 5): Promise<void> {
  try {
    // 첫 페이지로 전체 개수 파악
    const url = `${PHARMACY_LIST_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&pageNo=1&numOfRows=100&sidoCd=${sidoCd}`;
    const data = await callApi(url);
    
    const totalCount = parseInt(data.response?.body?.[0]?.totalCount?.[0] || '0');
    const totalPages = Math.ceil(totalCount / 100);
    const items = data.response?.body?.[0]?.items?.[0]?.item || [];
    
    console.log(`시도코드 ${sidoCd}: 총 ${totalCount}개 약국 정보, ${totalPages}페이지 중 최대 ${maxPages}페이지까지 가져옵니다.`);
    
    // 처리 진행률 표시 변수
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // 첫 페이지 데이터 저장
    console.log(`페이지 1/${Math.min(totalPages, maxPages)} 처리 중...`);
    
    for (const pharmacyItem of items) {
      try {
        const hpid = pharmacyItem.hpid?.[0];
        if (!hpid) continue;
        
        // 상세 정보 가져오기
        const detailItem = await fetchPharmacyDetail(hpid);
        
        // 데이터 변환 및 저장
        const pharmacyData = transformPharmacyData(pharmacyItem, detailItem);
        await savePharmacyData(pharmacyData);
        
        successCount++;
      } catch (itemError) {
        console.error(`약국 데이터 처리 오류:`, itemError);
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
        
        const pageUrl = `${PHARMACY_LIST_ENDPOINT}?serviceKey=${ENCODED_API_KEY}&pageNo=${page}&numOfRows=100&sidoCd=${sidoCd}`;
        const pageData = await callApi(pageUrl);
        const pageItems = pageData.response?.body?.[0]?.items?.[0]?.item || [];
        
        for (const pharmacyItem of pageItems) {
          try {
            const hpid = pharmacyItem.hpid?.[0];
            if (!hpid) continue;
            
            // 상세 정보 가져오기
            const detailItem = await fetchPharmacyDetail(hpid);
            
            // 데이터 변환 및 저장
            const pharmacyData = transformPharmacyData(pharmacyItem, detailItem);
            await savePharmacyData(pharmacyData);
            
            successCount++;
          } catch (itemError) {
            console.error(`약국 데이터 처리 오류:`, itemError);
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
 * 주요 지역 약국 데이터 가져오기
 */
export async function fetchMajorCitiesPharmacyData(): Promise<void> {
  try {
    // 주요 시도 지역 코드 (서울, 부산, 대구, 인천, 광주, 대전, 울산)
    const majorCityCodes = ['110000', '210000', '220000', '230000', '240000', '250000', '260000'];
    
    // 시도별로 데이터 순차 수집
    for (const sidoCd of majorCityCodes) {
      console.log(`\n===== 시도코드 ${sidoCd} 약국 데이터 수집 시작 =====\n`);
      await fetchPharmaciesByRegion(sidoCd, 2); // 각 지역별 최대 2페이지(200개)까지만 가져오기
      
      // 지역 간 딜레이
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n===== 주요 도시 약국 데이터 수집 완료 =====\n');
  } catch (error) {
    console.error('주요 도시 약국 데이터 수집 오류:', error);
    throw error;
  }
}

// 메인 실행 함수
async function main() {
  try {
    console.log('약국 데이터 수집 시작...');
    
    // 주요 도시 약국 데이터 가져오기
    await fetchMajorCitiesPharmacyData();
    
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