/**
 * NotToday 애플리케이션을 위한 데이터 검증 유틸리티
 * API 요청 및 응답의 데이터 유효성을 검증하고 오류를 처리합니다.
 */

import { Request, Response } from 'express';
import { monitoringInstance } from '../monitoringInstance';

// Express의 NextFunction 타입 정의
interface NextFunction {
  (err?: any): void;
}

/**
 * 건강 데이터 검증을 위한 인터페이스
 */
export interface HealthDataValidationSchema {
  userId: string;
  heartRate?: number;
  oxygenLevel?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bodyTemperature?: number;
  ecgData?: number[];
  timestamp?: string;
}

/**
 * AI 상담 메시지 검증을 위한 인터페이스
 */
export interface ConsultationMessageValidationSchema {
  userId: string;
  message: string;
  category?: string;
  sessionId?: string;
  timestamp?: string;
}

/**
 * 사용자 ID 형식 검증
 */
export function isValidUserId(userId: string): boolean {
  // UUID 형식 또는 사용자 정의 ID 형식 검증
  return typeof userId === 'string' && userId.length >= 3 && userId.length <= 50;
}

/**
 * 타임스탬프 형식 검증
 */
export function isValidTimestamp(timestamp: string): boolean {
  if (!timestamp) return true; // 선택적 필드
  
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
}

/**
 * 범위 내의 숫자 여부 검증
 */
export function isNumberInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * 건강 데이터 검증
 */
