import dotenv from 'dotenv';
import path from 'path';

// 환경 변수 로드
dotenv.config();

// 설정 객체
export const config = {
  // 서버 설정
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },
  
  // 데이터베이스 설정
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'medical_research',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    maxPoolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
    schema: process.env.DB_SCHEMA || 'public'
  },
  
  // API 키 및 인증 정보
  apiKeys: {
    pubmed: process.env.PUBMED_API_KEY,
    kaggle: {
      username: process.env.KAGGLE_USERNAME || '',
      key: process.env.KAGGLE_KEY || '',
    }
  },
  
  // 캐시 설정
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL || '3600'), // 기본 1시간
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100'), // 메가바이트
  },
  
  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || path.join(__dirname, '../logs')
  },
  
  // 검색 관련 설정
  search: {
    maxResults: parseInt(process.env.MAX_SEARCH_RESULTS || '25'),
    defaultBatchSize: parseInt(process.env.DEFAULT_BATCH_SIZE || '10'),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000') // 30초
  },
  
  // 데이터 처리 관련 설정
  dataProcessing: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '100'),
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '3'),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.RETRY_DELAY || '1000'), // 1초
  }
};

// 환경 변수 유효성 검사
export function validateConfig(): boolean {
  // 필수 설정 확인
  const requiredConfigs = [
    { name: 'DATABASE_URL', value: config.database.url }
  ];

  let isValid = true;
  const missingConfigs: string[] = [];

  requiredConfigs.forEach(cfg => {
    if (!cfg.value) {
      isValid = false;
      missingConfigs.push(cfg.name);
    }
  });

  if (!isValid) {
    console.error(`다음 환경 변수가 설정되지 않았습니다: ${missingConfigs.join(', ')}`);
  }

  return isValid;
} 