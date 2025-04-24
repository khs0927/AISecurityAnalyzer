import { createClient, RedisClientType } from 'redis';
import { monitoring } from './monitoring';
import { config } from '../config';

/**
 * 캐시 관련 타입 정의
 */
interface CacheOptions {
  ttl?: number;
  // Redis 특정 옵션들
  useRedis?: boolean;
  // 메모리 캐시 관련 옵션들
  maxSize?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  size: number;
  type: string;
}

/**
 * 캐시 항목 타입
 */
interface CacheItem<T> {
  value: T;
  expiry: number;
}

/**
 * 캐시 시스템 관리 클래스
 */
export class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, CacheItem<any>> = new Map();
  private redisClient: RedisClientType | null = null;
  private isRedisReady: boolean = false;
  private defaultTTL: number;
  private maxSize: number;
  private useRedis: boolean;
  private cacheEnabled: boolean;
  private stats = {
    hits: 0,
    misses: 0
  };
  
  private constructor() {
    this.defaultTTL = config.cache.ttl;
    this.maxSize = config.cache.maxSize;
    this.useRedis = config.cache.type === 'redis';
    this.cacheEnabled = config.cache.enabled;
    
    if (this.useRedis && this.cacheEnabled) {
      this.initRedis();
    }
    
    // 캐시 정리 인터벌 설정
    setInterval(() => this.cleanupExpiredItems(), 60000); // 1분마다 정리
  }
  
  /**
   * CacheManager 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  
  /**
   * Redis 클라이언트를 초기화합니다
   */
  private async initRedis(): Promise<void> {
    try {
      const redisConfig = config.cache.redis;
      
      this.redisClient = createClient({
        socket: {
          host: redisConfig.host,
          port: redisConfig.port
        },
        password: redisConfig.password || undefined,
        database: redisConfig.db
      });
      
      this.redisClient.on('error', (err) => {
        this.isRedisReady = false;
        monitoring.log('cache', 'error', `Redis 연결 오류: ${err.message}`);
      });
      
      this.redisClient.on('connect', () => {
        this.isRedisReady = true;
        monitoring.log('cache', 'info', 'Redis 서버에 연결되었습니다.');
      });
      
      await this.redisClient.connect();
    } catch (error) {
      monitoring.log('cache', 'error', `Redis 초기화 오류: ${error.message}`);
      this.useRedis = false;
    }
  }
  
  /**
   * 캐시에 항목을 설정합니다
   * @param key 캐시 키
   * @param value 캐시 값
   * @param options 캐시 옵션
   */
  public async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.cacheEnabled) {
      return false;
    }
    
    const ttl = options.ttl || this.defaultTTL;
    const useRedis = options.useRedis !== undefined ? options.useRedis : this.useRedis;
    
    try {
      if (useRedis && this.isRedisReady && this.redisClient) {
        // Redis 캐시 사용
        await this.redisClient.set(key, JSON.stringify(value), { EX: ttl });
        monitoring.log('cache', 'debug', `Redis 캐시에 설정: ${key}`);
        return true;
      } else {
        // 메모리 캐시 사용
        this.checkMemoryCacheSize();
        
        const expiry = Date.now() + (ttl * 1000);
        this.memoryCache.set(key, { value, expiry });
        
        monitoring.log('cache', 'debug', `메모리 캐시에 설정: ${key}`);
        return true;
      }
    } catch (error) {
      monitoring.log('cache', 'error', `캐시 설정 오류: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 캐시에서 항목을 가져옵니다
   * @param key 캐시 키
   * @param options 캐시 옵션
   */
  public async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.cacheEnabled) {
      this.stats.misses++;
      return null;
    }
    
    const useRedis = options.useRedis !== undefined ? options.useRedis : this.useRedis;
    
    try {
      if (useRedis && this.isRedisReady && this.redisClient) {
        // Redis 캐시에서 조회
        const data = await this.redisClient.get(key);
        
        if (data) {
          this.stats.hits++;
          monitoring.log('cache', 'debug', `Redis 캐시 히트: ${key}`);
          return JSON.parse(data) as T;
        }
      } else {
        // 메모리 캐시에서 조회
        const item = this.memoryCache.get(key);
        
        if (item && item.expiry > Date.now()) {
          this.stats.hits++;
          monitoring.log('cache', 'debug', `메모리 캐시 히트: ${key}`);
          return item.value as T;
        } else if (item) {
          // 만료된 항목 제거
          this.memoryCache.delete(key);
        }
      }
      
      this.stats.misses++;
      monitoring.log('cache', 'debug', `캐시 미스: ${key}`);
      return null;
    } catch (error) {
      monitoring.log('cache', 'error', `캐시 조회 오류: ${error.message}`);
      this.stats.misses++;
      return null;
    }
  }
  
  /**
   * 캐시에서 항목을 삭제합니다
   * @param key 캐시 키
   * @param options 캐시 옵션
   */
  public async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.cacheEnabled) {
      return false;
    }
    
    const useRedis = options.useRedis !== undefined ? options.useRedis : this.useRedis;
    
    try {
      let success = false;
      
      if (useRedis && this.isRedisReady && this.redisClient) {
        // Redis 캐시에서 삭제
        const result = await this.redisClient.del(key);
        success = result > 0;
      }
      
      // 메모리 캐시에서도 항상 삭제 (일관성 유지)
      const memoryDeleted = this.memoryCache.delete(key);
      success = success || memoryDeleted;
      
      if (success) {
        monitoring.log('cache', 'debug', `캐시에서 삭제: ${key}`);
      }
      
      return success;
    } catch (error) {
      monitoring.log('cache', 'error', `캐시 삭제 오류: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 패턴과 일치하는 모든 캐시 키를 삭제합니다
   * @param pattern 삭제할 키 패턴 (정규식)
   * @param options 캐시 옵션
   */
  public async deleteByPattern(pattern: string | RegExp, options: CacheOptions = {}): Promise<number> {
    if (!this.cacheEnabled) {
      return 0;
    }
    
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    const useRedis = options.useRedis !== undefined ? options.useRedis : this.useRedis;
    let count = 0;
    
    try {
      // 메모리 캐시에서 삭제
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          count++;
        }
      }
      
      // Redis 캐시에서 삭제 (가능하다면)
      if (useRedis && this.isRedisReady && this.redisClient) {
        // Redis의 SCAN 명령어로 패턴과 일치하는 키를 찾아 삭제
        // 이 부분은 실제 Redis 클라이언트의 구현에 따라 달라질 수 있음
        monitoring.log('cache', 'warn', 'Redis 패턴 삭제 기능은 현재 구현되지 않았습니다');
      }
      
      if (count > 0) {
        monitoring.log('cache', 'info', `패턴 '${pattern}'과 일치하는 ${count}개 캐시 항목 삭제`);
      }
      
      return count;
    } catch (error) {
      monitoring.log('cache', 'error', `패턴 삭제 오류: ${error.message}`);
      return count;
    }
  }
  
  /**
   * 캐시를 완전히 비웁니다
   * @param options 캐시 옵션
   */
  public async clear(options: CacheOptions = {}): Promise<boolean> {
    if (!this.cacheEnabled) {
      return false;
    }
    
    const useRedis = options.useRedis !== undefined ? options.useRedis : this.useRedis;
    
    try {
      // 메모리 캐시 비우기
      this.memoryCache.clear();
      
      // Redis 캐시 비우기 (가능하다면)
      if (useRedis && this.isRedisReady && this.redisClient) {
        await this.redisClient.flushDb();
      }
      
      monitoring.log('cache', 'info', '캐시를 비웠습니다');
      return true;
    } catch (error) {
      monitoring.log('cache', 'error', `캐시 비우기 오류: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 만료된 캐시 항목을 정리합니다
   */
  private cleanupExpiredItems(): void {
    if (!this.cacheEnabled || this.memoryCache.size === 0) {
      return;
    }
    
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiry <= now) {
        this.memoryCache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      monitoring.log('cache', 'debug', `${expiredCount}개의 만료된 캐시 항목을 제거했습니다`);
    }
  }
  
  /**
   * 메모리 캐시 크기를 확인하고 제한을 초과하면 가장 오래된 항목 제거
   */
  private checkMemoryCacheSize(): void {
    if (this.memoryCache.size >= this.maxSize) {
      let oldestKey: string | null = null;
      let oldestExpiry = Infinity;
      
      for (const [key, item] of this.memoryCache.entries()) {
        if (item.expiry < oldestExpiry) {
          oldestExpiry = item.expiry;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        monitoring.log('cache', 'debug', `가장 오래된 캐시 항목 제거: ${oldestKey}`);
      }
    }
  }
  
  /**
   * 캐시 항목 존재 여부를 확인합니다
   * @param key 캐시 키
   * @param options 캐시 옵션
   */
  public async has(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.cacheEnabled) {
      return false;
    }
    
    const useRedis = options.useRedis !== undefined ? options.useRedis : this.useRedis;
    
    try {
      if (useRedis && this.isRedisReady && this.redisClient) {
        // Redis 캐시에서 확인
        const exists = await this.redisClient.exists(key);
        return exists > 0;
      } else {
        // 메모리 캐시에서 확인
        const item = this.memoryCache.get(key);
        return !!item && item.expiry > Date.now();
      }
    } catch (error) {
      monitoring.log('cache', 'error', `캐시 확인 오류: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 캐시 항목의 TTL을 업데이트합니다
   * @param key 캐시 키
   * @param ttl 새로운 TTL (초)
   * @param options 캐시 옵션
   */
  public async updateTTL(key: string, ttl: number, options: CacheOptions = {}): Promise<boolean> {
    if (!this.cacheEnabled) {
      return false;
    }
    
    const useRedis = options.useRedis !== undefined ? options.useRedis : this.useRedis;
    
    try {
      if (useRedis && this.isRedisReady && this.redisClient) {
        // Redis 캐시에서 TTL 업데이트
        const exists = await this.redisClient.exists(key);
        if (exists) {
          await this.redisClient.expire(key, ttl);
          return true;
        }
        return false;
      } else {
        // 메모리 캐시에서 TTL 업데이트
        const item = this.memoryCache.get(key);
        if (item && item.expiry > Date.now()) {
          item.expiry = Date.now() + (ttl * 1000);
          this.memoryCache.set(key, item);
          return true;
        }
        return false;
      }
    } catch (error) {
      monitoring.log('cache', 'error', `캐시 TTL 업데이트 오류: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 캐시 통계를 반환합니다
   */
  public getStats(): CacheStats {
    const cacheType = this.useRedis && this.isRedisReady ? 'redis' : 'memory';
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.memoryCache.size,
      size: this.getMemoryCacheSize(),
      type: cacheType
    };
  }
  
  /**
   * 메모리 캐시의 메모리 사용량을 대략적으로 계산합니다 (바이트)
   */
  private getMemoryCacheSize(): number {
    if (this.memoryCache.size === 0) {
      return 0;
    }
    
    let size = 0;
    
    for (const [key, item] of this.memoryCache.entries()) {
      // 문자열 크기 측정
      if (typeof key === 'string') {
        size += key.length * 2; // UTF-16 문자열은 문자당 2바이트
      }
      
      // 값 크기 측정 (간단한 추정)
      try {
        const json = JSON.stringify(item.value);
        size += json.length * 2;
      } catch (e) {
        // JSON으로 변환할 수 없는 경우 대략적인 크기 할당
        size += 1024;
      }
      
      // 숫자형 만료 시간 (8바이트)
      size += 8;
    }
    
    return size;
  }
  
  /**
   * Redis 연결 상태를 확인합니다
   */
  public isRedisConnected(): boolean {
    return this.isRedisReady;
  }
  
  /**
   * Redis 연결을 닫습니다
   */
  public async closeRedisConnection(): Promise<void> {
    if (this.redisClient && this.isRedisReady) {
      await this.redisClient.quit();
      this.isRedisReady = false;
      monitoring.log('cache', 'info', 'Redis 연결을 닫았습니다');
    }
  }
}

// 싱글톤 인스턴스 생성
export const cache = CacheManager.getInstance(); 