export function validateHealthData(data: HealthDataValidationSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 필수 필드 검증
  if (!data.userId) {
    errors.push('사용자 ID는 필수 항목입니다');
  } else if (!isValidUserId(data.userId)) {
    errors.push('사용자 ID 형식이 올바르지 않습니다');
  }

  // 선택적 필드 검증
  if (data.heartRate !== undefined && !isNumberInRange(data.heartRate, 30, 220)) {
    errors.push('심박수는 30-220 범위 내에 있어야 합니다');
  }

  if (data.oxygenLevel !== undefined && !isNumberInRange(data.oxygenLevel, 70, 100)) {
    errors.push('산소 포화도는 70-100 범위 내에 있어야 합니다');
  }

  if (data.bloodPressureSystolic !== undefined && !isNumberInRange(data.bloodPressureSystolic, 70, 200)) {
    errors.push('수축기 혈압은 70-200 범위 내에 있어야 합니다');
  }

  if (data.bloodPressureDiastolic !== undefined && !isNumberInRange(data.bloodPressureDiastolic, 40, 130)) {
    errors.push('이완기 혈압은 40-130 범위 내에 있어야 합니다');
  }

  if (data.bodyTemperature !== undefined && !isNumberInRange(data.bodyTemperature, 35, 43)) {
    errors.push('체온은 35-43°C 범위 내에 있어야 합니다');
  }

  if (data.timestamp && !isValidTimestamp(data.timestamp)) {
    errors.push('타임스탬프 형식이 올바르지 않습니다');
  }

  if (data.ecgData !== undefined) {
    if (!Array.isArray(data.ecgData)) {
      errors.push('ECG 데이터는 배열이어야 합니다');
    } else if (data.ecgData.length > 0) {
      // ECG 데이터 유효성 검증 (간단한 검증)
      const invalidValues = data.ecgData.filter(value => typeof value !== 'number' || isNaN(value));
      if (invalidValues.length > 0) {
        errors.push('ECG 데이터에 유효하지 않은 값이 포함되어 있습니다');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * AI 상담 메시지 검증
 */
export function validateConsultationMessage(data: ConsultationMessageValidationSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 필수 필드 검증
  if (!data.userId) {
    errors.push('사용자 ID는 필수 항목입니다');
  } else if (!isValidUserId(data.userId)) {
    errors.push('사용자 ID 형식이 올바르지 않습니다');
  }

  if (!data.message) {
    errors.push('메시지 내용은 필수 항목입니다');
  } else if (typeof data.message !== 'string' || data.message.trim().length === 0) {
    errors.push('메시지 내용이 비어 있거나 형식이 올바르지 않습니다');
  } else if (data.message.length > 1000) {
    errors.push('메시지는 1000자를 초과할 수 없습니다');
  }

  // 선택적 필드 검증
  if (data.category && !['general', 'medical', 'emergency', 'wellness'].includes(data.category)) {
    errors.push('카테고리는 general, medical, emergency, wellness 중 하나여야 합니다');
  }

  if (data.sessionId && (typeof data.sessionId !== 'string' || data.sessionId.length === 0)) {
    errors.push('세션 ID 형식이 올바르지 않습니다');
  }

  if (data.timestamp && !isValidTimestamp(data.timestamp)) {
    errors.push('타임스탬프 형식이 올바르지 않습니다');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Express.js 미들웨어로 사용할 수 있는 건강 데이터 검증 함수
 */
export function validateHealthDataMiddleware(req: Request, res: Response, next: NextFunction): void {
  const validationResult = validateHealthData(req.body);
  
  if (!validationResult.valid) {
    monitoringInstance.logError('API Validation Error', {
      endpoint: req.path,
      errors: validationResult.errors,
      data: req.body
    });
    
    res.status(400).json({
      success: false,
      error: '유효하지 않은 건강 데이터',
      details: validationResult.errors
    });
    return;
  }

  next();
}

/**
 * Express.js 미들웨어로 사용할 수 있는 AI 상담 메시지 검증 함수
 */
export function validateConsultationMessageMiddleware(req: Request, res: Response, next: NextFunction): void {
  const validationResult = validateConsultationMessage(req.body);
  
  if (!validationResult.valid) {
    monitoringInstance.logError('API Validation Error', {
      endpoint: req.path,
      errors: validationResult.errors,
      data: req.body
    });
    
    res.status(400).json({
      success: false,
      error: '유효하지 않은 상담 메시지',
      details: validationResult.errors
    });
    return;
  }

  next();
}

/**
 * ID 파라미터 검증 미들웨어 (주로 GET 요청에서 사용)
 */
export function validateUserIdParamMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { userId } = req.params;
  
  if (!userId || !isValidUserId(userId)) {
    monitoringInstance.logError('API Validation Error', {
      endpoint: req.path,
      error: '유효하지 않은 사용자 ID',
      userId
    });
    
    res.status(400).json({
      success: false,
      error: '유효하지 않은 사용자 ID',
    });
    return;
  }

  next();
}

/**
 * 기본적인 API 쿼리 파라미터 검증
 */
export function validatePeriodParamMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { period } = req.query;
  
  if (period && !['daily', 'weekly', 'monthly', 'all'].includes(period as string)) {
    monitoringInstance.logError('API Validation Error', {
      endpoint: req.path,
      error: '유효하지 않은 기간 파라미터',
      period
    });
    
    res.status(400).json({
      success: false,
      error: '유효하지 않은 기간 파라미터. daily, weekly, monthly 또는 all 중 하나여야 합니다',
    });
    return;
  }

  next();
}

/**
 * 공통 API 응답 형식
 */
export function formatApiResponse<T>(success: boolean, data?: T, error?: string, details?: string[]): { 
  success: boolean; 
  data?: T; 
  error?: string; 
  details?: string[];
  timestamp: string; 
} {
  return {
    success,
    ...(data && { data }),
    ...(error && { error }),
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
}

/**
 * API 요청 속도 제한 초과 응답
 */
export function rateLimitExceededResponse(res: Response): void {
  res.status(429).json(formatApiResponse(false, undefined, '너무 많은 요청. 잠시 후 다시 시도하세요.'));
}

/**
 * 서버 오류 응답 포맷
 */
export function serverErrorResponse(res: Response, error: Error): void {
  monitoringInstance.logError('API Server Error', {
    error: error.message,
    stack: error.stack
  });
  
  res.status(500).json(formatApiResponse(false, undefined, '서버 오류가 발생했습니다.'));
} 