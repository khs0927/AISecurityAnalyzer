import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * 모니터링 로그 레벨 타입
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * 모니터링 카테고리 타입
 */
export type MonitoringCategory = 
  | 'system'
  | 'model'
  | 'api'
  | 'security'
  | 'performance'
  | 'temp-files'
  | 'database'
  | 'user'
  | 'health';

/**
 * 모니터링 설정 인터페이스
 */
interface MonitoringOptions {
  logDirectory: string;
  consoleOutput: boolean;
  fileOutput: boolean;
  maxLogSize: number;
  maxLogFiles: number;
  logLevel: LogLevel;
  metricsInterval: number;
  environment: 'development' | 'production' | 'test';
}

/**
 * 시스템 메트릭 인터페이스
 */
interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAvg: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usedPercentage: number;
  };
  uptime: number;
  processMemory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

/**
 * 모델 성능 메트릭 인터페이스
 */
interface ModelMetrics {
  modelId: string;
  timestamp: number;
  requestCount: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  errorCount: number;
  tokenCount: number;
}

/**
 * 모니터링 클래스
 */
export class Monitoring {
  private logger: winston.Logger;
  private options: MonitoringOptions;
  private metricsTimer: NodeJS.Timer | null = null;
  private modelMetrics: Map<string, ModelMetrics> = new Map();
  private startTime: number = Date.now();
  
  // 기본 설정
  private DEFAULT_OPTIONS: MonitoringOptions = {
    logDirectory: path.join(os.tmpdir(), 'ai-security-analyzer', 'logs'),
    consoleOutput: true,
    fileOutput: true,
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 14, // 2주
    logLevel: 'info',
    metricsInterval: 60 * 1000, // 1분
    environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
  };

