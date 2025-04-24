// server/monitoringInstance.ts
// 중앙에서 관리되는 Monitoring 인스턴스

import { Monitoring, type MonitoringOptions, type LogLevel, type MonitoringCategory } from './utils/monitoring';

// 모니터링 싱글톤 인스턴스 생성
const monitoringInstance = new Monitoring({
  consoleOutput: true,
  fileOutput: true,
  environment: process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development'
});

// 싱글톤 인스턴스 export
export { monitoringInstance };

// 초기화 로그 (선택 사항)
monitoringInstance.log('info', 'Global monitoring instance initialized.', {}, 'system');