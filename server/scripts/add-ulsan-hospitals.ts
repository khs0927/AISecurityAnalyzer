import { db } from '../db';
import { hospitals, hospitalDepartments } from '@shared/schema';

/**
 * 울산 지역 병원 데이터 추가 스크립트
 * API에서 울산 지역 병원이 표시되지 않는 문제 해결
 */
export async function addUlsanHospitals() {
  try {
    console.log('울산 지역 병원 데이터 추가 시작...');
    
    // 울산 주요 병원 데이터
    const ulsanHospitals = [
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
      {
        name: '울산시티병원',
        address: '울산광역시 남구 삼산로 200',
        phone: '052-280-9000',
        latitude: 35.5388,
        longitude: 129.3369,
        isEmergency: false,
        isOpen24h: false,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '재활의학과'],
        hiraId: 'ULSAN006'
      },
      {
        name: '서울산보람병원',
        address: '울산광역시 울주군 온산읍 덕신로 175',
        phone: '052-231-8200',
        latitude: 35.4343,
        longitude: 129.3428,
        isEmergency: false,
        isOpen24h: false,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과'],
        hiraId: 'ULSAN007'
      },
      {
        name: '21세기울산병원',
        address: '울산광역시 중구 중앙길 104',
        phone: '052-290-2100',
        latitude: 35.5688,
        longitude: 129.3268,
        isEmergency: false,
        isOpen24h: false,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과', '신경외과'],
        hiraId: 'ULSAN008'
      },
      {
        name: '중앙병원',
        address: '울산광역시 남구 문수로 480',
        phone: '052-226-1100',
        latitude: 35.5271,
        longitude: 129.2964,
        isEmergency: false,
        isOpen24h: false,
        isHeartCenter: false,
        specialty: ['내과', '외과', '정형외과'],
        hiraId: 'ULSAN009'
      },
      {
        name: '울산산재병원',
        address: '울산광역시 남구 두왕로 419',
        phone: '052-230-1400',
        latitude: 35.5141,
        longitude: 129.3361,
        isEmergency: false,
        isOpen24h: true,
        isHeartCenter: false,
        specialty: ['내과', '정형외과', '재활의학과', '직업환경의학과'],
        hiraId: 'ULSAN010'
      }
    ];
    
    // 병원 데이터 추가
    for (const hospital of ulsanHospitals) {
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
        }
      } else {
        console.log(`이미 존재하는 병원: ${hospital.name}`);
      }
    }
    
    console.log('울산 지역 병원 데이터 추가 완료!');
    return { success: true, message: '울산 지역 병원 데이터가 성공적으로 추가되었습니다.' };
  } catch (error) {
    console.error('울산 지역 병원 데이터 추가 오류:', error);
    return { success: false, message: '울산 지역 병원 데이터 추가 중 오류가 발생했습니다.', error: error.message };
  }
}