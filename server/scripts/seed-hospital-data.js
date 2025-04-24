/**
 * 병원 데이터 시드(초기 데이터) 스크립트
 * 
 * 이 스크립트는 실제 엑셀 파일에서 데이터를 추출하는 대신,
 * 추가적인 샘플 병원/약국 데이터를 데이터베이스에 직접 추가합니다.
 */

import { db } from '../db.js';
import { hospitals, pharmacies, hospitalDepartments } from '../../shared/schema.js';
import fs from 'fs';
import path from 'path';

/**
 * 추가적인 샘플 병원 데이터
 */
const sampleHospitals = [
  // 대구 지역 병원
  {
    hiraId: 'D1001',
    name: '경북대학교병원',
    type: '종합병원',
    category: '종합병원',
    address: '대구 중구 동덕로 130',
    zipCode: '41944',
    phone: '053-200-5114',
    latitude: 35.8664,
    longitude: 128.6057,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: true,
    specialty: ['종합병원', '심장센터', '응급의료센터'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '13:00' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.knuh.kr'
  },
  {
    hiraId: 'D1002',
    name: '계명대학교 동산병원',
    type: '종합병원',
    category: '종합병원',
    address: '대구 달서구 달구벌대로 1035',
    zipCode: '42601',
    phone: '053-258-6114',
    latitude: 35.8542,
    longitude: 128.4884,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: true,
    specialty: ['종합병원', '뇌심혈관질환센터', '응급의료센터'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.dsmc.or.kr'
  },
  {
    hiraId: 'D1003',
    name: '대구카톨릭대학교병원',
    type: '종합병원',
    category: '종합병원',
    address: '대구 남구 두류공원로 17길 33',
    zipCode: '42472',
    phone: '053-650-3000',
    latitude: 35.8505,
    longitude: 128.5764,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: false,
    specialty: ['종합병원', '응급의료센터'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.dcmc.co.kr'
  },
  {
    hiraId: 'D1004',
    name: '영남대학교병원',
    type: '종합병원',
    category: '종합병원',
    address: '대구 남구 현충로 170',
    zipCode: '42415',
    phone: '053-620-3114',
    latitude: 35.8445,
    longitude: 128.5880,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: true,
    specialty: ['종합병원', '심장병원', '응급의료센터'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '13:00' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.yumc.ac.kr'
  },
  {
    hiraId: 'D1005',
    name: '대구파티마병원',
    type: '종합병원',
    category: '종합병원',
    address: '대구 동구 아양로 99',
    zipCode: '41199',
    phone: '053-940-7114',
    latitude: 35.8794,
    longitude: 128.6324,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: false,
    specialty: ['종합병원', '응급의료센터'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.fatima.or.kr'
  },
  
  // 대전 지역 병원
  {
    hiraId: 'T1001',
    name: '충남대학교병원',
    type: '종합병원',
    category: '종합병원',
    address: '대전 중구 문화로 282',
    zipCode: '35015',
    phone: '042-280-7114',
    latitude: 36.3219,
    longitude: 127.4080,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: true,
    specialty: ['종합병원', '심장센터', '응급의료센터'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '13:00' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.cnuh.co.kr'
  },
  {
    hiraId: 'T1002',
    name: '을지대학교병원',
    type: '종합병원',
    category: '종합병원',
    address: '대전 서구 둔산서로 95',
    zipCode: '35233',
    phone: '042-611-3000',
    latitude: 36.3524,
    longitude: 127.3874,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: false,
    specialty: ['종합병원', '응급의료센터'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.emc.ac.kr'
  },
  {
    hiraId: 'T1003',
    name: '대전을지대학교병원',
    type: '종합병원',
    category: '종합병원',
    address: '대전 서구 둔산서로 95',
    zipCode: '35233',
    phone: '042-259-1000',
    latitude: 36.3524,
    longitude: 127.3874,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: false,
    specialty: ['종합병원', '응급의료센터'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.djmc.or.kr'
  },
  {
    hiraId: 'T1004',
    name: '건양대학교병원',
    type: '종합병원',
    category: '종합병원',
    address: '대전 서구 관저동로 158',
    zipCode: '35365',
    phone: '042-600-9999',
    latitude: 36.2980,
    longitude: 127.3349,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: false,
    specialty: ['종합병원', '응급의료기관'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.kyuh.ac.kr'
  },
  {
    hiraId: 'T1005',
    name: '대전선병원',
    type: '종합병원',
    category: '종합병원',
    address: '대전 중구 목중로 29',
    zipCode: '34871',
    phone: '042-220-8000',
    latitude: 36.3217,
    longitude: 127.4210,
    isEmergency: false,
    isOpen24h: false,
    isHeartCenter: false,
    specialty: ['종합병원'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.sunhospital.co.kr'
  },
  
  // 광주 지역 병원
  {
    hiraId: 'G1001',
    name: '전남대학교병원',
    type: '종합병원',
    category: '종합병원',
    address: '광주 동구 제봉로 42',
    zipCode: '61469',
    phone: '062-220-5114',
    latitude: 35.1391,
    longitude: 126.9267,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: true,
    specialty: ['종합병원', '심혈관센터', '응급의료센터'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '13:00' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.cnuh.com'
  },
  {
    hiraId: 'G1002',
    name: '조선대학교병원',
    type: '종합병원',
    category: '종합병원',
    address: '광주 동구 필문대로 365',
    zipCode: '61453',
    phone: '062-220-3114',
    latitude: 35.1393,
    longitude: 126.9307,
    isEmergency: true,
    isOpen24h: true,
    isHeartCenter: false,
    specialty: ['종합병원', '응급의료센터'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://hosp.chosun.ac.kr'
  },
  {
    hiraId: 'G1003',
    name: '광주기독병원',
    type: '종합병원',
    category: '종합병원',
    address: '광주 남구 양림로 37',
    zipCode: '61661',
    phone: '062-650-5000',
    latitude: 35.1370,
    longitude: 126.9072,
    isEmergency: true,
    isOpen24h: false,
    isHeartCenter: false,
    specialty: ['종합병원', '응급의료기관'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.kch.or.kr'
  },
  {
    hiraId: 'G1004',
    name: '광주보훈병원',
    type: '종합병원',
    category: '종합병원',
    address: '광주 광산구 첨단월봉로 99',
    zipCode: '62284',
    phone: '062-602-6114',
    latitude: 35.2147,
    longitude: 126.8390,
    isEmergency: false,
    isOpen24h: false,
    isHeartCenter: false,
    specialty: ['종합병원', '재활의학과'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://gjboohun.go.kr'
  },
  {
    hiraId: 'G1005',
    name: '광주한국병원',
    type: '종합병원',
    category: '종합병원',
    address: '광주 광산구 송정로 79',
    zipCode: '62275',
    phone: '062-958-1110',
    latitude: 35.1435,
    longitude: 126.7931,
    isEmergency: false,
    isOpen24h: false,
    isHeartCenter: false,
    specialty: ['종합병원', '정형외과'],
    openingHours: {
      monday: { open: '08:30', close: '17:30' },
      tuesday: { open: '08:30', close: '17:30' },
      wednesday: { open: '08:30', close: '17:30' },
      thursday: { open: '08:30', close: '17:30' },
      friday: { open: '08:30', close: '17:30' },
      saturday: { open: '08:30', close: '12:30' },
      sunday: null,
      holiday: null
    },
    websiteUrl: 'https://www.gjhk.co.kr'
  }
];

/**
 * 샘플 약국 데이터
 */
const samplePharmacies = [
  // 서울 지역 약국
  {
    hiraId: 'P1001',
    name: '굿모닝약국',
    address: '서울특별시 강남구 삼성로 212',
    phone: '02-555-1234',
    latitude: 37.5089,
    longitude: 127.0558,
    isOpen24h: false,
    openingHours: {
      monday: { open: '09:00', close: '19:00' },
      tuesday: { open: '09:00', close: '19:00' },
      wednesday: { open: '09:00', close: '19:00' },
      thursday: { open: '09:00', close: '19:00' },
      friday: { open: '09:00', close: '19:00' },
      saturday: { open: '09:00', close: '14:00' },
      sunday: null,
      holiday: null
    }
  },
  {
    hiraId: 'P1002',
    name: '서울약국',
    address: '서울특별시 강남구 테헤란로 152',
    phone: '02-555-5678',
    latitude: 37.5042,
    longitude: 127.0245,
    isOpen24h: true,
    openingHours: {
      monday: { open: '00:00', close: '24:00' },
      tuesday: { open: '00:00', close: '24:00' },
      wednesday: { open: '00:00', close: '24:00' },
      thursday: { open: '00:00', close: '24:00' },
      friday: { open: '00:00', close: '24:00' },
      saturday: { open: '00:00', close: '24:00' },
      sunday: { open: '00:00', close: '24:00' },
      holiday: { open: '00:00', close: '24:00' }
    }
  },
  {
    hiraId: 'P1003',
    name: '건강약국',
    address: '서울특별시 마포구 와우산로 94',
    phone: '02-123-4567',
    latitude: 37.5499,
    longitude: 126.9256,
    isOpen24h: false,
    openingHours: {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '09:00', close: '18:00' },
      sunday: { open: '10:00', close: '17:00' },
      holiday: null
    }
  },
  {
    hiraId: 'P1004',
    name: '종로약국',
    address: '서울특별시 종로구 종로 65',
    phone: '02-765-4321',
    latitude: 37.5703,
    longitude: 126.9832,
    isOpen24h: false,
    openingHours: {
      monday: { open: '08:30', close: '19:30' },
      tuesday: { open: '08:30', close: '19:30' },
      wednesday: { open: '08:30', close: '19:30' },
      thursday: { open: '08:30', close: '19:30' },
      friday: { open: '08:30', close: '19:30' },
      saturday: { open: '09:00', close: '15:00' },
      sunday: null,
      holiday: null
    }
  },
  {
    hiraId: 'P1005',
    name: '연중무휴약국',
    address: '서울특별시 중구 명동길 14',
    phone: '02-777-7777',
    latitude: 37.5634,
    longitude: 126.9850,
    isOpen24h: true,
    openingHours: {
      monday: { open: '00:00', close: '24:00' },
      tuesday: { open: '00:00', close: '24:00' },
      wednesday: { open: '00:00', close: '24:00' },
      thursday: { open: '00:00', close: '24:00' },
      friday: { open: '00:00', close: '24:00' },
      saturday: { open: '00:00', close: '24:00' },
      sunday: { open: '00:00', close: '24:00' },
      holiday: { open: '00:00', close: '24:00' }
    }
  },
  
  // 부산 지역 약국
  {
    hiraId: 'P2001',
    name: '부산약국',
    address: '부산광역시 부산진구 중앙대로 785',
    phone: '051-802-1234',
    latitude: 35.1562,
    longitude: 129.0597,
    isOpen24h: false,
    openingHours: {
      monday: { open: '09:00', close: '19:00' },
      tuesday: { open: '09:00', close: '19:00' },
      wednesday: { open: '09:00', close: '19:00' },
      thursday: { open: '09:00', close: '19:00' },
      friday: { open: '09:00', close: '19:00' },
      saturday: { open: '09:00', close: '14:00' },
      sunday: null,
      holiday: null
    }
  },
  {
    hiraId: 'P2002',
    name: '광안리약국',
    address: '부산광역시 수영구 광안해변로 219',
    phone: '051-752-5678',
    latitude: 35.1539,
    longitude: 129.1189,
    isOpen24h: true,
    openingHours: {
      monday: { open: '00:00', close: '24:00' },
      tuesday: { open: '00:00', close: '24:00' },
      wednesday: { open: '00:00', close: '24:00' },
      thursday: { open: '00:00', close: '24:00' },
      friday: { open: '00:00', close: '24:00' },
      saturday: { open: '00:00', close: '24:00' },
      sunday: { open: '00:00', close: '24:00' },
      holiday: { open: '00:00', close: '24:00' }
    }
  },
  {
    hiraId: 'P2003',
    name: '해운대약국',
    address: '부산광역시 해운대구 해운대해변로 264',
    phone: '051-744-3456',
    latitude: 35.1587,
    longitude: 129.1602,
    isOpen24h: false,
    openingHours: {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '09:00', close: '18:00' },
      sunday: { open: '10:00', close: '17:00' },
      holiday: null
    }
  },
  {
    hiraId: 'P2004',
    name: '센텀약국',
    address: '부산광역시 해운대구 센텀남대로 35',
    phone: '051-744-7890',
    latitude: 35.1708,
    longitude: 129.1317,
    isOpen24h: false,
    openingHours: {
      monday: { open: '08:30', close: '19:30' },
      tuesday: { open: '08:30', close: '19:30' },
      wednesday: { open: '08:30', close: '19:30' },
      thursday: { open: '08:30', close: '19:30' },
      friday: { open: '08:30', close: '19:30' },
      saturday: { open: '09:00', close: '15:00' },
      sunday: null,
      holiday: null
    }
  },
  {
    hiraId: 'P2005',
    name: '서면메디컬약국',
    address: '부산광역시 부산진구 서면로 68',
    phone: '051-803-9876',
    latitude: 35.1568,
    longitude: 129.0593,
    isOpen24h: true,
    openingHours: {
      monday: { open: '00:00', close: '24:00' },
      tuesday: { open: '00:00', close: '24:00' },
      wednesday: { open: '00:00', close: '24:00' },
      thursday: { open: '00:00', close: '24:00' },
      friday: { open: '00:00', close: '24:00' },
      saturday: { open: '00:00', close: '24:00' },
      sunday: { open: '00:00', close: '24:00' },
      holiday: { open: '00:00', close: '24:00' }
    }
  }
];

/**
 * 심장 전문 병원 진료과목 데이터
 */
const cardiacDepartments = [
  {
    code: 'IM-CARD',
    name: '심장내과'
  },
  {
    code: 'CS',
    name: '흉부외과'
  },
  {
    code: 'CS-CARD',
    name: '심장혈관외과'
  },
  {
    code: 'IM-CV',
    name: '순환기내과'
  },
  {
    code: 'ANES-CARD',
    name: '심장마취통증의학과'
  },
  {
    code: 'IM-EP',
    name: '부정맥클리닉'
  },
  {
    code: 'IM-IC',
    name: '중환자의학과'
  },
  {
    code: 'RAD-CARD',
    name: '심혈관영상의학과'
  }
];

/**
 * 데이터베이스에 병원 데이터 추가
 */
async function seedHospitalData() {
  try {
    console.log('샘플 병원 데이터 추가 중...');
    
    // 병원 데이터 추가
    for (const hospital of sampleHospitals) {
      try {
        const existingHospital = await db.select()
          .from(hospitals)
          .where({ hiraId: hospital.hiraId })
          .limit(1);
        
        if (existingHospital.length > 0) {
          // 기존 병원 업데이트
          await db.update(hospitals)
            .set({ ...hospital, updatedAt: new Date() })
            .where({ hiraId: hospital.hiraId });
          
          console.log(`병원 업데이트: ${hospital.name}`);
        } else {
          // 새 병원 추가
          await db.insert(hospitals).values({
            ...hospital,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log(`병원 추가: ${hospital.name}`);
        }
        
        // 심장 전문 병원인 경우 관련 진료과목 추가
        if (hospital.isHeartCenter) {
          // 먼저 병원 ID 가져오기
          const [dbHospital] = await db.select()
            .from(hospitals)
            .where({ hiraId: hospital.hiraId })
            .limit(1);
          
          if (dbHospital) {
            // 심장 관련 진료과목 추가
            for (const dept of cardiacDepartments) {
              try {
                const existingDept = await db.select()
                  .from(hospitalDepartments)
                  .where({ 
                    hospitalId: dbHospital.id,
                    code: dept.code
                  })
                  .limit(1);
                
                if (existingDept.length === 0) {
                  await db.insert(hospitalDepartments).values({
                    hospitalId: dbHospital.id,
                    code: dept.code,
                    name: dept.name,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  });
                  
                  console.log(`진료과목 추가: ${hospital.name} - ${dept.name}`);
                }
              } catch (err) {
                console.error(`진료과목 추가 오류 (${hospital.name} - ${dept.name}):`, err);
              }
            }
          }
        }
      } catch (err) {
        console.error(`병원 데이터 추가 오류 (${hospital.name}):`, err);
      }
    }
    
    // 약국 데이터 추가
    console.log('샘플 약국 데이터 추가 중...');
    for (const pharmacy of samplePharmacies) {
      try {
        const existingPharmacy = await db.select()
          .from(pharmacies)
          .where({ hiraId: pharmacy.hiraId })
          .limit(1);
        
        if (existingPharmacy.length > 0) {
          // 기존 약국 업데이트
          await db.update(pharmacies)
            .set({ ...pharmacy, updatedAt: new Date() })
            .where({ hiraId: pharmacy.hiraId });
          
          console.log(`약국 업데이트: ${pharmacy.name}`);
        } else {
          // 새 약국 추가
          await db.insert(pharmacies).values({
            ...pharmacy,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log(`약국 추가: ${pharmacy.name}`);
        }
      } catch (err) {
        console.error(`약국 데이터 추가 오류 (${pharmacy.name}):`, err);
      }
    }
    
    console.log('데이터 시드 작업 완료!');
  } catch (error) {
    console.error('데이터 시드 오류:', error);
    throw error;
  }
}

// 시드 스크립트 실행
seedHospitalData()
  .then(() => {
    console.log('병원 및 약국 데이터 시드 작업이 성공적으로 완료되었습니다.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('시드 작업 실행 중 오류 발생:', error);
    process.exit(1);
  });