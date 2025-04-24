// ECG 시뮬레이터 어댑터 - 기존 ECG 시뮬레이터를 활력 징후 모니터링 페이지와 호환되는 형태로 변환합니다
import { generateECG } from './ecgSimulator';

// 내부 설정 인터페이스 정의
interface ECGConfig {
  heartRate?: number;
  irregularity?: number;
  noise?: number;
  stElevation?: number;
}

/**
 * 상태 문자열을 기반으로 ECG 데이터 생성
 * @param status 'normal', 'warning', 'critical' 중 하나
 * @returns ECG 데이터 포인트
 */
export function generateEcgData(status: 'normal' | 'warning' | 'critical') {
  // 상태에 따른 설정값 생성
  const config: Partial<ECGConfig> = {};
  
  switch (status) {
    case 'normal':
      config.heartRate = 70 + Math.floor(Math.random() * 10); // 70-79 BPM
      config.irregularity = 0.05; // 낮은 불규칙성
      config.noise = 0.05; // 낮은 잡음
      break;
    case 'warning':
      config.heartRate = 90 + Math.floor(Math.random() * 20); // 90-109 BPM
      config.irregularity = 0.2; // 중간 불규칙성
      config.noise = 0.15; // 중간 잡음
      config.stElevation = (Math.random() > 0.5) ? 0.1 : 0; // 50% 확률로 약간의 ST 분절 상승
      break;
    case 'critical':
      config.heartRate = 120 + Math.floor(Math.random() * 30); // 120-149 BPM
      config.irregularity = 0.4; // 높은 불규칙성
      config.noise = 0.25; // 높은 잡음
      config.stElevation = 0.2; // 명확한 ST 분절 상승
      break;
  }
  
  // ECG 데이터 생성 및 단일 포인트 반환 (실시간 모니터링용)
  const data = generateECG(config);
  const randomIndex = Math.floor(Math.random() * data.length);
  
  return { value: data[randomIndex] };
}

/**
 * 상태 문자열을 기반으로 ECG 분석 결과 생성
 * @param status 'normal', 'warning', 'critical' 중 하나
 * @returns ECG 분석 결과 객체
 */
export function analyzeEcgData(status: 'normal' | 'warning' | 'critical') {
  switch (status) {
    case 'normal':
      return {
        heartRate: 70 + Math.floor(Math.random() * 10),
        hrv: '정상 (45-55ms)',
        qtInterval: '정상 (350-430ms)',
        stDeviation: '0mm',
        patternProbabilities: [
          { name: '정상 동리듬', probability: 0.95 },
          { name: '심방세동', probability: 0.01 },
          { name: '심실조기수축', probability: 0.01 },
          { name: '심실빈맥', probability: 0.01 },
          { name: 'ST 분절 상승', probability: 0.02 }
        ],
        abnormalities: [],
        recommendation: '정상 심장 리듬입니다. 현재의 건강한 생활 습관을 유지하세요.'
      };
    case 'warning':
      return {
        heartRate: 90 + Math.floor(Math.random() * 20),
        hrv: '감소됨 (25-35ms)',
        qtInterval: '약간 연장됨 (440-460ms)',
        stDeviation: '0.5-1mm 상승',
        patternProbabilities: [
          { name: '정상 동리듬', probability: 0.6 },
          { name: '심방세동', probability: 0.15 },
          { name: '심실조기수축', probability: 0.15 },
          { name: '심실빈맥', probability: 0.05 },
          { name: 'ST 분절 상승', probability: 0.05 }
        ],
        abnormalities: [
          '경미한 동성 빈맥',
          '간헐적 조기심실수축',
          'ST 분절의 경미한 변화'
        ],
        recommendation: '약간의 심장 리듬 이상이 감지되었습니다. 몇 시간 후에 재측정해보세요. 증상이 지속되면 의사와 상담하는 것이 좋습니다.'
      };
    case 'critical':
      return {
        heartRate: 120 + Math.floor(Math.random() * 30),
        hrv: '심각하게 감소됨 (10-20ms)',
        qtInterval: '연장됨 (>480ms)',
        stDeviation: '2mm 이상 상승',
        patternProbabilities: [
          { name: '정상 동리듬', probability: 0.1 },
          { name: '심방세동', probability: 0.25 },
          { name: '심실조기수축', probability: 0.25 },
          { name: '심실빈맥', probability: 0.25 },
          { name: 'ST 분절 상승', probability: 0.15 }
        ],
        abnormalities: [
          '심방세동 의심',
          '빈번한 조기심실수축',
          '눈에 띄는 ST 분절 상승',
          'QT 간격 연장',
          '동성 빈맥'
        ],
        recommendation: '심각한 심장 리듬 이상이 감지되었습니다. 가능한 빨리 의료 전문가의 진료를 받으시기 바랍니다.'
      };
    default:
      return {
        heartRate: 75,
        hrv: '정상 (45-55ms)',
        qtInterval: '정상 (350-430ms)',
        stDeviation: '0mm',
        patternProbabilities: [
          { name: '정상 동리듬', probability: 0.95 },
          { name: '심방세동', probability: 0.01 },
          { name: '심실조기수축', probability: 0.01 },
          { name: '심실빈맥', probability: 0.01 },
          { name: 'ST 분절 상승', probability: 0.02 }
        ],
        abnormalities: [],
        recommendation: '정상 심장 리듬입니다. 현재의 건강한 생활 습관을 유지하세요.'
      };
  }
}