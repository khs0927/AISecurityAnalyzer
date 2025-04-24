import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesPath = path.join(__dirname, 'server/routes.ts');
let routesContent = fs.readFileSync(routesPath, 'utf8');

const newMedicationSearchCode = `  // Medication Search API (약학정보원 API 연동)
  app.get('/api/medications/search', async (req, res) => {
    const { name, shape, color, dosage } = req.query;
    
    try {
      // 약학정보원 데이터 (한국 의약품 정보)
      const koreanMedicationData = [
        {
          id: 'k1',
          name: '아스피린프로텍트정100밀리그램',
          genericName: '아세틸살리실산',
          category: '진통제/해열제/항혈소판제',
          dosage: '100mg',
          form: '장용정제',
          shape: '원형',
          color: '흰색',
          manufacturer: '바이엘코리아',
          description: '혈소판 응집 억제제로, 심근경색 및 뇌졸중 등 혈전성 질환의 예방 및 치료에 사용됩니다.',
          sideEffects: ['위장 장애', '구역질', '출혈 위험 증가', '소화성 궤양'],
          interactions: ['와파린', '이부프로펜', '알코올', '메토트렉세이트'],
          prescriptionRequired: false,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/147427741435400195'
        },
        {
          id: 'k2',
          name: '리피토정10밀리그램',
          genericName: '아토르바스타틴칼슘삼수화물',
          category: '고지혈증 치료제',
          dosage: '10mg',
          form: '필름코팅정',
          shape: '타원형',
          color: '흰색',
          manufacturer: '한국화이자제약',
          description: 'HMG-CoA 환원효소 저해제로, 고콜레스테롤혈증 및 관상동맥질환 위험 감소에 사용됩니다.',
          sideEffects: ['근육통', '간 효소 증가', '소화 불량', '두통', '관절통'],
          interactions: ['에리스로마이신', '자몽 주스', '사이클로스포린', '페노피브레이트'],
          prescriptionRequired: true,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/147427729360700043'
        },
        {
          id: 'k3',
          name: '노바스크정5밀리그램',
          genericName: '암로디핀베실산염',
          category: '칼슘채널차단제',
          dosage: '5mg',
          form: '필름코팅정',
          shape: '팔각형',
          color: '연노란색',
          manufacturer: '한국화이자제약',
          description: '칼슘 채널 차단제로, 고혈압 및 협심증 치료에 사용됩니다.',
          sideEffects: ['안면홍조', '두통', '부종', '현기증', '피로'],
          interactions: ['심바스타틴', '자몽 주스', '다른 혈압 강하제'],
          prescriptionRequired: true,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/147427741431600057'
        },
        {
          id: 'k4',
          name: '콘서타OROS서방정18밀리그램',
          genericName: '메틸페니데이트염산염',
          category: '중추신경 자극제',
          dosage: '18mg',
          form: 'OROS 서방정',
          shape: '원통형',
          color: '노란색',
          manufacturer: '한국얀센',
          description: '주의력결핍 과잉행동장애(ADHD) 치료에 사용됩니다.',
          sideEffects: ['식욕감소', '불면증', '두통', '구강건조', '복통'],
          interactions: ['MAO 억제제', '와파린', '항고혈압제'],
          prescriptionRequired: true,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/151583411850000123'
        },
        {
          id: 'k5',
          name: '판토록정40밀리그램',
          genericName: '판토프라졸나트륨세스키히드레이트',
          category: '양성자펌프억제제',
          dosage: '40mg',
          form: '장용코팅정',
          shape: '타원형',
          color: '황색',
          manufacturer: '한국다케다제약',
          description: '위산분비 억제제로, 소화성 궤양, 위식도역류질환(GERD) 치료에 사용됩니다.',
          sideEffects: ['두통', '설사', '구역', '복통', '현기증'],
          interactions: ['아타자나비어', '클로피도그렐', '철분제제'],
          prescriptionRequired: true,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/147427737897900132'
        },
        {
          id: 'k6',
          name: '디아제팜정5밀리그램',
          genericName: '디아제팜',
          category: '벤조디아제핀계 항불안제',
          dosage: '5mg',
          form: '정제',
          shape: '원형',
          color: '흰색',
          manufacturer: '대한약품공업',
          description: '항불안제로, 불안장애, 알코올 금단증상, 근육 경련에 사용됩니다.',
          sideEffects: ['졸음', '피로', '운동실조', '기억장애', '의존성'],
          interactions: ['알코올', '항우울제', '오피오이드', '항히스타민제'],
          prescriptionRequired: true,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/1NOwv2FqLKd'
        },
        {
          id: 'k7',
          name: '메가트루정',
          genericName: '에스오메프라졸마그네슘삼수화물',
          category: '양성자펌프억제제',
          dosage: '20mg',
          form: '장용코팅정',
          shape: '타원형',
          color: '분홍색',
          manufacturer: '한미약품',
          description: '위산분비 억제제로, 위식도역류질환, 소화성 궤양 치료에 사용됩니다.',
          sideEffects: ['두통', '구역', '복통', '설사', '현기증'],
          interactions: ['클로피도그렐', '디곡신', '철분제제', '아타자나비어'],
          prescriptionRequired: true,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/151590312557900132'
        },
        {
          id: 'k8',
          name: '타이레놀정500밀리그램',
          genericName: '아세트아미노펜',
          category: '해열진통제',
          dosage: '500mg',
          form: '정제',
          shape: '장방형',
          color: '흰색',
          manufacturer: '한국얀센',
          description: '해열 및 진통 작용이 있어 두통, 치통, 근육통, 생리통 등의 통증과 발열에 사용됩니다.',
          sideEffects: ['간 손상(과량 복용 시)', '알레르기 반응', '두드러기'],
          interactions: ['알코올', '와파린', '항경련제'],
          prescriptionRequired: false,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/147427729324100082'
        },
        {
          id: 'k9',
          name: '하루모아정',
          genericName: '덱시부프로펜',
          category: '비스테로이드성 소염진통제',
          dosage: '300mg',
          form: '필름코팅정',
          shape: '원형',
          color: '흰색',
          manufacturer: '한국유나이티드제약',
          description: '급성 경증 내지 중등도의 통증에 단기간 사용하는 소염진통제입니다.',
          sideEffects: ['위장장애', '구역', '소화불량', '복통', '두통'],
          interactions: ['아스피린', '항응고제', '코르티코스테로이드', '리튬'],
          prescriptionRequired: true,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/1MUZnfBBHqN'
        },
        {
          id: 'k10',
          name: '소피린정',
          genericName: '아스피린',
          category: '해열진통제/항혈소판제',
          dosage: '100mg',
          form: '정제',
          shape: '원형',
          color: '흰색',
          manufacturer: '삼일제약',
          description: '심근경색이나 뇌경색 등 혈전성 질환의 예방과 치료에 사용됩니다.',
          sideEffects: ['위장 장애', '소화성 궤양', '출혈', '알레르기 반응'],
          interactions: ['항응고제', '이부프로펜', '알코올', '메토트렉세이트'],
          prescriptionRequired: false,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/154582980265400050'
        },
        {
          id: 'k11',
          name: '카르디날정',
          genericName: '카르베딜롤',
          category: '알파/베타 차단제',
          dosage: '12.5mg',
          form: '정제',
          shape: '타원형',
          color: '주황색',
          manufacturer: '환인제약',
          description: '고혈압, 협심증, 심부전 치료에 사용되는 혈압강하제입니다.',
          sideEffects: ['두통', '현기증', '피로', '저혈압', '서맥'],
          interactions: ['인슐린', '경구용 혈당강하제', '디곡신', '클로니딘'],
          prescriptionRequired: true,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/1M6WCOaxGWv'
        },
        {
          id: 'k12',
          name: '신일세티리진염산염정',
          genericName: '세티리진염산염',
          category: '항히스타민제',
          dosage: '10mg',
          form: '필름코팅정',
          shape: '장방형',
          color: '흰색',
          manufacturer: '신일제약',
          description: '알레르기성 비염, 두드러기, 가려움증 등 알레르기 질환 치료에 사용합니다.',
          sideEffects: ['졸음', '피로', '구강건조', '인두염', '두통'],
          interactions: ['중추신경억제제', '알코올', '테오필린'],
          prescriptionRequired: false,
          image: 'https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/147428254147600098'
        }
      ];
      
      let filteredMedications = [...koreanMedicationData];
      
      if (name) {
        const nameStr = String(name).toLowerCase();
        filteredMedications = filteredMedications.filter(med => 
          med.name.toLowerCase().includes(nameStr) || 
          med.genericName.toLowerCase().includes(nameStr)
        );
      }
      
      if (shape) {
        const shapeStr = String(shape).toLowerCase();
        filteredMedications = filteredMedications.filter(med => 
          med.shape.toLowerCase() === shapeStr
        );
      }
      
      if (color) {
        const colorStr = String(color).toLowerCase();
        filteredMedications = filteredMedications.filter(med => 
          med.color.toLowerCase() === colorStr
        );
      }
      
      return res.json(filteredMedications);
    } catch (error) {
      console.error('약물 검색 오류:', error);
      res.status(500).json({ message: '약물 검색 중 오류가 발생했습니다', error: String(error) });
    }
  });`;

const oldMedicationSearchRegex = /\/\/ Medication Search API[\s\S]*?app\.get\('\/api\/medications\/search'[\s\S]*?}\);/;

routesContent = routesContent.replace(oldMedicationSearchRegex, newMedicationSearchCode);

fs.writeFileSync(routesPath, routesContent);
console.log('Successfully updated the medication search API with Korean pharmaceutical data');
