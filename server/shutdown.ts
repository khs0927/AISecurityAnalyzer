import http from 'http';
import { monitoringInstance } from './monitoringInstance';
import { db } from './db/database';
import modelCache from './utils/modelCache';
import { socketManager } from './socket/socketManager';
import { config } from './config';

/**
 * 서버 종료 핸들러 모듈
 * 
 * 이 모듈은 서버 종료와 관련된 로직을 중앙화하여 코드 중복을 방지합니다.
 * 다양한 종료 상황(SIGTERM, SIGINT, 예외 등)에 대한 처리를 단일화합니다.
 */

// 종료 중 상태 플래그
let isShuttingDown = false;

// 정리 작업 시간 제한 (10초)
const SHUTDOWN_TIMEOUT = 10000;

/**
 * 서버 종료 처리 함수
 * @param server HTTP 서버 인스턴스
 */
export function handleShutdown(server: http.Server) {
  // 이미 종료 중이면 중복 실행 방지
  if (isShuttingDown) return;
  isShuttingDown = true;

  monitoringInstance.log('info', '서버가 종료됩니다...', {}, 'system');
  
  // HTTP 서버 연결 정리
  server.close(async () => {
    try {
      // 모델 캐시 정리
      await modelCache.saveToDisk();
      monitoringInstance.log('info', '모델 캐시 저장 완료', {}, 'system');

      // 데이터베이스 연결 종료
      await db.close();
      monitoringInstance.log('info', '데이터베이스 연결을 종료했습니다', {}, 'database');
      
      monitoringInstance.log('info', '서버가 정상적으로 종료되었습니다', {}, 'system');
      process.exit(0);
    } catch (err: any) {
      monitoringInstance.log('error', `서버 종료 오류: ${err.message}`, {}, 'system');
      process.exit(1);
    }
  });
  
  // 강제 종료 타임아웃 설정
  setTimeout(() => {
    monitoringInstance.log('warn', '서버 종료 시간 초과, 강제 종료합니다', {}, 'system');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
}

/**
 * 예상치 못한 예외 처리 핸들러
 * @param error 발생한 오류
 */
function handleUncaughtException(error: Error) {
  monitoringInstance.log('error', '처리되지 않은 예외 발생', { error }, 'system');
  
  // 모델 캐시 정리 시도
  try {
    modelCache.saveToDisk();
  } catch (err) {
    monitoringInstance.log('error', '모델 캐시 저장 실패', { error: err }, 'system');
  }
  
  // 심각한 오류의 경우 프로세스 종료
  if (error.message.includes('EADDRINUSE') || error.message.includes('EACCES')) {
    monitoringInstance.log('error', '치명적인 오류로 인해 서버를 종료합니다', {}, 'system');
    process.exit(1);
  }
}

/**
 * 처리되지 않은 프라미스 거부 핸들러
 * @param reason 거부 이유
 * @param promise 거부된 프라미스
 */
function handleUnhandledRejection(reason: any, promise: Promise<any>) {
  monitoringInstance.log('error', `처리되지 않은 프라미스 거부`, { reason }, 'system');
}

/**
 * 서버 종료 핸들러 등록 함수
 * @param server HTTP 서버 인스턴스
 */
export function registerShutdownHandlers(server: http.Server) {
  // 종료 시그널 처리
  process.on('SIGTERM', () => handleShutdown(server));
  process.on('SIGINT', () => handleShutdown(server));
  
  // 예외 처리
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);
  
  monitoringInstance.log('info', '서버 종료 핸들러가 등록되었습니다', {}, 'system');
}