// 애플리케이션에서 공유되는 유효성 검사 함수

import { HealthData, RiskData, User, Notification } from './types';

/**
 * 건강 데이터 유효성 검사
 */
export const validateHealthData = (data: Partial<HealthData>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 필수 필드 검사
  if (data.heartRate === undefined) errors.push('심박수는 필수입니다');
  if (data.oxygenLevel === undefined) errors.push('산소 포화도는 필수입니다');
  if (!data.ecgData) errors.push('ECG 데이터는 필수입니다');
  if (!data.timestamp) errors.push('타임스탬프는 필수입니다');

  // 값 범위 검사
  if (data.heartRate !== undefined && (data.heartRate < 30 || data.heartRate > 220)) {
    errors.push('심박수는 30~220 사이여야 합니다');
  }

  if (data.oxygenLevel !== undefined && (data.oxygenLevel < 70 || data.oxygenLevel > 100)) {
    errors.push('산소 포화도는 70~100 사이여야 합니다');
  }

  // 타임스탬프 형식 검사
  if (data.timestamp && isNaN(Date.parse(data.timestamp))) {
    errors.push('타임스탬프 형식이 올바르지 않습니다');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 위험 데이터 유효성 검사
 */
export const validateRiskData = (data: Partial<RiskData>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 필수 필드 검사
  if (!data.level) errors.push('위험 수준은 필수입니다');
  if (data.probability === undefined) errors.push('확률은 필수입니다');
  if (!data.details) errors.push('세부 정보는 필수입니다');
  if (!data.recommendations || !Array.isArray(data.recommendations)) errors.push('권장 사항은 배열이어야 합니다');
  if (!data.timestamp) errors.push('타임스탬프는 필수입니다');

  // 값 검사
  if (data.level && !['low', 'medium', 'high'].includes(data.level)) {
    errors.push('위험 수준은 low, medium, high 중 하나여야 합니다');
  }

  if (data.probability !== undefined && (data.probability < 0 || data.probability > 1)) {
    errors.push('확률은 0~1 사이여야 합니다');
  }

  // 타임스탬프 형식 검사
  if (data.timestamp && isNaN(Date.parse(data.timestamp))) {
    errors.push('타임스탬프 형식이 올바르지 않습니다');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 사용자 데이터 유효성 검사
 */
export const validateUser = (data: Partial<User>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 필수 필드 검사
  if (!data.username) errors.push('사용자 이름은 필수입니다');
  if (!data.email) errors.push('이메일은 필수입니다');

  // 이메일 형식 검사
  if (data.email && !emailRegex.test(data.email)) {
    errors.push('이메일 형식이 올바르지 않습니다');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}; 