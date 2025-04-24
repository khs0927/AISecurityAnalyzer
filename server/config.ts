import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// 모듈 타입 선언을 위한 임시 타입 정의
declare module 'dotenv' {
  export function config(): { parsed?: { [key: string]: string } };
}

// .env 파일 로드
dotenv.config();

/**
 * 애플리케이션 설정 파일
 * 환경 변수와 기본 설정값을 관리합니다.
 */

/**
 * 환경 변수 확인 및 기본값 반환 함수
 * @param key 환경 변수 키
 * @param defaultValue 기본값
 */
function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * 환경 변수 불리언 형식으로 변환
 * @param key 환경 변수 키
 * @param defaultValue 기본값
 */
function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return ['true', 'yes', '1', 'y'].includes(value.toLowerCase());
}

/**
 * 환경 변수 숫자 형식으로 변환
 * @param key 환경 변수 키
 * @param defaultValue 기본값
 */
function getEnvNum(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 환경 설정 객체
 */
export const config = {
  // 서버 설정
  server: {
    port: getEnvNum('PORT', 3000),
    env: getEnv('NODE_ENV', 'development'),
    isDevelopment: getEnv('NODE_ENV', 'development') === 'development',
    isProduction: getEnv('NODE_ENV') === 'production',
    isTest: getEnv('NODE_ENV') === 'test',
    apiPrefix: getEnv('API_PREFIX', '/api'),
    maxBodySize: getEnv('MAX_BODY_SIZE', '50mb'),
    requestTimeout: getEnvNum('REQUEST_TIMEOUT', 300000), // 기본 5분
    corsOrigins: getEnv('CORS_ORIGINS', '*').split(',').map(s => s.trim()).filter(Boolean),
    sessionSecret: getEnv('SESSION_SECRET', 'your-secret-key'),
    sessionMaxAge: getEnvNum('SESSION_MAX_AGE', 86400000), // 기본 1일
  },
  
  // 데이터베이스 설정
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: getEnvNum('DB_PORT', 5432),
    username: getEnv('DB_USERNAME', 'postgres'),
    password: getEnv('DB_PASSWORD', ''),
    database: getEnv('DB_NAME', 'nottoday'),
    schema: getEnv('DB_SCHEMA', 'public'),
    poolMin: getEnvNum('DB_POOL_MIN', 5),
    poolMax: getEnvNum('DB_POOL_MAX', 20),
    debug: getEnvBool('DB_DEBUG', false),
    ssl: getEnvBool('DB_SSL', false),
    connectionString: getEnv('DATABASE_URL', ''),
  },
  
  // 로깅 설정
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    directory: getEnv('LOG_DIR', path.join(process.cwd(), 'logs')),
    filename: getEnv('LOG_FILENAME', 'app-%DATE%.log'),
    consoleOutput: getEnvBool('LOG_CONSOLE', true),
    fileOutput: getEnvBool('LOG_FILE', true),
    maxSize: getEnv('LOG_MAX_SIZE', '20m'),
    maxFiles: getEnvNum('LOG_MAX_FILES', 14),
    prettyPrint: getEnvBool('LOG_PRETTY', true),
    sentry: {
      dsn: getEnv('SENTRY_DSN', ''),
      enabled: getEnvBool('SENTRY_ENABLED', false),
    },
  },
  
  // 보안 설정
  security: {
    jwtSecret: getEnv('JWT_SECRET', 'your-jwt-secret-key'),
    jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '1d'),
    bcryptSaltRounds: getEnvNum('BCRYPT_SALT_ROUNDS', 10),
    rateLimitWindow: getEnvNum('RATE_LIMIT_WINDOW', 15 * 60 * 1000), // 기본 15분
    rateLimitMax: getEnvNum('RATE_LIMIT_MAX', 100), // 15분당 최대 100 요청
    csrfProtection: getEnvBool('CSRF_PROTECTION', true),
    httpOnly: getEnvBool('HTTP_ONLY', true),
    secure: getEnvBool('SECURE_COOKIES', false),
  },
  
  // 파일 업로드 설정
  upload: {
    directory: getEnv('UPLOAD_DIR', path.join(process.cwd(), 'uploads')),
    maxSize: getEnvNum('UPLOAD_MAX_SIZE', 10 * 1024 * 1024), // 기본 10MB
    allowedTypes: getEnv('UPLOAD_ALLOWED_TYPES', '').split(',').filter(Boolean),
    baseUrl: getEnv('UPLOAD_BASE_URL', ''),
  },
  
  // AI 모델 설정
  ai: {
    qwen: {
      modelId: getEnv('QWEN_MODEL_ID', 'Qwen2.5-Omni-7B'),
      endpoint: getEnv('QWEN_ENDPOINT', ''),
      maxTokens: getEnvNum('QWEN_MAX_TOKENS', 1000),
      temperature: getEnvNum('QWEN_TEMPERATURE', 0.7),
      topP: getEnvNum('QWEN_TOP_P', 0.9),
    },
    mmedLlama: {
      modelId: getEnv('MMED_LLAMA_MODEL_ID', 'MMed-Llama-3-8B'),
      endpoint: getEnv('MMED_LLAMA_ENDPOINT', ''),
      maxTokens: getEnvNum('MMED_LLAMA_MAX_TOKENS', 1000),
      temperature: getEnvNum('MMED_LLAMA_TEMPERATURE', 0.5),
    },
    huggingFace: {
      apiKey: getEnv('HF_API_KEY', ''),
      timeout: getEnvNum('HF_TIMEOUT', 60000), // 기본 1분
    },
    openAI: {
      apiKey: getEnv('OPENAI_API_KEY', ''),
      organization: getEnv('OPENAI_ORGANIZATION', ''),
      timeout: getEnvNum('OPENAI_TIMEOUT', 60000), // 기본 1분
    },
    // 추가 AI 서비스 설정
  },
  
  // API 통합 설정
  apis: {
    pubmed: {
      apiKey: getEnv('PUBMED_API_KEY', ''),
      baseUrl: getEnv('PUBMED_BASE_URL', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'),
      defaultResultsLimit: getEnvNum('PUBMED_DEFAULT_LIMIT', 20),
    },
    kaggle: {
      username: getEnv('KAGGLE_USERNAME', ''),
      key: getEnv('KAGGLE_KEY', ''),
    },
    // 추가 API 설정
  },
  
  // 메모리 관리 설정
  memory: {
    gcInterval: getEnvNum('GC_INTERVAL', 3600000), // 기본 1시간
    heapLimit: getEnvNum('HEAP_LIMIT', 0), // 0은 제한 없음
  },
  
  // 스케줄러 설정
  scheduler: {
    enabled: getEnvBool('SCHEDULER_ENABLED', true),
    cleanupInterval: getEnvNum('CLEANUP_INTERVAL', 86400000), // 기본 1일
    tempFilesMaxAge: getEnvNum('TEMP_FILES_MAX_AGE', 7), // 기본 7일
  },
  
  // 웹소켓 설정
  websocket: {
    enabled: getEnvBool('WEBSOCKET_ENABLED', true),
    path: getEnv('WEBSOCKET_PATH', '/socket.io'),
    maxConnections: getEnvNum('WEBSOCKET_MAX_CONNECTIONS', 1000),
    timeout: getEnvNum('WEBSOCKET_TIMEOUT', 30000), // 기본 30초
    cleanupInterval: getEnvNum('WEBSOCKET_CLEANUP_INTERVAL', 3600000), // 기본 1시간
  },
  
  // 모니터링 설정
  monitoring: {
    enabled: getEnvBool('MONITORING_ENABLED', true),
    metricsInterval: getEnvNum('METRICS_INTERVAL', 60000), // 기본 1분
    healthCheck: {
      enabled: getEnvBool('HEALTH_CHECK_ENABLED', true),
      interval: getEnvNum('HEALTH_CHECK_INTERVAL', 60000), // 기본 1분
      endpoint: getEnv('HEALTH_CHECK_ENDPOINT', '/healthz'),
    },
  },
  
  // 캐시 설정
  cache: {
    enabled: getEnvBool('CACHE_ENABLED', true),
    type: getEnv('CACHE_TYPE', 'memory'),
    ttl: getEnvNum('CACHE_TTL', 3600), // 기본 1시간
    maxSize: getEnvNum('CACHE_MAX_SIZE', 100), // 메모리 캐시 최대 항목 수
    redis: {
      host: getEnv('REDIS_HOST', 'localhost'),
      port: getEnvNum('REDIS_PORT', 6379),
      password: getEnv('REDIS_PASSWORD', ''),
      db: getEnvNum('REDIS_DB', 0),
    },
  },
  
  // 이메일 설정
  email: {
    enabled: getEnvBool('EMAIL_ENABLED', false),
    host: getEnv('EMAIL_HOST', ''),
    port: getEnvNum('EMAIL_PORT', 587),
    secure: getEnvBool('EMAIL_SECURE', false),
    auth: {
      user: getEnv('EMAIL_USER', ''),
      pass: getEnv('EMAIL_PASS', ''),
    },
    from: getEnv('EMAIL_FROM', ''),
  },
  
  // 버전 정보
  version: {
    api: getEnv('API_VERSION', '1.0.0'),
    app: getEnv('APP_VERSION', '1.0.0'),
  },
};

