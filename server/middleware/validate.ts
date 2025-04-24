import { Request, Response, NextFunction } from 'express';
import { monitoring } from '../utils/monitoring';

/**
 * 검증 규칙 타입 정의
 */
type Rule = {
  type: string;
  required?: boolean;
  optional?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp | string;
  enum?: any[];
  validate?: (value: any) => boolean;
  errorMessage?: string;
  items?: Rule; // 배열 항목에 대한 규칙
  props?: Record<string, Rule>; // 객체 속성에 대한 규칙
  format?: string; // 날짜, 이메일 등 특수 형식
};

/**
 * 스키마 타입 정의
 */
type ValidationSchema = {
  body?: Record<string, Rule>;
  query?: Record<string, Rule>;
  params?: Record<string, Rule>;
  headers?: Record<string, Rule>;
};

/**
 * 검증 오류 타입 정의
 */
type ValidationError = {
  field: string;
  message: string;
  location: 'body' | 'query' | 'params' | 'headers';
};

/**
 * 유효성 검사 미들웨어 생성 함수
 * @param schema 검증 스키마
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 유효성 검사 오류 수집
    const errors: ValidationError[] = [];
    
    // 요청 본문 검사
    if (schema.body) {
      validateObject(req.body, schema.body, errors, 'body');
    }
    
    // 쿼리 파라미터 검사
    if (schema.query) {
      validateObject(req.query, schema.query, errors, 'query');
    }
    
    // URL 파라미터 검사
    if (schema.params) {
      validateObject(req.params, schema.params, errors, 'params');
    }
    
    // 헤더 검사
    if (schema.headers) {
      validateObject(req.headers, schema.headers, errors, 'headers');
    }
    
    // 오류가 있으면 반환
    if (errors.length > 0) {
      monitoring.log('system', 'warn', `요청 유효성 검사 실패: ${JSON.stringify(errors)}`);
      
      return res.status(400).json({
        success: false,
        error: '입력 값이 유효하지 않습니다',
        errors
      });
    }
    
    // 오류가 없으면 다음 미들웨어로 진행
    next();
  };
};

/**
 * 객체 유효성 검사 함수
 * @param obj 검사할 객체
 * @param schema 검증 스키마
 * @param errors 오류 수집 배열
 * @param location 데이터 위치(body, query 등)
 */
