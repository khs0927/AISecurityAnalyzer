import { db } from '../db';
import { hospitals, hospitalDepartments } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * 전국 지역 병원 데이터 추가 스크립트
 * 지역별로 주요 병원 데이터 추가
 */
export async function addNationwideHospitals() {
  try {
    console.log('전국 지역 병원 데이터 추가 시작...');
    
    // 전국 주요 병원 데이터 (울산, 대구, 인천, 광주, 대전, 세종, 제주 등)
    const nationwideHospitals = [
      // 울산 지역 병원
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
      {
        name: '울산동강병원',
        address: '울산광역시 중구 태화로 239',
        phone: '052-241-1114',
        latitude: 35.5575,
        longitude: 129.3301,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'ULSAN002'
      },
      {
        name: '울산근로복지공단병원',
        address: '울산광역시 남구 두왕로 351',
        phone: '052-226-2800',
        latitude: 35.5138,
        longitude: 129.3261,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '산부인과', '응급의학과'],
        hiraId: 'ULSAN003'
      },
      {
        name: '좋은삼정병원',
        address: '울산광역시 남구 북부순환도로 51',
        phone: '052-220-7500',
        latitude: 35.5442,
        longitude: 129.3300,
        isEmergency: false,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '산부인과'],
        hiraId: 'ULSAN004'
      },
      {
        name: '울산세종병원',
        address: '울산광역시 남구 남산로 354',
        phone: '052-272-8053',
        latitude: 35.5356,
        longitude: 129.3216,
        isEmergency: false,
        isOpen24h: false,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과'],
        hiraId: 'ULSAN005'
      },
      
      // 대구 지역 병원
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
      {
        name: '계명대학교 동산병원',
        address: '대구광역시 달서구 달구벌대로 1035',
        phone: '053-258-7114',
        latitude: 35.8542,
        longitude: 128.4884,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '응급의학과'],
        hiraId: 'DAEGU002'
      },
      {
        name: '대구가톨릭대학교병원',
        address: '대구광역시 남구 두류공원로17길 33',
        phone: '053-650-3000',
        latitude: 35.8505,
        longitude: 128.5764,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'DAEGU003'
      },
      
      // 인천 지역 병원
      {
        name: '인하대학교병원',
        address: '인천광역시 중구 인항로 27',
        phone: '032-890-2114',
        latitude: 37.4568,
        longitude: 126.6315,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'INCHEON001'
      },
      {
        name: '가천대 길병원',
        address: '인천광역시 남동구 남동대로774번길 21',
        phone: '032-460-3000',
        latitude: 37.4485,
        longitude: 126.7037,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '응급의학과'],
        hiraId: 'INCHEON002'
      },
      {
        name: '인천성모병원',
        address: '인천광역시 부평구 동수로 56',
        phone: '032-280-6000',
        latitude: 37.4848,
        longitude: 126.7255,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'INCHEON003'
      },
      
      // 광주 지역 병원
      {
        name: '전남대학교병원',
        address: '광주광역시 동구 제봉로 42',
        phone: '062-220-5114',
        latitude: 35.1391,
        longitude: 126.9267,
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
        latitude: 35.1393,
        longitude: 126.9307,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GWANGJU002'
      },
      
      // 대전 지역 병원
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
        name: '을지대학교병원',
        address: '대전광역시 서구 둔산서로 95',
        phone: '042-611-3000',
        latitude: 36.3524,
        longitude: 127.3874,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'DAEJEON002'
      },
      
      // 제주 지역 병원
      {
        name: '제주대학교병원',
        address: '제주특별자치도 제주시 아란13길 15',
        phone: '064-717-1114',
        latitude: 33.4674,
        longitude: 126.5310,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEJU001'
      },
      {
        name: '한라병원',
        address: '제주특별자치도 제주시 도령로 65',
        phone: '064-740-5000',
        latitude: 33.4949,
        longitude: 126.5342,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEJU002'
      },
      
      // 경기도 지역 병원
      {
        name: '분당서울대학교병원',
        address: '경기도 성남시 분당구 구미로173번길 82',
        phone: '031-787-2114',
        latitude: 37.3517,
        longitude: 127.1232,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GYEONGGI001'
      },
      {
        name: '아주대학교병원',
        address: '경기도 수원시 영통구 월드컵로 164',
        phone: '031-219-5114',
        latitude: 37.2799,
        longitude: 127.0432,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: true,
        specialty: ['내과', '외과', '정형외과', '신경외과', '심장내과', '심장외과', '응급의학과'],
        hiraId: 'GYEONGGI002'
      },
      {
        name: '고려대학교 안산병원',
        address: '경기도 안산시 단원구 적금로 123',
        phone: '031-412-5114',
        latitude: 37.3184,
        longitude: 126.8338,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGGI003'
      },
      
      // 강원도 지역 병원
      {
        name: '강릉아산병원',
        address: '강원특별자치도 강릉시 사천면 방동길 38',
        phone: '033-610-4111',
        latitude: 37.8029,
        longitude: 128.8553,
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
        latitude: 37.3445,
        longitude: 127.9488,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GANGWON002'
      },
      
      // 충북 지역 병원
      {
        name: '충북대학교병원',
        address: '충청북도 청주시 서원구 1순환로 776',
        phone: '043-269-6114',
        latitude: 36.6236,
        longitude: 127.4935,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'CHUNGBUK001'
      },
      
      // 충남 지역 병원
      {
        name: '단국대학교병원',
        address: '충청남도 천안시 동남구 망향로 201',
        phone: '041-550-6780',
        latitude: 36.8163,
        longitude: 127.1469,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'CHUNGNAM001'
      },
      {
        name: '순천향대학교 천안병원',
        address: '충청남도 천안시 동남구 순천향6길 31',
        phone: '041-570-2114',
        latitude: 36.8177,
        longitude: 127.1571,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'CHUNGNAM002'
      },
      
      // 전북 지역 병원
      {
        name: '전북대학교병원',
        address: '전라북도 전주시 덕진구 건지로 20',
        phone: '063-250-1114',
        latitude: 35.8466,
        longitude: 127.1422,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEONBUK001'
      },
      {
        name: '원광대학교병원',
        address: '전라북도 익산시 무왕로 895',
        phone: '063-859-1114',
        latitude: 35.9586,
        longitude: 126.9858,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEONBUK002'
      },
      
      // 전남 지역 병원
      {
        name: '화순전남대학교병원',
        address: '전라남도 화순군 화순읍 서양로 322',
        phone: '061-379-7114',
        latitude: 35.0544,
        longitude: 126.9845,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEONNAM001'
      },
      {
        name: '목포한국병원',
        address: '전라남도 목포시 영산로 483',
        phone: '061-270-5533',
        latitude: 34.8162,
        longitude: 126.4214,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'JEONNAM002'
      },
      
      // 경북 지역 병원
      {
        name: '영남대학교병원',
        address: '경상북도 대구시 남구 현충로 170',
        phone: '053-620-3000',
        latitude: 35.8445,
        longitude: 128.5880,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGBUK001'
      },
      {
        name: '안동병원',
        address: '경상북도 안동시 앙실로 11',
        phone: '054-840-0114',
        latitude: 36.5689,
        longitude: 128.7305,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGBUK002'
      },
      
      // 경남 지역 병원
      {
        name: '경상국립대학교병원',
        address: '경상남도 진주시 강남로 79',
        phone: '055-750-8000',
        latitude: 35.1801,
        longitude: 128.0941,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGNAM001'
      },
      {
        name: '창원경상국립대학교병원',
        address: '경상남도 창원시 성산구 삼정자로 11',
        phone: '055-214-1000',
        latitude: 35.2224,
        longitude: 128.6812,
        isEmergency: true,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과', '응급의학과'],
        hiraId: 'GYEONGNAM002'
      }
    ];
    
    // 병원 데이터 추가
    let addedCount = 0;
    let existingCount = 0;
    
    for (const hospital of nationwideHospitals) {
      const existingHospital = await db.select()
        .from(hospitals)
        .where(eq(hospitals.name, hospital.name))
        .limit(1);
      
      if (existingHospital.length === 0) {
        console.log(`병원 추가: ${hospital.name}`);
        
        // 병원 데이터 삽입
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
        console.log(`이미 존재하는 병원: ${hospital.name}`);
        existingCount++;
      }
    }
    
    console.log(`전국 지역 병원 데이터 추가 완료! 추가됨: ${addedCount}, 이미 존재함: ${existingCount}`);
    return { 
      success: true, 
      message: `전국 지역 병원 데이터가 성공적으로 추가되었습니다. (추가: ${addedCount}, 중복: ${existingCount})`,
      added: addedCount,
      existing: existingCount
    };
    
  } catch (error: any) {
    console.error('전국 지역 병원 데이터 추가 오류:', error);
    return { 
      success: false, 
      message: '전국 지역 병원 데이터 추가 중 오류가 발생했습니다.', 
      error: error.message 
    };
  }
}