/**
 * 설정 초기화 함수 (필요한 디렉토리 생성 등)
 */
export function initializeConfig(): void {
  // 로그 디렉토리 생성
  if (config.logging.fileOutput) {
    if (!fs.existsSync(config.logging.directory)) {
      fs.mkdirSync(config.logging.directory, { recursive: true });
    }
  }
  
  // 업로드 디렉토리 생성
  if (!fs.existsSync(config.upload.directory)) {
    fs.mkdirSync(config.upload.directory, { recursive: true });
  }
  
  // 개발 모드 안내
  if (config.server.isDevelopment) {
    console.log('\x1b[33m%s\x1b[0m', '개발 모드로 실행 중입니다.');
  }
  
  // 중요 설정 누락 경고
  const missingEnvVars = [];
  
  if (!config.security.jwtSecret || config.security.jwtSecret === 'your-jwt-secret-key') {
    missingEnvVars.push('JWT_SECRET');
  }
  
  if (!config.server.sessionSecret || config.server.sessionSecret === 'your-secret-key') {
    missingEnvVars.push('SESSION_SECRET');
  }
  
  if (config.ai.huggingFace.apiKey === '' && !config.server.isTest) {
    missingEnvVars.push('HF_API_KEY');
  }
  
  if (missingEnvVars.length > 0) {
    console.warn('\x1b[31m%s\x1b[0m', `경고: 다음 환경 변수가 설정되지 않았습니다: ${missingEnvVars.join(', ')}`);
  }
}

// 설정 정보 내보내기
export default config; 