function validateObject(
  obj: any,
  schema: Record<string, Rule>,
  errors: ValidationError[],
  location: 'body' | 'query' | 'params' | 'headers'
) {
  // 각 필드에 대해 검증
  for (const [field, rule] of Object.entries(schema)) {
    const value = obj[field];
    
    // 필수 필드 검증
    if ((rule.required || !rule.optional) && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: rule.errorMessage || `${field} 필드는 필수입니다`,
        location
      });
      continue;
    }
    
    // 값이 없고 필수가 아니면 검증 스킵
    if ((value === undefined || value === null || value === '') && (rule.optional || !rule.required)) {
      continue;
    }
    
    // 타입 검증
    if (rule.type) {
      if (!validateType(value, rule.type)) {
        errors.push({
          field,
          message: rule.errorMessage || `${field} 필드는 ${rule.type} 타입이어야 합니다`,
          location
        });
        continue;
      }
    }
    
    // 열거형 값 검증
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field,
        message: rule.errorMessage || `${field} 필드는 [${rule.enum.join(', ')}] 중 하나여야 합니다`,
        location
      });
    }
    
    // 최소값 검증
    if (rule.min !== undefined) {
      if (typeof value === 'string' && value.length < rule.min) {
        errors.push({
          field,
          message: rule.errorMessage || `${field} 필드는 최소 ${rule.min}자 이상이어야 합니다`,
          location
        });
      } else if (typeof value === 'number' && value < rule.min) {
        errors.push({
          field,
          message: rule.errorMessage || `${field} 필드는 최소 ${rule.min} 이상이어야 합니다`,
          location
        });
      } else if (Array.isArray(value) && value.length < rule.min) {
        errors.push({
          field,
          message: rule.errorMessage || `${field} 필드는 최소 ${rule.min}개 이상의 항목이 있어야 합니다`,
          location
        });
      }
    }
    
    // 최대값 검증
    if (rule.max !== undefined) {
      if (typeof value === 'string' && value.length > rule.max) {
        errors.push({
          field,
          message: rule.errorMessage || `${field} 필드는 최대 ${rule.max}자 이하여야 합니다`,
          location
        });
      } else if (typeof value === 'number' && value > rule.max) {
        errors.push({
          field,
          message: rule.errorMessage || `${field} 필드는 최대 ${rule.max} 이하여야 합니다`,
          location
        });
      } else if (Array.isArray(value) && value.length > rule.max) {
        errors.push({
          field,
          message: rule.errorMessage || `${field} 필드는 최대 ${rule.max}개 이하의 항목이 있어야 합니다`,
          location
        });
      }
    }
    
    // 패턴 검증
    if (rule.pattern && typeof value === 'string') {
      const pattern = typeof rule.pattern === 'string' 
        ? new RegExp(rule.pattern) 
        : rule.pattern;
      
      if (!pattern.test(value)) {
        errors.push({
          field,
          message: rule.errorMessage || `${field} 필드는 유효한 형식이 아닙니다`,
          location
        });
      }
    }
    
    // 형식 검증
    if (rule.format) {
      if (!validateFormat(value, rule.format)) {
        errors.push({
          field,
          message: rule.errorMessage || `${field} 필드는 유효한 ${rule.format} 형식이 아닙니다`,
          location
        });
      }
    }
    
    // 사용자 정의 검증 함수
    if (rule.validate && typeof rule.validate === 'function') {
      if (!rule.validate(value)) {
        errors.push({
          field,
          message: rule.errorMessage || `${field} 필드는 유효하지 않습니다`,
          location
        });
      }
    }
    
    // 배열 내부 항목 검증
    if (Array.isArray(value) && rule.items) {
      value.forEach((item, index) => {
        if (rule.items!.type === 'object' && rule.items!.props) {
          // 객체 배열의 경우 각 객체를 검증
          const nestedErrors: ValidationError[] = [];
          validateObject(item, rule.items!.props!, nestedErrors, location);
          
          // 중첩 오류 변환
          nestedErrors.forEach(error => {
            errors.push({
              field: `${field}[${index}].${error.field}`,
              message: error.message,
              location
            });
          });
        } else {
          // 기본 타입 배열의 경우 간단한 검증
          if (!validateType(item, rule.items.type)) {
            errors.push({
              field: `${field}[${index}]`,
              message: `${field}[${index}] 항목은 ${rule.items.type} 타입이어야 합니다`,
              location
            });
          }
        }
      });
    }
    
    // 객체 내부 속성 검증
    if (typeof value === 'object' && !Array.isArray(value) && rule.props) {
      const nestedErrors: ValidationError[] = [];
      validateObject(value, rule.props, nestedErrors, location);
      
      // 중첩 오류 변환
      nestedErrors.forEach(error => {
        errors.push({
          field: `${field}.${error.field}`,
          message: error.message,
          location
        });
      });
    }
  }
}

/**
 * 값의 타입 검증 함수
 * @param value 검증할 값
 * @param type 기대하는 타입
 */
function validateType(value: any, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));
    case 'boolean':
      return typeof value === 'boolean' || value === 'true' || value === 'false';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && !Array.isArray(value) && value !== null;
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'date':
      return !isNaN(Date.parse(value));
    case 'uuid':
      return typeof value === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    case 'url':
      try {
        new URL(value);
        return true;
      } catch (e) {
        return false;
      }
    default:
      return true;
  }
}

/**
 * 특수 형식 검증 함수
 * @param value 검증할 값
 * @param format 형식 문자열
 */
function validateFormat(value: any, format: string): boolean {
  switch (format) {
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'date':
      return !isNaN(Date.parse(value));
    case 'date-time':
      try {
        return new Date(value).toISOString() !== 'Invalid Date';
      } catch (e) {
        return false;
      }
    case 'uri':
    case 'url':
      try {
        new URL(value);
        return true;
      } catch (e) {
        return false;
      }
    case 'uuid':
      return typeof value === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    case 'alpha':
      return typeof value === 'string' && /^[a-zA-Z]+$/.test(value);
    case 'alphanumeric':
      return typeof value === 'string' && /^[a-zA-Z0-9]+$/.test(value);
    case 'numeric':
      return typeof value === 'string' && /^[0-9]+$/.test(value);
    case 'phone':
      return typeof value === 'string' && /^\+?[0-9]{10,15}$/.test(value);
    case 'postal-code':
      return typeof value === 'string' && /^[0-9]{5}(-[0-9]{4})?$/.test(value);
    case 'hex-color':
      return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
    case 'ipv4':
      return typeof value === 'string' && 
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value);
    case 'ipv6':
      return typeof value === 'string' && 
        /^(([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:)|([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:)|([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:)|([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)|([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)|([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)|([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)|(:((:[0-9a-f]{1,4}){1,7}|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))$/i.test(value);
    default:
      return true;
  }
} 