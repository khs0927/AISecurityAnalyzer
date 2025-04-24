/**
 * 전국 모든 지역 종합병원 추가 데이터 스크립트
 */
import { db } from '../db';
import { hospitals, hospitalDepartments } from '@shared/schema';
import { eq } from 'drizzle-orm';

// 전국 모든 지역 종합병원 데이터 추가 함수
export async function addMoreNationwideHospitals() {
  try {
    console.log('전국 모든 지역 종합병원 데이터 추가 시작...');
    
    // 더 많은 지역의 종합병원 데이터
    const moreHospitals = [
      // 대구 지역 병원 추가
      {
        name: '대구가톨릭대학교병원',
        address: '대구광역시 남구 두류공원로 17길 33',
        phone: '053-650-3000',
        latitude: 35.8513,
        longitude: 128.5743,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'DAEGU001'
      },
      {
        name: '경북대학교병원',
        address: '대구광역시 중구 동덕로 130',
        phone: '053-200-5114',
        latitude: 35.8671,
        longitude: 128.6076,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'DAEGU002'
      },
      {
        name: '계명대학교 동산병원',
        address: '대구광역시 달서구 달구벌대로 1035',
        phone: '053-258-6868',
        latitude: 35.8581,
        longitude: 128.4889,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'DAEGU003'
      },
      // 인천 지역 병원 추가
      {
        name: '인하대학교병원',
        address: '인천광역시 중구 인항로 27',
        phone: '032-890-2114',
        latitude: 37.4559,
        longitude: 126.6329,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'INCHEON001'
      },
      {
        name: '길병원',
        address: '인천광역시 남동구 남동대로 774번길 21',
        phone: '032-460-3000',
        latitude: 37.4483,
        longitude: 126.7063,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'INCHEON002'
      },
      {
        name: '인천성모병원',
        address: '인천광역시 부평구 동수로 56',
        phone: '032-280-6114',
        latitude: 37.4840,
        longitude: 126.7230,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'INCHEON003'
      },
      // 광주 지역 병원 추가
      {
        name: '전남대학교병원',
        address: '광주광역시 동구 제봉로 42',
        phone: '062-220-5114',
        latitude: 35.1391,
        longitude: 126.9275,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GWANGJU001'
      },
      {
        name: '조선대학교병원',
        address: '광주광역시 동구 필문대로 365',
        phone: '062-220-3000',
        latitude: 35.1414,
        longitude: 126.9251,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GWANGJU002'
      },
      // 대전 지역 병원 추가
      {
        name: '충남대학교병원',
        address: '대전광역시 중구 문화로 282',
        phone: '042-280-7114',
        latitude: 36.3221,
        longitude: 127.4201,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'DAEJEON001'
      },
      {
        name: '건양대학교병원',
        address: '대전광역시 서구 관저동로 158',
        phone: '042-600-9999',
        latitude: 36.2879,
        longitude: 127.3328,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'DAEJEON002'
      },
      // 경상북도 병원 추가
      {
        name: '구미차병원',
        address: '경상북도 구미시 신시로10길 12',
        phone: '054-450-9700',
        latitude: 36.1169,
        longitude: 128.3462,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGBUK001'
      },
      {
        name: '포항성모병원',
        address: '경상북도 포항시 남구 대잠동길 17',
        phone: '054-272-0151',
        latitude: 36.0094,
        longitude: 129.3435,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGBUK002'
      },
      {
        name: '김천의료원',
        address: '경상북도 김천시 모암길 24',
        phone: '054-429-8000',
        latitude: 36.1232,
        longitude: 128.1173,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGBUK003'
      },
      // 경상남도 병원 추가
      {
        name: '마산의료원',
        address: '경상남도 창원시 마산합포구 3·15대로 231',
        phone: '055-249-1000',
        latitude: 35.2052,
        longitude: 128.5757,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGNAM003'
      },
      {
        name: '진주제일병원',
        address: '경상남도 진주시 진주대로 885',
        phone: '055-750-7000',
        latitude: 35.1825,
        longitude: 128.0843,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGNAM004'
      },
      // 전라북도 병원 추가
      {
        name: '예수병원',
        address: '전라북도 전주시 완산구 서원로 365',
        phone: '063-230-8114',
        latitude: 35.8014,
        longitude: 127.1224,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEONBUK003'
      },
      {
        name: '군산의료원',
        address: '전라북도 군산시 의료원로 27',
        phone: '063-472-5000',
        latitude: 35.9665,
        longitude: 126.7148,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEONBUK004'
      },
      // 전라남도 병원 추가
      {
        name: '목포한국병원',
        address: '전라남도 목포시 영산로 483',
        phone: '061-270-5500',
        latitude: 34.8131,
        longitude: 126.4141,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEONNAM001'
      },
      {
        name: '순천의료원',
        address: '전라남도 순천시 서문성터길 2',
        phone: '061-759-9114',
        latitude: 34.9506,
        longitude: 127.4885,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEONNAM002'
      },
      // 충청북도 병원 추가
      {
        name: '청주성모병원',
        address: '충청북도 청주시 청원구 주성로 173-19',
        phone: '043-219-8000',
        latitude: 36.6806,
        longitude: 127.5042,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'CHUNGBUK002'
      },
      {
        name: '청주한국병원',
        address: '충청북도 청주시 상당구 단재로 106',
        phone: '043-222-7070',
        latitude: 36.6267,
        longitude: 127.4979,
        isEmergency: false,
        isOpen24h: false,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과'],
        hiraId: 'CHUNGBUK003'
      },
      // 충청남도 병원 추가
      {
        name: '홍성의료원',
        address: '충청남도 홍성군 홍성읍 조양로 224',
        phone: '041-630-6114',
        latitude: 36.6011,
        longitude: 126.6654,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'CHUNGNAM002'
      },
      {
        name: '천안충무병원',
        address: '충청남도 천안시 서북구 충무로 165',
        phone: '041-570-7555',
        latitude: 36.8196,
        longitude: 127.1364,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'CHUNGNAM003'
      },
      // 강원도 병원 추가
      {
        name: '춘천성심병원',
        address: '강원특별자치도 춘천시 삭주로 77',
        phone: '033-240-5000',
        latitude: 37.8653,
        longitude: 127.7174,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '응급의학과'],
        hiraId: 'GANGWON003'
      },
      {
        name: '속초의료원',
        address: '강원특별자치도 속초시 영랑호반길 3',
        phone: '033-630-6000',
        latitude: 38.1987,
        longitude: 128.5839,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GANGWON004'
      },
      // 경기도 병원 추가
      {
        name: '광명성애병원',
        address: '경기도 광명시 디지털로 36',
        phone: '02-2680-7114',
        latitude: 37.4727,
        longitude: 126.8646,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGGI003'
      },
      {
        name: '안산한도병원',
        address: '경기도 안산시 단원구 선부광장로 103',
        phone: '031-8040-6600',
        latitude: 37.3348,
        longitude: 126.8118,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGGI004'
      },
      {
        name: '분당차병원',
        address: '경기도 성남시 분당구 야탑로 59',
        phone: '031-780-5000',
        latitude: 37.4112,
        longitude: 127.1266,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GYEONGGI005'
      },
      // 서울 지역 병원 추가
      {
        name: '이대서울병원',
        address: '서울특별시 강서구 마곡동로 24',
        phone: '02-6986-5000',
        latitude: 37.5578,
        longitude: 126.8356,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '응급의학과'],
        hiraId: 'SEOUL008'
      },
      {
        name: '서울성모병원',
        address: '서울특별시 서초구 반포대로 222',
        phone: '1588-1511',
        latitude: 37.5016,
        longitude: 127.0053,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'SEOUL009'
      },
      {
        name: '서울삼성의료원',
        address: '서울특별시 강남구 일원로 81',
        phone: '02-3410-2114',
        latitude: 37.4881,
        longitude: 127.0855,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'SEOUL010'
      },
      // 제주 지역 병원 추가
      {
        name: '서귀포의료원',
        address: '제주특별자치도 서귀포시 장수로 47',
        phone: '064-730-3000',
        latitude: 33.2466,
        longitude: 126.5092,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEJU003'
      },
      // 세종 지역 병원 추가
      {
        name: '세종충남대학교병원',
        address: '세종특별자치시 어진동 239',
        phone: '044-995-1114',
        latitude: 36.5164,
        longitude: 127.2625,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '응급의학과'],
        hiraId: 'SEJONG001'
      },
      {
        name: '세종한사랑병원',
        address: '세종특별자치시 조치원읍 문화2길 34',
        phone: '044-860-7700',
        latitude: 36.6042,
        longitude: 127.2958,
        isEmergency: false,
        isOpen24h: false,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과'],
        hiraId: 'SEJONG002'
      }
    ];
    
    console.log(`총 ${moreHospitals.length}개 병원 데이터 처리 시작...`);
    
    let addedCount = 0;
    let updatedCount = 0;
    let existingCount = 0;
    
    for (const hospital of moreHospitals) {
      // 이미 존재하는 병원인지 이름과 HIRA ID로 확인
      const existingHospitalByName = await db.select()
        .from(hospitals)
        .where(eq(hospitals.name, hospital.name))
        .limit(1);
        
      const existingHospitalByHiraId = await db.select()
        .from(hospitals)
        .where(eq(hospitals.hiraId, hospital.hiraId))
        .limit(1);
        
      const existingHospital = existingHospitalByName.length > 0 ? existingHospitalByName : existingHospitalByHiraId;
      
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
    console.error('전국 병원 데이터 추가 오류:', error);
    return {
      success: false,
      message: '전국 병원 데이터 추가 중 오류가 발생했습니다.',
      error: error.message
    };
  }
}

/**
 * 스크립트를 직접 실행하는 메인 함수
 */
export async function main() {
  console.log('전국 추가 병원 데이터 가져오기 시작...');
  
  try {
    const result = await addMoreNationwideHospitals();
    console.log('전국 추가 병원 데이터 가져오기 결과:', result);
  } catch (error) {
    console.error('전국 추가 병원 데이터 가져오기 오류:', error);
  }
}

// ESM 환경에서 직접 실행
if (typeof process !== 'undefined' && process.argv[1] === import.meta.url) {
  main().catch(console.error);
}