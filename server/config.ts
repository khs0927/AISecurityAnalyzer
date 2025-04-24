import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// 모듈 타입 선언을 위한 임시 타입 정의
declare module 'dotenv' {
  export function config(): { parsed?: { [key: string]: string } };
}

// .env 파일 로드
dotenv.config();

// ESM에서 __dirname 사용하기 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerConfig {
  port: number;
  env: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  apiPrefix: string;
  maxBodySize: string;
  requestTimeout: number;
  corsOrigins: string[];
  sessionSecret: string;
  sessionMaxAge: number;
  uploadDir: string;
  logsDir: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptSaltRounds: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  csrfProtection: boolean;
  httpOnly: boolean;
  secure: boolean;
  mongoUri: string;
  dbName: string;
}

interface ClientConfig {
  apiUrl: string;
  wsUrl: string;
  assetsUrl: string;
}

export interface AppConfig {
  server: ServerConfig;
  client: ClientConfig;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    schema: string;
    poolMin: number;
    poolMax: number;
    debug: boolean;
    ssl: boolean;
    connectionString: string;
  };
  logging: {
    level: string;
    directory: string;
    filename: string;
    consoleOutput: boolean;
    fileOutput: boolean;
    maxSize: string;
    maxFiles: number;
    prettyPrint: boolean;
    sentry: {
      dsn: string;
      enabled: boolean;
    };
  };
  memory: {
    gcInterval: number;
    heapLimit: number;
  };
  scheduler: {
    enabled: boolean;
    cleanupInterval: number;
    tempFilesMaxAge: number;
  };
  websocket: {
    enabled: boolean;
    path: string;
    maxConnections: number;
    timeout: number;
    cleanupInterval: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    healthCheck: {
      enabled: boolean;
      interval: number;
      endpoint: string;
    };
  };
  cache: {
    enabled: boolean;
    type: string;
    ttl: number;
    maxSize: number;
    redis: {
      host: string;
      port: number;
      password: string;
      db: number;
    };
  };
  email: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    from: string;
  };
  version: {
    api: string;
    app: string;
  };
}

// 기본 설정값
const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    apiPrefix: process.env.API_PREFIX || '/api',
    maxBodySize: process.env.MAX_BODY_SIZE || '50mb',
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '300000', 10),
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : [],
    sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
    uploadDir: path.join(__dirname, '../uploads'),
    logsDir: path.join(__dirname, '../logs'),
    jwtSecret: process.env.JWT_SECRET || 'your-default-jwt-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    csrfProtection: process.env.CSRF_PROTECTION === 'true',
    httpOnly: process.env.HTTP_ONLY === 'true',
    secure: process.env.SECURE_COOKIES === 'true',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.DB_NAME || 'nottoday'
  },
  client: {
    apiUrl: process.env.API_URL || 'http://localhost:3000/api',
    wsUrl: process.env.WS_URL || 'ws://localhost:3000',
    assetsUrl: process.env.ASSETS_URL || 'http://localhost:3000/assets'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nottoday',
    schema: process.env.DB_SCHEMA || 'public',
    poolMin: parseInt(process.env.DB_POOL_MIN || '5', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
    debug: process.env.DB_DEBUG === 'true',
    ssl: process.env.DB_SSL === 'true',
    connectionString: process.env.DATABASE_URL || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
    filename: process.env.LOG_FILENAME || 'app-%DATE%.log',
    consoleOutput: process.env.LOG_CONSOLE === 'true',
    fileOutput: process.env.LOG_FILE === 'true',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '14', 10),
    prettyPrint: process.env.LOG_PRETTY === 'true',
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      enabled: process.env.SENTRY_ENABLED === 'true',
    },
  },
  memory: {
    gcInterval: parseInt(process.env.GC_INTERVAL || '3600000', 10),
    heapLimit: parseInt(process.env.HEAP_LIMIT || '0', 10),
  },
  scheduler: {
    enabled: process.env.SCHEDULER_ENABLED === 'true',
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '86400000', 10),
    tempFilesMaxAge: parseInt(process.env.TEMP_FILES_MAX_AGE || '7', 10),
  },
  websocket: {
    enabled: process.env.WEBSOCKET_ENABLED === 'true',
    path: process.env.WEBSOCKET_PATH || '/socket.io',
    maxConnections: parseInt(process.env.WEBSOCKET_MAX_CONNECTIONS || '1000', 10),
    timeout: parseInt(process.env.WEBSOCKET_TIMEOUT || '30000', 10),
    cleanupInterval: parseInt(process.env.WEBSOCKET_CLEANUP_INTERVAL || '3600000', 10),
  },
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metricsInterval: parseInt(process.env.METRICS_INTERVAL || '60000', 10),
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000', 10),
      endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/healthz',
    },
  },
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    type: process.env.CACHE_TYPE || 'memory',
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100', 10),
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
  },
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
    from: process.env.EMAIL_FROM || '',
  },
  version: {
    api: process.env.API_VERSION || '1.0.0',
    app: process.env.APP_VERSION || '1.0.0',
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
  if (!fs.existsSync(config.server.uploadDir)) {
    fs.mkdirSync(config.server.uploadDir, { recursive: true });
  }
  
  // 개발 모드 안내
  if (config.server.isDevelopment) {
    console.log('\x1b[33m%s\x1b[0m', '개발 모드로 실행 중입니다.');
  }
  
  // 보안 경고
  if (config.server.isProduction && config.server.jwtSecret === 'your-default-jwt-secret-change-in-production') {
    console.warn('경고: 프로덕션 환경에서 기본 JWT 시크릿을 사용하고 있습니다. JWT_SECRET 환경 변수를 설정하세요.');
  }
}

// 설정 정보 내보내기
export default config; 