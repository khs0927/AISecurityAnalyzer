// 애플리케이션에서 공유되는 유틸리티 함수

/**
 * 날짜를 형식화하는 함수
 * @param date - 형식화할 날짜
 * @param format - 출력 형식 (기본값: 'YYYY-MM-DD')
 * @returns 형식화된 날짜 문자열
 */
export const formatDate = (date: Date | string, format: string = 'YYYY-MM-DD'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    throw new Error('유효하지 않은 날짜입니다');
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 건강 지표 데이터 계산 함수
 */
export const calculateHealthMetrics = (values: number[]): { 
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
} => {
  if (!values.length) {
    throw new Error('데이터가 비어 있습니다');
  }

  // 평균, 최소, 최대값 계산
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = parseFloat((sum / values.length).toFixed(1));
  const min = Math.min(...values);
  const max = Math.max(...values);

  // 추세 계산 (마지막 3개 값의 평균과 이전 값들의 평균 비교)
  let trend: 'up' | 'down' | 'stable' = 'stable';

  if (values.length >= 4) {
    const recentValues = values.slice(-3);
    const olderValues = values.slice(0, -3);
    
    const recentAvg = recentValues.reduce((acc, val) => acc + val, 0) / recentValues.length;
    const olderAvg = olderValues.reduce((acc, val) => acc + val, 0) / olderValues.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > (max - min) * 0.05) {
      trend = 'up';
    } else if (difference < -(max - min) * 0.05) {
      trend = 'down';
    }
  }

  return { average, min, max, trend };
};

/**
 * 건강 데이터의 위험 수준을 평가하는 함수
 * @param heartRate - 심박수
 * @param oxygenLevel - 산소 포화도
 * @returns 위험 수준 ('low', 'medium', 'high' 중 하나)
 */
export const assessRiskLevel = (heartRate: number, oxygenLevel: number): 'low' | 'medium' | 'high' => {
  // 산소 포화도가 매우 낮거나 심박수가 매우 높은 경우 - 높은 위험
  if (oxygenLevel < 85 || heartRate > 180) {
    return 'high';
  }
  
  // 산소 포화도가 낮거나 심박수가 높은 경우 - 중간 위험
  if (oxygenLevel < 90 || heartRate > 140 || heartRate < 40) {
    return 'medium';
  }
  
  // 그 외 - 낮은 위험
  return 'low';
};

/**
 * 에러 메시지를 표준화된 형식으로 변환
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return '알 수 없는 오류가 발생했습니다';
};

/**
 * JWT 토큰에서 페이로드 추출
 */
export const parseJwtPayload = <T>(token: string): T => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    throw new Error('유효하지 않은 토큰입니다');
  }
}; 