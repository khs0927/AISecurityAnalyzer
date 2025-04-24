import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { db } from '../db';
import { hospitals } from '@shared/schema';

// 건강보험심사평가원 API 설정
const API_BASE_URL = 'http://apis.data.go.kr/B551182/hospInfoServicev2';
const API_KEY = 't61l9sApoYD1s94RX8r8mk68mMtGPVT4gsKp7eG3e86b2tzDANPjoHscFR7C/6i0arJe3lMxEUhELK5o6avD3g==';
const DECODE_KEY = encodeURIComponent(API_KEY);

/**
 * 병원 데이터 페이지별 가져오기
 */
async function fetchHospitalDataPage(pageNo: number, numOfRows: number = 100): Promise<any> {
  try {
    // API 엔드포인트 구성 (건강보험심사평가원 병원정보서비스)
    const url = `${API_BASE_URL}/getHospBasisList?serviceKey=${DECODE_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`;
    
    console.log(`페이지 ${pageNo} 데이터 요청 중...`);
    const response = await axios.get(url);
    
    // XML 응답을 JSON으로 변환
    const result = await parseStringPromise(response.data);
    
    // 응답 확인
    if (result.response?.header?.[0]?.resultCode?.[0] !== '00') {
      throw new Error(`API 오류: ${result.response?.header?.[0]?.resultMsg?.[0]}`);
    }
    
    // 실제 병원 데이터 추출
    const items = result.response?.body?.[0]?.items?.[0]?.item;
    const totalCount = parseInt(result.response?.body?.[0]?.totalCount?.[0] || '0');
    
    return {
      items,
      totalCount,
      pageNo,
      numOfRows
    };
  } catch (error) {
    console.error('병원 데이터 가져오기 오류:', error);
    throw error;
  }
}

/**
 * 병원 상세 정보 가져오기
 */
async function fetchHospitalDetail(hpid: string): Promise<any> {
  try {
    const url = `${API_BASE_URL}/getHospBasisList?serviceKey=${DECODE_KEY}&HPID=${hpid}`;
    
    const response = await axios.get(url);
    
    // XML 응답을 JSON으로 변환
    const result = await parseStringPromise(response.data);
    
    // 응답 확인
    if (result.response?.header?.[0]?.resultCode?.[0] !== '00') {
      throw new Error(`API 오류: ${result.response?.header?.[0]?.resultMsg?.[0]}`);
    }
    
    // 실제 병원 데이터 추출
    const item = result.response?.body?.[0]?.items?.[0]?.item?.[0];
    
    return item;
  } catch (error) {
    console.error(`병원 상세 정보(${hpid}) 가져오기 오류:`, error);
    return null;
  }
}

/**
 * 병원 데이터를 데이터베이스에 삽입
 */
