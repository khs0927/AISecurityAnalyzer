import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { hospitals, hospitalDepartments, pharmacies } from '@shared/schema';
import csvParser from 'csv-parser';

/**
 * 엑셀 데이터 CSV 변환 및 가져오기 스크립트
 * 
 * 참고: 원래는 xlsx 패키지를 사용하여 직접 엑셀 파일을 처리하는 것이 좋지만,
 * 패키지 설치에 제약이 있어 CSV로 변환된 데이터를 가정하고 스크립트 작성
 */

/**
 * 병원 정보 CSV 파일 파싱 및 데이터베이스 저장
 */
async function importHospitalData(csvFilePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          console.log(`${results.length}개 병원 데이터 처리 중...`);
          
          for (const item of results) {
            // CSV 데이터를 우리 스키마에 맞게 변환
            const hospitalRecord = {
              hiraId: item.hpid || `CSV-${item.no || Math.random().toString(36).substring(2, 10)}`,
              name: item.dutyName || item.yadmNm || '',
              type: item.dutyDivNam || item.clCdNm || '',
              category: item.dgsbjtCdNm || item.clCdNm || '',
              address: item.dutyAddr || item.addr || '',
              zipCode: item.postCdn1 || item.postNo || '',
              phone: item.dutyTel1 || item.telno || '',
              latitude: parseFloat(item.wgs84Lat || item.YPos || '0'),
              longitude: parseFloat(item.wgs84Lon || item.XPos || '0'),
              isEmergency: item.dutyEmcls === '1' || item.estbDd?.includes('응급') || false,
              isOpen24h: item.duty24 === '1' || false,
              // 심장 전문 센터 여부는 진료과목으로 유추
              isHeartCenter: (item.dgsbjtCdNm || '').includes('순환기') || 
                             (item.dgsbjtCdNm || '').includes('심장') || 
                             (item.clCdNm || '').includes('심장') || false,
              specialty: item.dgsbjtCdNm ? [item.dgsbjtCdNm] : [],
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
          resolve();
        } catch (error) {
          console.error('병원 데이터 삽입 오류:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('CSV 파싱 오류:', error);
        reject(error);
      });
  });
}

/**
 * 약국 정보 CSV 파일 파싱 및 데이터베이스 저장
 */
async function importPharmacyData(csvFilePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          console.log(`${results.length}개 약국 데이터 처리 중...`);
          
          for (const item of results) {
            // CSV 데이터를 우리 스키마에 맞게 변환
            const pharmacyRecord = {
              hiraId: item.hpid || `PHARM-${item.no || Math.random().toString(36).substring(2, 10)}`,
              name: item.dutyName || '',
              address: item.dutyAddr || '',
              phone: item.dutyTel1 || '',
              latitude: parseFloat(item.wgs84Lat || '0'),
              longitude: parseFloat(item.wgs84Lon || '0'),
              isOpen24h: item.duty24 === '1' || false,
              openingHours: {
                monday: item.dutyTime1s && item.dutyTime1c ? 
                  { open: item.dutyTime1s, close: item.dutyTime1c } : null,
                tuesday: item.dutyTime2s && item.dutyTime2c ? 
                  { open: item.dutyTime2s, close: item.dutyTime2c } : null,
                wednesday: item.dutyTime3s && item.dutyTime3c ? 
                  { open: item.dutyTime3s, close: item.dutyTime3c } : null,
                thursday: item.dutyTime4s && item.dutyTime4c ? 
                  { open: item.dutyTime4s, close: item.dutyTime4c } : null,
                friday: item.dutyTime5s && item.dutyTime5c ? 
                  { open: item.dutyTime5s, close: item.dutyTime5c } : null,
                saturday: item.dutyTime6s && item.dutyTime6c ? 
                  { open: item.dutyTime6s, close: item.dutyTime6c } : null,
                sunday: item.dutyTime7s && item.dutyTime7c ? 
                  { open: item.dutyTime7s, close: item.dutyTime7c } : null,
                holiday: item.dutyTime8s && item.dutyTime8c ? 
                  { open: item.dutyTime8s, close: item.dutyTime8c } : null,
              },
            };
            
            // 이미 존재하는지 확인 (hiraId로)
            const existingPharmacy = await db.select()
              .from(pharmacies)
              .where({ hiraId: pharmacyRecord.hiraId })
              .limit(1);
            
            if (existingPharmacy.length > 0) {
              // 기존 약국 데이터 업데이트
              await db.update(pharmacies)
                .set({ ...pharmacyRecord, updatedAt: new Date() })
                .where({ hiraId: pharmacyRecord.hiraId });
              
              console.log(`약국 업데이트: ${pharmacyRecord.name}`);
            } else {
              // 새 약국 추가
              await db.insert(pharmacies).values(pharmacyRecord);
              console.log(`약국 추가됨: ${pharmacyRecord.name}`);
            }
          }
          
          console.log('약국 데이터 처리 완료!');
          resolve();
        } catch (error) {
          console.error('약국 데이터 삽입 오류:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('CSV 파싱 오류:', error);
        reject(error);
      });
  });
}