  constructor(options?: Partial<MonitoringOptions>) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
    this.initializeLogger();
    this.startMetricsCollection();
  }

  /**
   * 로거 초기화
   */
  private initializeLogger(): void {
    // 로그 디렉토리 생성
    if (this.options.fileOutput) {
      if (!fs.existsSync(this.options.logDirectory)) {
        fs.mkdirSync(this.options.logDirectory, { recursive: true });
      }
    }

    // 로그 포맷 설정
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    // 콘솔 출력 포맷
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        }`;
      })
    );

    const transports: winston.transport[] = [];

    // 콘솔 출력 설정
    if (this.options.consoleOutput) {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: this.options.logLevel
        })
      );
    }

    // 파일 출력 설정
    if (this.options.fileOutput) {
      // 일반 로그 파일
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: path.join(this.options.logDirectory, 'app-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.options.maxLogSize,
          maxFiles: this.options.maxLogFiles,
          level: this.options.logLevel,
          format: logFormat
        })
      );

      // 에러 로그 파일
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: path.join(this.options.logDirectory, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.options.maxLogSize,
          maxFiles: this.options.maxLogFiles,
          level: 'error',
          format: logFormat
        })
      );
    }

    // 로거 생성
    this.logger = winston.createLogger({
      level: this.options.logLevel,
      format: logFormat,
      defaultMeta: {
        environment: this.options.environment,
        service: 'ai-security-analyzer'
      },
      transports
    });

    this.log('info', '모니터링 시스템 초기화 완료', {
      options: {
        logDirectory: this.options.logDirectory,
        logLevel: this.options.logLevel,
        environment: this.options.environment
      }
    });
  }

  /**
   * 주기적인 메트릭 수집 시작
   */
  private startMetricsCollection(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    this.metricsTimer = setInterval(() => {
      const metrics = this.collectSystemMetrics();
      this.log('info', '시스템 메트릭 수집', { metrics }, 'system');
    }, this.options.metricsInterval);
  }

  /**
   * 메트릭 수집 중지
   */
  public stopMetricsCollection(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  /**
   * 시스템 메트릭 수집
   */
  public collectSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce(
      (acc, cpu) => 
        acc + cpu.times.idle + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq, 
      0
    );
    const cpuUsage = 100 - ((totalIdle / totalTick) * 100);

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const processMemory = process.memoryUsage();

    return {
      timestamp: Date.now(),
      cpu: {
        usage: parseFloat(cpuUsage.toFixed(2)),
        loadAvg: os.loadavg(),
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usedPercentage: parseFloat(((usedMem / totalMem) * 100).toFixed(2)),
      },
      uptime: process.uptime(),
      processMemory: {
        rss: processMemory.rss,
        heapTotal: processMemory.heapTotal,
        heapUsed: processMemory.heapUsed,
        external: processMemory.external,
      },
    };
  }

  /**
   * 모델 요청 시작 로깅
   */
  public startModelRequest(modelId: string): number {
    const requestId = Date.now();
    
    // 모델 메트릭이 없으면 초기화
    if (!this.modelMetrics.has(modelId)) {
      this.modelMetrics.set(modelId, {
        modelId,
        timestamp: Date.now(),
        requestCount: 0,
        avgLatency: 0,
        maxLatency: 0,
        minLatency: Number.MAX_SAFE_INTEGER,
        errorCount: 0,
        tokenCount: 0
      });
    }

    this.log('info', '모델 요청 시작', {
      modelId,
      requestId
    }, 'model');

    return requestId;
  }

  /**
   * 모델 요청 완료 로깅
   */
  public endModelRequest(
    modelId: string, 
    requestId: number, 
    success: boolean, 
    tokenCount: number = 0
  ): void {
    const endTime = Date.now();
    const startTime = requestId;
    const latency = endTime - startTime;

    // 메트릭 업데이트
    const metrics = this.modelMetrics.get(modelId);
    if (metrics) {
      const totalRequests = metrics.requestCount + 1;
      const totalLatency = (metrics.avgLatency * metrics.requestCount) + latency;
      
      metrics.requestCount = totalRequests;
      metrics.avgLatency = totalLatency / totalRequests;
      metrics.maxLatency = Math.max(metrics.maxLatency, latency);
      metrics.minLatency = Math.min(metrics.minLatency, latency);
      
      if (!success) {
        metrics.errorCount++;
      }

      metrics.tokenCount += tokenCount;
      this.modelMetrics.set(modelId, metrics);
    }

    this.log(success ? 'info' : 'error', '모델 요청 완료', {
      modelId,
      requestId,
      latency,
      success,
      tokenCount
    }, 'model');
  }

  /**
   * API 요청 로깅
   */
  public logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
    userId?: string
  ): void {
    const isError = statusCode >= 400;
    const level: LogLevel = isError ? 'error' : 'info';

    this.log(level, 'API 요청', {
      method,
      path,
      statusCode,
      responseTime,
      userAgent,
      userId
    }, 'api');
  }

  /**
   * 보안 이벤트 로깅
   */
  public logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
    userId?: string
  ): void {
    const level: LogLevel = 
      severity === 'low' ? 'info' :
      severity === 'medium' ? 'warn' :
      'error';

    this.log(level, '보안 이벤트', {
      eventType,
      severity,
      details,
      userId
    }, 'security');
  }

  /**
   * 성능 이벤트 로깅
   */
  public logPerformance(
    operation: string,
    duration: number,
    success: boolean,
    details?: Record<string, any>
  ): void {
    // 성능 임계값을 넘으면 경고
    const isWarning = duration > 1000; // 1초 이상
    const level: LogLevel = !success ? 'error' : isWarning ? 'warn' : 'info';

    this.log(level, '성능 측정', {
      operation,
      duration,
      success,
      ...details
    }, 'performance');
  }

  /**
   * 일반 로그 기록
   */
  public log(
    level: LogLevel,
    message: string,
    meta: Record<string, any> = {},
    category?: MonitoringCategory
  ): void {
    const logData = { ...meta };
    if (category) {
      logData.category = category;
    }
    this.logger[level](message, logData);
  }

  /**
   * 현재 시스템 상태 조회
   */
  public getSystemStatus(): Record<string, any> {
    const metrics = this.collectSystemMetrics();
    const modelStats = Array.from(this.modelMetrics.values());
    
    return {
      system: {
        uptime: process.uptime(),
        serverStartTime: new Date(this.startTime).toISOString(),
        currentTime: new Date().toISOString(),
        ...metrics
      },
      models: modelStats,
      environment: this.options.environment
    };
  }

  /**
   * 모니터링 설정 변경
   */
  public updateOptions(options: Partial<MonitoringOptions>): void {
    this.options = { ...this.options, ...options };
    
    // 로거 재초기화
    this.initializeLogger();
    
    // 메트릭 수집 주기 변경시 재시작
    if (options.metricsInterval !== undefined) {
      this.startMetricsCollection();
    }

    this.log('info', '모니터링 설정 업데이트', { 
      updatedOptions: options 
    });
  }
}

// 싱글턴 인스턴스 생성 및 내보내기
const monitoring = new Monitoring();
export { monitoring }; 