async function insertHospitalData(hospitalData: any[]): Promise<void> {
  try {
    console.log(`${hospitalData.length}개 병원 데이터 처리 중...`);
    
    // 병원 데이터 매핑 및 삽입
    for (const item of hospitalData) {
      // XML 데이터를 우리 스키마에 맞게 변환
      const hospitalRecord = {
        hiraId: item.hpid?.[0],
        name: item.dutyName?.[0] || '',
        type: item.dutyDivNam?.[0],
        category: item.dgsbjtCdNm?.[0],
        address: `${item.dutyAddr?.[0]}`,
        zipCode: item.postCdn1?.[0],
        phone: item.dutyTel1?.[0],
        latitude: parseFloat(item.wgs84Lat?.[0] || '0'),
        longitude: parseFloat(item.wgs84Lon?.[0] || '0'),
        isEmergency: item.dutyEmcls?.[0] === '1',
        isOpen24h: item.duty24?.[0] === '1',
        // 심장 전문 센터 여부는 API에서 직접 제공하지 않으므로 진료과목으로 유추
        isHeartCenter: (item.dgsbjtCdNm?.[0] || '').includes('순환기') || 
                       (item.dgsbjtCdNm?.[0] || '').includes('심장'),
        specialty: item.dgsbjtCdNm?.[0] ? [item.dgsbjtCdNm?.[0]] : [],
        openingHours: {
          monday: item.dutyTime1s?.[0] && item.dutyTime1c?.[0] ? 
            { open: item.dutyTime1s?.[0], close: item.dutyTime1c?.[0] } : null,
          tuesday: item.dutyTime2s?.[0] && item.dutyTime2c?.[0] ? 
            { open: item.dutyTime2s?.[0], close: item.dutyTime2c?.[0] } : null,
          wednesday: item.dutyTime3s?.[0] && item.dutyTime3c?.[0] ? 
            { open: item.dutyTime3s?.[0], close: item.dutyTime3c?.[0] } : null,
          thursday: item.dutyTime4s?.[0] && item.dutyTime4c?.[0] ? 
            { open: item.dutyTime4s?.[0], close: item.dutyTime4c?.[0] } : null,
          friday: item.dutyTime5s?.[0] && item.dutyTime5c?.[0] ? 
            { open: item.dutyTime5s?.[0], close: item.dutyTime5c?.[0] } : null,
          saturday: item.dutyTime6s?.[0] && item.dutyTime6c?.[0] ? 
            { open: item.dutyTime6s?.[0], close: item.dutyTime6c?.[0] } : null,
          sunday: item.dutyTime7s?.[0] && item.dutyTime7c?.[0] ? 
            { open: item.dutyTime7s?.[0], close: item.dutyTime7c?.[0] } : null,
          holiday: item.dutyTime8s?.[0] && item.dutyTime8c?.[0] ? 
            { open: item.dutyTime8s?.[0], close: item.dutyTime8c?.[0] } : null,
        },
        websiteUrl: item.dutyUrl?.[0],
        imageUrl: null,
      };
      
      // 이미 존재하는지 확인 (hiraId로)
      const existingHospital = await db.select()
        .from(hospitals)
        .where({ hiraId: hospitalRecord.hiraId })
        .limit(1);
      
      if (existingHospital.length > 0) {
        // 기존 병원 데이터 업데이트
        await db.update(hospitals)
          .set({ ...hospitalRecord, updatedAt: new Date() })
          .where({ hiraId: hospitalRecord.hiraId });
        
        console.log(`병원 업데이트: ${hospitalRecord.name}`);
      } else {
        // 새 병원 추가
        await db.insert(hospitals).values(hospitalRecord);
        console.log(`병원 추가됨: ${hospitalRecord.name}`);
      }
    }
    
    console.log('병원 데이터 처리 완료!');
  } catch (error) {
    console.error('병원 데이터 삽입 오류:', error);
    throw error;
  }
}

/**
 * 모든 병원 데이터 가져오기 및 저장 (페이지네이션 처리)
 */
export async function fetchAllHospitalData(limit: number = 10): Promise<void> {
  try {
    let pageNo = 1;
    const numOfRows = 100;
    let totalCount = 0;
    let processedCount = 0;
    
    // 첫 페이지로 총 개수 파악
    const firstPageResult = await fetchHospitalDataPage(pageNo, numOfRows);
    totalCount = firstPageResult.totalCount;
    
    console.log(`총 ${totalCount}개 병원 데이터 중 최대 ${limit * numOfRows}개 가져오기...`);
    
    // 첫 페이지 데이터 처리
    if (firstPageResult.items && firstPageResult.items.length > 0) {
      await insertHospitalData(firstPageResult.items);
      processedCount += firstPageResult.items.length;
    }
    
    // 남은 페이지 처리 (최대 limit 페이지까지)
    const totalPages = Math.ceil(totalCount / numOfRows);
    const maxPages = Math.min(totalPages, limit);
    
    for (pageNo = 2; pageNo <= maxPages; pageNo++) {
      const pageResult = await fetchHospitalDataPage(pageNo, numOfRows);
      
      if (pageResult.items && pageResult.items.length > 0) {
        await insertHospitalData(pageResult.items);
        processedCount += pageResult.items.length;
      }
      
      // API 호출 제한 방지를 위한 지연
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`총 ${processedCount}개 병원 데이터 처리 완료`);
  } catch (error) {
    console.error('전체 병원 데이터 가져오기 오류:', error);
    throw error;
  }
}

// 스크립트 직접 실행 시 사용
if (require.main === module) {
  fetchAllHospitalData(5)
    .then(() => {
      console.log('병원 데이터 수집 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('오류 발생:', error);
      process.exit(1);
    });
}