/**
 * 병원 진료과목 정보 CSV 파일 파싱 및 데이터베이스 저장
 */
async function importHospitalDepartmentData(csvFilePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          console.log(`${results.length}개 병원 진료과목 데이터 처리 중...`);
          
          for (const item of results) {
            // 병원 ID 확인
            const hospitalHiraId = item.hpid;
            
            if (!hospitalHiraId) {
              console.warn('병원 ID가 없는 항목 건너뜀');
              continue;
            }
            
            // 관련 병원 찾기
            const existingHospital = await db.select()
              .from(hospitals)
              .where({ hiraId: hospitalHiraId })
              .limit(1);
            
            if (existingHospital.length === 0) {
              console.warn(`병원 ID ${hospitalHiraId}에 해당하는 병원을 찾을 수 없음`);
              continue;
            }
            
            const hospital = existingHospital[0];
            
            // 진료과목 정보 추출
            const departmentRecord = {
              hospitalId: hospital.id,
              name: item.dgsbjtCdNm || '',
              code: item.dgsbjtCd || '',
            };
            
            // 이미 존재하는지 확인
            const existingDepartment = await db.select()
              .from(hospitalDepartments)
              .where({ 
                hospitalId: departmentRecord.hospitalId,
                code: departmentRecord.code 
              })
              .limit(1);
            
            if (existingDepartment.length > 0) {
              // 기존 진료과목 데이터 업데이트
              await db.update(hospitalDepartments)
                .set({ ...departmentRecord, updatedAt: new Date() })
                .where({ 
                  hospitalId: departmentRecord.hospitalId,
                  code: departmentRecord.code 
                });
              
              console.log(`진료과목 업데이트: ${hospital.name} - ${departmentRecord.name}`);
            } else {
              // 새 진료과목 추가
              await db.insert(hospitalDepartments).values(departmentRecord);
              console.log(`진료과목 추가됨: ${hospital.name} - ${departmentRecord.name}`);
            }
            
            // 병원의 specialty 필드 업데이트 (진료과목 배열에 추가)
            let specialtyArray = hospital.specialty || [];
            if (!specialtyArray.includes(departmentRecord.name)) {
              specialtyArray.push(departmentRecord.name);
              
              await db.update(hospitals)
                .set({ 
                  specialty: specialtyArray,
                  updatedAt: new Date() 
                })
                .where({ id: hospital.id });
              
              console.log(`병원 진료과목 목록 업데이트: ${hospital.name}`);
            }
          }
          
          console.log('병원 진료과목 데이터 처리 완료!');
          resolve();
        } catch (error) {
          console.error('병원 진료과목 데이터 삽입 오류:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('CSV 파싱 오류:', error);
        reject(error);
      });
  });
}

/**
 * 모든 데이터 파일 가져오기 실행 함수
 */
async function importAllData(): Promise<void> {
  try {
    // 데이터 파일 경로 (CSV로 변환된 파일 가정)
    const dataDir = path.join(process.cwd(), 'data');
    
    // 데이터 디렉토리 존재 확인 및 생성
    if (!fs.existsSync(dataDir)) {
      console.log('데이터 디렉토리 생성...');
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 병원 정보 가져오기
    const hospitalCsvPath = path.join(dataDir, 'hospital_data.csv');
    if (fs.existsSync(hospitalCsvPath)) {
      console.log('병원 정보 가져오기...');
      await importHospitalData(hospitalCsvPath);
    } else {
      console.log('병원 정보 CSV 파일이 없습니다.');
    }
    
    // 약국 정보 가져오기
    const pharmacyCsvPath = path.join(dataDir, 'pharmacy_data.csv');
    if (fs.existsSync(pharmacyCsvPath)) {
      console.log('약국 정보 가져오기...');
      await importPharmacyData(pharmacyCsvPath);
    } else {
      console.log('약국 정보 CSV 파일이 없습니다.');
    }
    
    // 병원 진료과목 정보 가져오기
    const departmentCsvPath = path.join(dataDir, 'hospital_department_data.csv');
    if (fs.existsSync(departmentCsvPath)) {
      console.log('병원 진료과목 정보 가져오기...');
      await importHospitalDepartmentData(departmentCsvPath);
    } else {
      console.log('병원 진료과목 정보 CSV 파일이 없습니다.');
    }
    
    console.log('모든 데이터 가져오기 완료!');
  } catch (error) {
    console.error('데이터 가져오기 오류:', error);
    throw error;
  }
}

// 스크립트 직접 실행 시 사용
if (require.main === module) {
  importAllData()
    .then(() => {
      console.log('데이터 가져오기 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('오류 발생:', error);
      process.exit(1);
    });
}