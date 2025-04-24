// PPG(광혈류측정) 데이터 시뮬레이터
// PPG 파형은 심장 박동에 따른 혈액 부피 변화를 감지하여 파형으로 나타냄

enum PPGStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

// PPG 파형 생성을 위한 상수
const BASE_AMPLITUDE = 0.7;  // 기본 진폭
const NOISE_FACTOR = 0.05;   // 잡음 계수
const DICROTIC_NOTCH = 0.3;  // 중복파(dicrotic notch) 크기

/**
 * PPG 데이터 생성 함수
 * @param status 현재 상태 ('normal', 'warning', 'critical')
 * @returns 생성된 PPG 데이터 포인트
 */
export function generatePPGData(status: string = 'normal') {
  // 현재 시간을 기반으로 진행 상태 계산 (0~1 사이의 값, 주기적으로 반복)
  const now = Date.now();
  const phase = (now % 1000) / 1000;
  
  let amplitude = BASE_AMPLITUDE;
  let noiseLevel = NOISE_FACTOR;
  let oxygenLevel = 98;
  
  // 상태에 따른 파라미터 조정
  switch (status) {
    case 'warning':
      amplitude *= 0.8;  // 감소된 진폭
      noiseLevel *= 2;   // 증가된 잡음
      oxygenLevel = 96;  // 약간 감소된 산소 포화도
      break;
    case 'critical':
      amplitude *= 0.6;  // 크게 감소된 진폭
      noiseLevel *= 4;   // 크게 증가된 잡음
      oxygenLevel = 94;  // 위험한 산소 포화도
      break;
  }
  
  // PPG 파형 생성 (시스톨릭/디아스톨릭 구간 모델링)
  let value = 0;
  
  if (phase < 0.15) {
    // 상승 부분 (시스톨릭 상승)
    value = amplitude * Math.pow(Math.sin(phase * Math.PI / 0.3), 2);
  } else if (phase < 0.3) {
    // 하강 시작 부분 (시스톨릭 하강)
    value = amplitude * (1 - Math.pow((phase - 0.15) / 0.15, 0.8));
  } else if (phase < 0.45) {
    // 디크로틱 노치 (중복파) 영역
    value = amplitude * DICROTIC_NOTCH + 
            amplitude * (0.3) * Math.pow(Math.sin((phase - 0.3) * Math.PI / 0.3), 2);
  } else {
    // 디아스톨릭 하강 (천천히 감소)
    value = amplitude * DICROTIC_NOTCH * Math.exp(-(phase - 0.45) * 4);
  }
  
  // 잡음 추가
  value += (Math.random() - 0.5) * noiseLevel;
  
  // 상태에 따른 불규칙성 추가
  if (status === 'warning' || status === 'critical') {
    // 간헐적인 불규칙한 펄스 삽입
    if (Math.random() < 0.1) {
      value *= (0.7 + Math.random() * 0.6);
    }
    
    // 급격한 기준선 변동 (critical에서만)
    if (status === 'critical' && Math.random() < 0.05) {
      value += (Math.random() - 0.5) * 0.3;
    }
  }
  
  // 산소 포화도에 약간의 변동 추가
  const oxygenVariation = Math.random() * 0.8 - 0.4;
  const finalOxygen = Math.min(100, Math.max(90, oxygenLevel + oxygenVariation));
  
  return { 
    value: Math.max(0, value),  // 음수값 방지
    oxygen: Math.round(finalOxygen * 10) / 10  // 소수점 첫째 자리까지 표시
  };
}

/**
 * 시간에 따른 다중 PPG 데이터 포인트 생성
 * @param duration 데이터 포인트 개수
 * @param status 현재 상태
 * @returns PPG 데이터 포인트 배열
 */
export function generateMultiplePPGData(duration: number, status: string = 'normal') {
  const data = [];
  const now = Date.now();
  
  for (let i = 0; i < duration; i++) {
    const time = now - (duration - i) * 100;
    const { value, oxygen } = generatePPGData(status);
    data.push({ value, time, oxygen });
  }
  
  return data;
}

/**
 * PPG 분석 결과 생성
 * @param status 현재 상태
 * @returns PPG 분석 결과 객체
 */
export function analyzePPGData(status: string = 'normal') {
  // 상태에 따른 분석 결과 생성
  switch (status) {
    case 'normal':
      return {
        oxygenLevel: 98,
        perfusionIndex: 2.8,
        peripheralResistance: '정상',
        pulsatility: '양호',
        abnormalities: []
      };
    case 'warning':
      return {
        oxygenLevel: 96,
        perfusionIndex: 1.9,
        peripheralResistance: '약간 증가',
        pulsatility: '감소',
        abnormalities: ['경미한 관류 감소', '약간의 파형 불규칙성']
      };
    case 'critical':
      return {
        oxygenLevel: 94,
        perfusionIndex: 1.2,
        peripheralResistance: '증가',
        pulsatility: '심각하게 감소',
        abnormalities: ['파형 진폭 감소', '불규칙한 파형 간격', '관류 지수 저하']
      };
    default:
      return {
        oxygenLevel: 98,
        perfusionIndex: 2.8,
        peripheralResistance: '정상',
        pulsatility: '양호',
        abnormalities: []
      };
  }
}

export default {
  generatePPGData,
  generateMultiplePPGData,
  analyzePPGData
};