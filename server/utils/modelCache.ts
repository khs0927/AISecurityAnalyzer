import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { monitoringInstance } from '../monitoringInstance';

/**
 * 캐시 항목 인터페이스
 */
interface CacheItem<T> {
  value: T;
  expiresAt: number | null; // null은 만료 없음
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
  size: number; // 대략적인 메모리 크기 (바이트)
}

/**
 * 캐시 상태 인터페이스
 */
interface CacheStatus {
  totalItems: number;
  memoryUsage: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  avgAccessTime: number;
}

/**
 * 모델 캐시 옵션 인터페이스
 */
interface ModelCacheOptions {
  maxItems: number;
  maxMemoryMB: number;
  defaultTTLSeconds: number | null;
  persistPath: string | null;
  loadOnStart: boolean;
  saveOnExit: boolean;
  saveInterval: number | null; // 자동 저장 간격 (밀리초)
  evictionPolicy: 'lru' | 'lfu';
}

/**
 * 모델 캐시 클래스
 * 모델 응답을 캐싱하여 API 호출 최소화
 */
export class ModelCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private options: ModelCacheOptions;
  private memoryUsage = 0; // 바이트 단위
  private hitCount = 0;
  private missCount = 0;
  private totalAccessTime = 0;
  private accessCount = 0;
  private saveTimer: NodeJS.Timeout | null = null;

  // 기본 옵션
  private DEFAULT_OPTIONS: ModelCacheOptions = {
    maxItems: 500,
    maxMemoryMB: 100, // 100MB
    defaultTTLSeconds: 86400, // 24시간
    persistPath: path.join(os.tmpdir(), 'ai-security-analyzer', 'cache'),
    loadOnStart: true,
    saveOnExit: true,
    saveInterval: 5 * 60 * 1000, // 5분
    evictionPolicy: 'lru'
  };

  constructor(options?: Partial<ModelCacheOptions>) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
    this.initialize();
  }

  /**
   * 캐시 초기화
   */
  private initialize(): void {
    // 캐시 디렉토리 생성
    if (this.options.persistPath) {
      try {
        fs.mkdirSync(this.options.persistPath, { recursive: true });
      } catch (error) {
        monitoringInstance.log('error', '캐시 디렉토리 생성 실패', { error });
      }
    }

    // 캐시 데이터 로딩
    if (this.options.loadOnStart && this.options.persistPath) {
      this.loadFromDisk();
    }

    // 주기적 저장 타이머 설정
    if (this.options.saveInterval && this.options.persistPath) {
      this.saveTimer = setInterval(() => {
        this.saveToDisk();
      }, this.options.saveInterval);
    }

    // 프로세스 종료 시 저장
    if (this.options.saveOnExit && this.options.persistPath) {
      process.on('beforeExit', () => this.saveToDisk());
      process.on('SIGINT', () => {
        this.saveToDisk();
        process.exit(0);
      });
    }

    monitoringInstance.log('info', '모델 캐시 초기화 완료', {
      options: this.options
    });
  }

  /**
   * 요청 캐싱 키 생성
   * @param modelId 모델 식별자
   * @param prompt 요청 프롬프트
   * @param params 추가 파라미터
   */
  public generateKey(modelId: string, prompt: string, params?: Record<string, unknown>): string {
    const data = JSON.stringify({
      model: modelId,
      prompt,
      params: params || {}
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 캐시 설정
   */
  public set(key: string, value: T, ttlSeconds?: number | null): void {
    const startTime = Date.now();
    
    // 객체 크기 추정 (바이트)
    const valueSize = this.estimateObjectSize(value);
    
    // TTL 설정
    const ttl = ttlSeconds !== undefined ? ttlSeconds : this.options.defaultTTLSeconds;
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
    
    // 캐시 항목 생성
    const item: CacheItem<T> = {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      size: valueSize
    };
    
    // 캐시 용량 확인 및 정리
    if (this.cache.has(key)) {
      const oldItem = this.cache.get(key)!;
      this.memoryUsage -= oldItem.size;
    } else if (this.cache.size >= this.options.maxItems || 
               this.memoryUsage + valueSize > this.options.maxMemoryMB * 1024 * 1024) {
      this.evictItems(valueSize);
    }
    
    // 캐시에 저장
    this.cache.set(key, item);
    this.memoryUsage += valueSize;
    
    const duration = Date.now() - startTime;
    monitoringInstance.logPerformance('cache_set', duration, true, { key, size: valueSize });
  }

  /**
   * 캐시에서 값 가져오기
   */
  public get(key: string): T | null {
    const startTime = Date.now();
    
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      monitoringInstance.logPerformance('cache_get', Date.now() - startTime, false, { key, hit: false });
      return null;
    }
    
    // 만료 확인
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.memoryUsage -= item.size;
      this.missCount++;
      monitoringInstance.logPerformance('cache_get', Date.now() - startTime, false, { key, hit: false, reason: 'expired' });
      return null;
    }
    
    // 액세스 통계 업데이트
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.hitCount++;
    
    // 성능 통계 업데이트
    const duration = Date.now() - startTime;
    this.totalAccessTime += duration;
    this.accessCount++;
    
    monitoringInstance.logPerformance('cache_get', duration, true, { 
      key, 
      hit: true, 
      accessCount: item.accessCount 
    });
    
    return item.value;
  }

  /**
   * 캐시에서 항목 제거
   */
  public delete(key: string): boolean {
    const item = this.cache.get(key);
    if (item) {
      this.memoryUsage -= item.size;
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * 캐시 완전 삭제
   */
  public clear(): void {
    this.cache.clear();
    this.memoryUsage = 0;
    monitoringInstance.log('info', '캐시 초기화됨');
  }

  /**
   * 캐시 상태 정보 반환
   */
  public getStatus(): CacheStatus {
    return {
      totalItems: this.cache.size,
      memoryUsage: this.memoryUsage,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: this.hitCount / (this.hitCount + this.missCount || 1),
      avgAccessTime: this.totalAccessTime / (this.accessCount || 1)
    };
  }

  /**
   * 캐시를 디스크에 저장
   */
  public saveToDisk(): boolean {
    if (!this.options.persistPath) return false;
    
    try {
      const cachePath = path.join(this.options.persistPath, 'model-cache.json');
      
      // 저장에 필요한 데이터만 추출
      const dataToSave = Array.from(this.cache.entries()).map(([key, item]) => ({
        key,
        value: item.value,
        expiresAt: item.expiresAt,
        accessCount: item.accessCount,
        lastAccessed: item.lastAccessed,
        createdAt: item.createdAt,
        size: item.size
      }));
      
      fs.writeFileSync(cachePath, JSON.stringify(dataToSave), 'utf8');
      
      monitoringInstance.log('info', '캐시 디스크 저장 완료', {
        itemCount: this.cache.size,
        cachePath
      });
      
      return true;
    } catch (error) {
      monitoringInstance.log('error', '캐시 디스크 저장 실패', { error });
      return false;
    }
  }

  /**
   * 디스크에서 캐시 로딩
   */
  public loadFromDisk(): boolean {
    if (!this.options.persistPath) return false;
    
    try {
      const cachePath = path.join(this.options.persistPath, 'model-cache.json');
      
      if (!fs.existsSync(cachePath)) {
        monitoringInstance.log('info', '캐시 파일이 존재하지 않음', { cachePath });
        return false;
      }
      
      const data = fs.readFileSync(cachePath, 'utf8');
      const cacheData = JSON.parse(data) as Array<{
        key: string,
        value: T,
        expiresAt: number | null,
        accessCount: number,
        lastAccessed: number,
        createdAt: number,
        size: number
      }>;
      
      // 캐시 초기화
      this.cache.clear();
      this.memoryUsage = 0;
      
      // 유효한 항목만 로드
      let loadedCount = 0;
      let expiredCount = 0;
      
      for (const entry of cacheData) {
        // 만료된 항목은 로드하지 않음
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          expiredCount++;
          continue;
        }
        
        this.cache.set(entry.key, {
          value: entry.value,
          expiresAt: entry.expiresAt,
          accessCount: entry.accessCount,
          lastAccessed: entry.lastAccessed,
          createdAt: entry.createdAt,
          size: entry.size
        });
        
        this.memoryUsage += entry.size;
        loadedCount++;
      }
      
      monitoringInstance.log('info', '캐시 디스크 로딩 완료', {
        loaded: loadedCount,
        expired: expiredCount,
        totalMemory: this.memoryUsage
      });
      
      return true;
    } catch (error) {
      monitoringInstance.log('error', '캐시 디스크 로딩 실패', { error });
      return false;
    }
  }

  /**
   * 캐시 정리 (LRU 또는 LFU)
   */
  private evictItems(requiredSpace: number = 0): void {
    if (this.cache.size === 0) return;
    
    const policy = this.options.evictionPolicy;
    let evictedCount = 0;
    let evictedBytes = 0;
    
    // 정렬된 항목 배열 생성 (정책에 따라)
    let items = Array.from(this.cache.entries()).map(([key, item]) => ({ key, item }));
    
    if (policy === 'lru') {
      // 마지막 접근 시간 기준 정렬
      items.sort((a, b) => a.item.lastAccessed - b.item.lastAccessed);
    } else {
      // 접근 빈도 기준 정렬
      items.sort((a, b) => a.item.accessCount - b.item.accessCount);
    }
    
    // 필요한 공간이 확보될 때까지 또는 캐시 크기가 적절해질 때까지 항목 제거
    for (const { key, item } of items) {
      this.cache.delete(key);
      evictedBytes += item.size;
      this.memoryUsage -= item.size;
      evictedCount++;
      
      // 필요한 공간이 확보되었고 캐시 크기가 적절해졌는지 확인
      if (
        evictedBytes >= requiredSpace &&
        this.cache.size <= this.options.maxItems * 0.8 &&
        this.memoryUsage <= this.options.maxMemoryMB * 1024 * 1024 * 0.8
      ) {
        break;
      }
    }
    
    monitoringInstance.log('info', '캐시 정리 수행됨', {
      policy,
      evictedItems: evictedCount,
      evictedBytes,
      remainingItems: this.cache.size,
      remainingBytes: this.memoryUsage
    });
  }

  /**
   * 객체 크기 추정 (바이트)
   */
  private estimateObjectSize(obj: unknown): number {
    const jsonString = JSON.stringify(obj);
    return Buffer.byteLength(jsonString, 'utf8');
  }

  /**
   * 클래스 정리
   */
  public dispose(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    
    if (this.options.saveOnExit && this.options.persistPath) {
      this.saveToDisk();
    }
    
    this.cache.clear();
    this.memoryUsage = 0;
    monitoringInstance.log('info', '모델 캐시 리소스 해제됨');
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const modelCache = new ModelCache();
export default modelCache;