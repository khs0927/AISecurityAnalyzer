// server/monitoringInstance.ts
// 중앙에서 관리되는 Monitoring 인스턴스

import { Monitoring, type MonitoringOptions, type LogLevel, type MonitoringCategory } from './utils/monitoring';

// 모니터링 싱글톤 인스턴스 생성
class ExtendedMonitoring extends Monitoring {
  // 추가 필요한 메소드들
  recordPredictionLatency(modelName: string, duration: number): void {
    this.log('info', '모델 예측 지연 시간 기록', { 
      modelName, 
      duration,
      timestamp: Date.now()
    }, 'performance');
  }

  recordModelError(modelName: string): void {
    this.log('error', '모델 오류 발생', { 
      modelName,
      timestamp: Date.now()
    }, 'model');
  }
  
  /**
   * 오류 로깅을 위한 간편 메서드
   * @param message 오류 메시지
   * @param details 오류 세부 정보 객체
   */
  logError(message: string, details?: Record<string, any>): void {
    this.log('error', message, details || {}, 'system');
  }
}

// 확장된 모니터링 싱글톤 인스턴스 생성
const monitoringInstance = new ExtendedMonitoring({
  consoleOutput: true,
  fileOutput: true,
  environment: process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development'
});

// 싱글톤 인스턴스 export
export { monitoringInstance };

// 초기화 로그 (선택 사항)
monitoringInstance.log('info', 'Global monitoring instance initialized.', {}, 'system');