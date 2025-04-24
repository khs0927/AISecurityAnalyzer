import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { ModelCache } from '../../server/utils/modelCache';

describe('ModelCache', () => {
  let cache: ModelCache<any>;
  const tempDir = path.join(__dirname, '../temp-cache');
  
  // 각 테스트 전에 새 캐시 인스턴스 생성
  beforeEach(() => {
    // 테스트용 임시 디렉토리 생성
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 테스트용 캐시 설정
    cache = new ModelCache({
      maxItems: 10,
      maxMemoryMB: 10,
      defaultTTLSeconds: 60,
      persistPath: tempDir,
      loadOnStart: false,
      saveOnExit: false,
      saveInterval: null
    });
  });
  
  // 각 테스트 후 정리
  afterEach(() => {
    // 캐시 정리
    cache.dispose();
    
    // 임시 파일 삭제
    const cacheFile = path.join(tempDir, 'model-cache.json');
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  });
  
  // 모든 테스트 후 정리
  after(() => {
    // 임시 디렉토리 삭제
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  describe('기본 캐시 기능', () => {
    it('데이터를 캐시에 저장하고 검색할 수 있어야 함', () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      
      cache.set(key, value);
      const result = cache.get(key);
      
      expect(result).to.deep.equal(value);
    });
    
    it('존재하지 않는 키에 대해 null을 반환해야 함', () => {
      const result = cache.get('non-existent-key');
      expect(result).to.be.null;
    });
    
    it('만료된 항목은 null을 반환해야 함', () => {
      const key = 'expiring-key';
      const value = { data: 'will-expire' };
      
      // 1초 후 만료되는 항목 저장
      cache.set(key, value, 1);
      
      // 바로 접근하면 데이터가 있어야 함
      expect(cache.get(key)).to.deep.equal(value);
      
      // 2초 후에는 만료되어야 함
      return new Promise(resolve => {
        setTimeout(() => {
          expect(cache.get(key)).to.be.null;
          resolve(true);
        }, 2000);
      });
    });
    
    it('캐시에서 항목을 삭제할 수 있어야 함', () => {
      const key = 'delete-key';
      const value = { data: 'to-be-deleted' };
      
      cache.set(key, value);
      expect(cache.get(key)).to.deep.equal(value);
      
      const result = cache.delete(key);
      expect(result).to.be.true;
      expect(cache.get(key)).to.be.null;
    });
    
    it('캐시를 완전히 비울 수 있어야 함', () => {
      // 여러 항목 추가
      for (let i = 0; i < 5; i++) {
        cache.set(`key-${i}`, { data: `value-${i}` });
      }
      
      // 캐시 상태 확인
      let status = cache.getStatus();
      expect(status.totalItems).to.equal(5);
      
      // 캐시 비우기
      cache.clear();
      
      // 비워진 캐시 상태 확인
      status = cache.getStatus();
      expect(status.totalItems).to.equal(0);
      
      // 모든 항목이 접근 불가능해야 함
      for (let i = 0; i < 5; i++) {
        expect(cache.get(`key-${i}`)).to.be.null;
      }
    });
  });
  
  describe('캐시 키 생성', () => {
    it('모델 ID, 프롬프트, 파라미터를 기반으로 일관된 해시 키를 생성해야 함', () => {
      const modelId = 'test-model';
      const prompt = 'test prompt';
      const params = { temperature: 0.7 };
      
      const key1 = cache.generateKey(modelId, prompt, params);
      const key2 = cache.generateKey(modelId, prompt, params);
      
      expect(key1).to.equal(key2);
      expect(key1).to.be.a('string');
      expect(key1.length).to.be.greaterThan(0);
    });
    
    it('다른 입력에 대해 다른 키를 생성해야 함', () => {
      const key1 = cache.generateKey('model1', 'prompt1', { temp: 0.5 });
      const key2 = cache.generateKey('model1', 'prompt2', { temp: 0.5 });
      const key3 = cache.generateKey('model2', 'prompt1', { temp: 0.5 });
      const key4 = cache.generateKey('model1', 'prompt1', { temp: 0.7 });
      
      expect(key1).to.not.equal(key2);
      expect(key1).to.not.equal(key3);
      expect(key1).to.not.equal(key4);
    });
  });
  
  describe('캐시 정책', () => {
    it('캐시 크기가 제한에 도달하면 항목을 제거해야 함', async () => {
      // 캐시 사이즈 제한이 10인 상태에서 15개 항목 추가
      for (let i = 0; i < 15; i++) {
        cache.set(`key-${i}`, { data: `value-${i}`, largeData: 'x'.repeat(1000) });
      }
      
      // 캐시 상태 확인 - 일부 항목이 제거되어야 함
      const status = cache.getStatus();
      expect(status.totalItems).to.be.lessThan(15);
      
      // 가장 최근에 추가한 항목은 캐시에 있어야 함
      expect(cache.get('key-14')).to.not.be.null;
    });
  });
  
  describe('캐시 영속성', () => {
    it('캐시를 디스크에 저장하고 로드할 수 있어야 함', () => {
      // 데이터 추가
      for (let i = 0; i < 5; i++) {
        cache.set(`persist-key-${i}`, { data: `persist-value-${i}` });
      }
      
      // 디스크에 저장
      const saveResult = cache.saveToDisk();
      expect(saveResult).to.be.true;
      
      // 새 캐시 인스턴스 생성
      const newCache = new ModelCache({
        maxItems: 10,
        maxMemoryMB: 10,
        defaultTTLSeconds: 60,
        persistPath: tempDir,
        loadOnStart: false,
        saveOnExit: false
      });
      
      // 디스크에서 로드
      const loadResult = newCache.loadFromDisk();
      expect(loadResult).to.be.true;
      
      // 로드된 데이터 확인
      for (let i = 0; i < 5; i++) {
        const value = newCache.get(`persist-key-${i}`);
        expect(value).to.deep.equal({ data: `persist-value-${i}` });
      }
      
      // 정리
      newCache.dispose();
    });
  });
  
  describe('캐시 통계', () => {
    it('정확한 캐시 통계를 반환해야 함', () => {
      // 몇 개의 항목 추가
      cache.set('stats-key-1', { data: 'stats-value-1' });
      cache.set('stats-key-2', { data: 'stats-value-2' });
      
      // 히트 생성
      cache.get('stats-key-1');
      cache.get('stats-key-1');
      cache.get('stats-key-2');
      
      // 미스 생성
      cache.get('non-existent-key');
      
      // 통계 확인
      const stats = cache.getStatus();
      expect(stats.totalItems).to.equal(2);
      expect(stats.hitCount).to.equal(3);
      expect(stats.missCount).to.equal(1);
      expect(stats.hitRate).to.be.closeTo(0.75, 0.01);
    });
  });
}); 