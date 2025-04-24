/**
 * 전국 병원 정보 가져오기 스크립트
 * HIRA 데이터를 기반으로 전국 병원 정보를 수집하고 데이터베이스에 저장
 */
import { db } from '../db';
import { hospitals, hospitalDepartments } from '@shared/schema';
import { eq } from 'drizzle-orm';
// fetch API는 Node.js에 기본적으로 포함되어 있음
import * as fs from 'fs';
import * as path from 'path';

// HIRA API 키 (실제 운영 시에는 환경 변수에서 가져와야 함)
const HIRA_API_KEY = 'demo_key'; // 실제 API 키로 대체 필요

/**
 * HIRA API를 통해 전국 병원 정보 가져오기
 */
export async function fetchNationwideHospitals() {
  try {
    console.log('전국 병원 데이터 가져오기 시작...');
    
    // 기본 병원 데이터 - 주요 병원들이 데이터에서 누락되었을 경우를 대비
    const essentialHospitals = [
      // 전국 주요 대학병원 및 심장전문 병원
      {
        name: '서울대학교병원',
        address: '서울특별시 종로구 대학로 101',
        phone: '02-2072-2114',
        latitude: 37.579617,
        longitude: 126.998814,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'SEOUL001'
      },
      {
        name: '서울아산병원',
        address: '서울특별시 송파구 올림픽로 43길 88',
        phone: '1688-7575',
        latitude: 37.527126,
        longitude: 127.108673,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'SEOUL002'
      },
      {
        name: '서울아산병원 심장병원',
        address: '서울특별시 송파구 올림픽로 43길 88',
        phone: '1688-7575',
        latitude: 37.527,
        longitude: 127.1082,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['심장내과', '심장외과', '심장혈관센터'],
        hiraId: 'SEOUL003'
      },
      {
        name: '서울심장센터',
        address: '서울특별시 강남구 압구정로 306',
        phone: '02-516-0733',
        latitude: 37.5209,
        longitude: 127.0347,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['심장내과', '심장외과', '심장재활'],
        hiraId: 'SEOUL004'
      },
      // 울산 지역 병원 (심장 전문)
      {
        name: '울산대학교병원',
        address: '울산광역시 동구 방어진순환도로 877',
        phone: '052-250-7000',
        latitude: 35.5300,
        longitude: 129.4134,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'ULSAN001'
      },
      // 부산 지역 병원 (심장 전문)
      {
        name: '부산심장병원',
        address: '부산광역시 해운대구 해운대로 371번길 32',
        phone: '051-780-0777',
        latitude: 35.1666,
        longitude: 129.1294,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['심장내과', '심장외과', '중환자의학과'],
        hiraId: 'BUSAN001'
      },
      // 대구 지역 병원 (심장 전문)
      {
        name: '경북대학교병원',
        address: '대구광역시 중구 동덕로 130',
        phone: '053-200-5114',
        latitude: 35.8664,
        longitude: 128.6057,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'DAEGU001'
      },
      // 다른 심장 전문 병원 및 주요 응급센터 추가
    ];
    
    // 전국 종합병원 및 응급센터 추가 데이터 구축
    const additionalHospitals = [
      // 서울 지역 병원 추가
      {
        name: '세브란스병원',
        address: '서울특별시 서대문구 연세로 50-1',
        phone: '02-2228-0114',
        latitude: 37.5622,
        longitude: 126.9410,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'SEOUL005'
      },
      {
        name: '강북삼성병원',
        address: '서울특별시 종로구 새문안로 29',
        phone: '1599-8114',
        latitude: 37.5706,
        longitude: 126.9667,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '응급의학과'],
        hiraId: 'SEOUL006'
      },
      {
        name: '고려대학교병원',
        address: '서울특별시 성북구 인촌로 73',
        phone: '02-920-5114',
        latitude: 37.5865,
        longitude: 127.0255,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'SEOUL007'
      },
      // 경기 지역 병원 추가
      {
        name: '분당서울대학교병원',
        address: '경기도 성남시 분당구 구미로173번길 82',
        phone: '1588-3369',
        latitude: 37.3554,
        longitude: 127.1227,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GYEONGGI001'
      },
      {
        name: '아주대학교병원',
        address: '경기도 수원시 영통구 월드컵로 164',
        phone: '1688-6114',
        latitude: 37.2784,
        longitude: 127.0444,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GYEONGGI002'
      },
      // 인천 지역 병원 추가
      {
        name: '인하대학교병원',
        address: '인천광역시 중구 인항로 27',
        phone: '032-890-2114',
        latitude: 37.4524,
        longitude: 126.6399,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'INCHEON001'
      },
      {
        name: '가천대 길병원',
        address: '인천광역시 남동구 남동대로 774번길 21',
        phone: '1577-2299',
        latitude: 37.4533,
        longitude: 126.7012,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'INCHEON002'
      },
      // 대전 지역 병원 추가
      {
        name: '충남대학교병원',
        address: '대전광역시 중구 문화로 282',
        phone: '042-280-7114',
        latitude: 36.3219,
        longitude: 127.4080,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'DAEJEON001'
      },
      {
        name: '대전을지대학교병원',
        address: '대전광역시 서구 둔산서로 95',
        phone: '042-611-3000',
        latitude: 36.3524,
        longitude: 127.3874,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '응급의학과'],
        hiraId: 'DAEJEON002'
      },
      // 광주 지역 병원 추가
      {
        name: '전남대학교병원',
        address: '광주광역시 동구 제봉로 42',
        phone: '062-220-5114',
        latitude: 35.1411,
        longitude: 126.9250,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GWANGJU001'
      },
      {
        name: '조선대학교병원',
        address: '광주광역시 동구 필문대로 365',
        phone: '062-220-3114',
        latitude: 35.1408,
        longitude: 126.9314,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GWANGJU002'
      },
      // 전라 지역 병원 추가
      {
        name: '전북대학교병원',
        address: '전라북도 전주시 덕진구 건지로 20',
        phone: '063-250-1114',
        latitude: 35.8464,
        longitude: 127.1396,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'JEONBUK001'
      },
      {
        name: '원광대학교병원',
        address: '전라북도 익산시 무왕로 895',
        phone: '063-859-1114',
        latitude: 35.9580,
        longitude: 126.9546,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '응급의학과'],
        hiraId: 'JEONBUK002'
      },
      // 충청 지역 병원 추가
      {
        name: '충북대학교병원',
        address: '충청북도 청주시 서원구 1순환로 776',
        phone: '043-269-6114',
        latitude: 36.6236,
        longitude: 127.4935,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '응급의학과'],
        hiraId: 'CHUNGBUK001'
      },
      {
        name: '단국대학교병원',
        address: '충청남도 천안시 동남구 망향로 201',
        phone: '041-550-6791',
        latitude: 36.8484,
        longitude: 127.1526,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'CHUNGNAM001'
      },
      // 강원 지역 병원 추가
      {
        name: '강릉아산병원',
        address: '강원특별자치도 강릉시 사천면 방동길 38',
        phone: '033-610-3114',
        latitude: 37.7932,
        longitude: 128.8679,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GANGWON001'
      },
      {
        name: '원주세브란스기독병원',
        address: '강원특별자치도 원주시 일산로 20',
        phone: '033-741-0114',
        latitude: 37.3418,
        longitude: 127.9251,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GANGWON002'
      },
      // 경상 지역 병원 추가
      {
        name: '경상국립대학교병원',
        address: '경상남도 진주시 강남로 79',
        phone: '055-750-8000',
        latitude: 35.1801,
        longitude: 128.0941,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GYEONGNAM001'
      },
      {
        name: '창원경상국립대학교병원',
        address: '경상남도 창원시 성산구 삼정자로 11',
        phone: '055-214-2000',
        latitude: 35.2224,
        longitude: 128.6812,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GYEONGNAM002'
      },
      // 제주 지역 병원 추가
      {
        name: '제주대학교병원',
        address: '제주특별자치도 제주시 아란13길 15',
        phone: '064-717-1114',
        latitude: 33.4682,
        longitude: 126.5369,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '응급의학과'],
        hiraId: 'JEJU001'
      },
      {
        name: '한라병원',
        address: '제주특별자치도 제주시 도령로 65',
        phone: '064-740-5000',
        latitude: 33.4903,
        longitude: 126.4794,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEJU002'
      },
      // 부산 지역 추가 병원들
      {
        name: '부산대학교병원',
        address: '부산광역시 서구 구덕로 179',
        phone: '051-240-7000',
        latitude: 35.1039,
        longitude: 129.0145,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'BUSAN002'
      },
      {
        name: '인제대학교 부산백병원',
        address: '부산광역시 부산진구 복지로 75',
        phone: '051-890-6114',
        latitude: 35.1513,
        longitude: 129.0336,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'BUSAN003'
      }
    ];
    
    // 모든 병원 데이터 합치기
    const allHospitals = [...essentialHospitals, ...additionalHospitals];
    
    // HIRA API로부터 추가 데이터를 가져오는 로직
    // (실제 API 구현 시 여기에 코드 추가)
    
    // 데이터 입력 및 업데이트
    console.log(`총 ${allHospitals.length}개 병원 데이터 처리 시작...`);
    
    let addedCount = 0;
    let updatedCount = 0;
    let existingCount = 0;
    
    for (const hospital of allHospitals) {
      // 이미 존재하는 병원인지 확인
      const existingHospital = await db.select()
        .from(hospitals)
        .where(eq(hospitals.name, hospital.name))
        .limit(1);
      
      if (existingHospital.length === 0) {
        // 새 병원 추가
        console.log(`병원 추가: ${hospital.name}`);
        
        const newHospital = await db.insert(hospitals)
          .values({
            name: hospital.name,
            address: hospital.address,
            phone: hospital.phone,
            latitude: hospital.latitude,
            longitude: hospital.longitude,
            isEmergency: hospital.isEmergency,
            isOpen24h: hospital.isOpen24h,
            isHeartCenter: hospital.isHeartCenter,
            specialty: hospital.specialty,
            hiraId: hospital.hiraId
          })
          .returning();
        
        if (newHospital.length > 0) {
          const hospitalId = newHospital[0].id;
          
          // 진료과목 데이터 추가
          for (const dept of hospital.specialty) {
            await db.insert(hospitalDepartments)
              .values({
                name: dept,
                hospitalId: hospitalId
              })
              .onConflictDoNothing();
          }
          
          addedCount++;
        }
      } else {
        // 기존 병원 정보 업데이트 (심장 전문, 응급실, 24시간 운영 정보 등)
        const existingId = existingHospital[0].id;
        const needsUpdate = 
          existingHospital[0].isHeartCenter !== hospital.isHeartCenter ||
          existingHospital[0].isEmergency !== hospital.isEmergency ||
          existingHospital[0].isOpen24h !== hospital.isOpen24h;
        
        if (needsUpdate) {
          console.log(`병원 정보 업데이트: ${hospital.name}`);
          
          await db.update(hospitals)
            .set({
              isHeartCenter: hospital.isHeartCenter,
              isEmergency: hospital.isEmergency,
              isOpen24h: hospital.isOpen24h,
              specialty: hospital.specialty
            })
            .where(eq(hospitals.id, existingId));
          
          updatedCount++;
        } else {
          console.log(`이미 존재하는 병원 (변경 없음): ${hospital.name}`);
          existingCount++;
        }
      }
    }
    
    console.log(`전국 병원 데이터 처리 완료! 추가: ${addedCount}, 업데이트: ${updatedCount}, 변경 없음: ${existingCount}`);
    
    return {
      success: true,
      message: `전국 병원 데이터를 성공적으로 처리했습니다. (추가: ${addedCount}, 업데이트: ${updatedCount}, 변경 없음: ${existingCount})`,
      added: addedCount,
      updated: updatedCount,
      unchanged: existingCount
    };
    
  } catch (error: any) {
    console.error('전국 병원 데이터 가져오기 오류:', error);
    return {
      success: false,
      message: '전국 병원 데이터 가져오기 중 오류가 발생했습니다.',
      error: error.message
    };
  }
}

/**
 * 스크립트를 직접 실행하는 메인 함수
 */
export async function main() {
  console.log('전국 병원 데이터 가져오기 시작...');
  
  try {
    const result = await fetchNationwideHospitals();
    console.log('전국 병원 데이터 가져오기 결과:', result);
  } catch (error) {
    console.error('전국 병원 데이터 가져오기 오류:', error);
  }
}

// ESM 환경에서는 직접 main 함수 호출
main().catch(console.error);