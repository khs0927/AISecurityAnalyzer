import axios from 'axios';
import { config } from '../config';
import { monitoring } from '../utils/monitoring';
import { cache } from '../utils/cache';
import { HuggingFaceAPI } from './huggingFaceAPI';

/**
 * 의미적 검색 기능을 위한 옵션
 */
export interface SemanticSearchOptions {
  query: string;
  maxResults?: number;
  threshold?: number;
  fields?: string[];
  filters?: Record<string, any>;
  useCache?: boolean;
  cacheTTL?: number;
}

/**
 * 벡터 데이터베이스 구성 옵션
 */
export interface VectorDBConfig {
  provider: 'pinecone' | 'qdrant' | 'milvus';
  apiKey: string;
  indexName: string;
  namespace?: string;
  dimensions?: number;
  metric?: 'cosine' | 'euclid' | 'dot';
  url?: string;
}

/**
 * 의미적 검색 결과 인터페이스
 */
export interface SemanticSearchResult {
  id: string;
  score: number;
  vector?: number[];
  metadata?: Record<string, any>;
}

/**
 * 의미적 검색 시스템 클래스
 * PubMedBERT 모델을 사용하여 의학 문헌 검색을 위한 벡터 임베딩 생성 및 검색을 처리
 */
export class SemanticSearch {
  private static instance: SemanticSearch;
  private huggingFaceAPI: HuggingFaceAPI;
  private modelId: string;
  private vectorDBConfig: VectorDBConfig;
  private dimensions: number;
  private apiClient: any;

  /**
   * 생성자
   * @private
   */
  private constructor() {
    this.huggingFaceAPI = HuggingFaceAPI.getInstance();
    this.modelId = config.ai.models.semanticSearch || 'pritamdeka/S-PubMedBert-MS-MARCO';
    this.dimensions = 768; // PubMedBERT 차원
    this.vectorDBConfig = {
      provider: (config.vectorDB?.provider || 'pinecone') as 'pinecone' | 'qdrant' | 'milvus',
      apiKey: config.vectorDB?.apiKey || '',
      indexName: config.vectorDB?.indexName || 'medical-research',
      namespace: config.vectorDB?.namespace || 'pubmed',
      dimensions: config.vectorDB?.dimensions || this.dimensions,
      metric: (config.vectorDB?.metric || 'cosine') as 'cosine' | 'euclid' | 'dot'
    };

    this.initVectorDB();
    
    monitoring.log('ai', 'info', `의미적 검색 시스템 초기화 완료: ${this.modelId}`);
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): SemanticSearch {
    if (!SemanticSearch.instance) {
      SemanticSearch.instance = new SemanticSearch();
    }
    return SemanticSearch.instance;
  }

  /**
   * 벡터 데이터베이스 초기화
   * @private
   */
  private initVectorDB(): void {
    if (this.vectorDBConfig.provider === 'pinecone') {
      this.initPinecone();
    } else if (this.vectorDBConfig.provider === 'qdrant') {
      this.initQdrant();
    } else if (this.vectorDBConfig.provider === 'milvus') {
      this.initMilvus();
    } else {
      throw new Error(`지원되지 않는 벡터 데이터베이스 제공자: ${this.vectorDBConfig.provider}`);
    }
  }

  /**
   * Pinecone 벡터 데이터베이스 초기화
   * @private
   */
  private initPinecone(): void {
    // Pinecone REST API 클라이언트 설정
    this.apiClient = axios.create({
      baseURL: 'https://api.pinecone.io',
      headers: {
        'Api-Key': this.vectorDBConfig.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    monitoring.log('ai', 'info', 'Pinecone 벡터 데이터베이스 초기화 완료');
  }

  /**
   * Qdrant 벡터 데이터베이스 초기화
   * @private
   */
  private initQdrant(): void {
    // Qdrant API 설정
    this.apiClient = axios.create({
      baseURL: this.vectorDBConfig.url || 'http://localhost:6333',
      headers: {
        'Api-Key': this.vectorDBConfig.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    monitoring.log('ai', 'info', 'Qdrant 벡터 데이터베이스 초기화 완료');
  }

  /**
   * Milvus 벡터 데이터베이스 초기화
   * @private
   */
  private initMilvus(): void {
    // Milvus API 설정
    this.apiClient = axios.create({
      baseURL: this.vectorDBConfig.url || 'http://localhost:19530',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    monitoring.log('ai', 'info', 'Milvus 벡터 데이터베이스 초기화 완료');
  }

  /**
   * 텍스트에서 벡터 임베딩 생성
   * @param text 임베딩을 생성할 텍스트
   * @returns 임베딩 벡터
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      const cacheKey = `embedding:${this.modelId}:${Buffer.from(text).toString('base64').slice(0, 100)}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        monitoring.log('ai', 'debug', `캐시된 임베딩 사용: ${text.slice(0, 50)}...`);
        return cachedResult;
      }
      
      const result = await this.huggingFaceAPI.getEmbeddings({
        model: this.modelId,
        inputs: text,
        useCache: true
      });
      
      // 결과 캐싱 (1일)
      await cache.set(cacheKey, result[0], { ttl: 86400 });
      
      return result[0];
    } catch (error) {
      monitoring.log('ai', 'error', `임베딩 생성 오류: ${error.message}`);
      throw new Error(`임베딩 생성 실패: ${error.message}`);
    }
  }

  /**
   * 문서를 벡터 데이터베이스에 인덱싱
   * @param id 문서 ID
   * @param text 인덱싱할 텍스트
   * @param metadata 추가 메타데이터
   * @returns 성공 여부
   */
  public async indexDocument(
    id: string,
    text: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const vector = await this.generateEmbedding(text);
      
      if (this.vectorDBConfig.provider === 'pinecone') {
        return this.indexToPinecone(id, vector, metadata);
      } else if (this.vectorDBConfig.provider === 'qdrant') {
        return this.indexToQdrant(id, vector, metadata);
      } else if (this.vectorDBConfig.provider === 'milvus') {
        return this.indexToMilvus(id, vector, metadata);
      }
      
      return false;
    } catch (error) {
      monitoring.log('ai', 'error', `문서 인덱싱 오류: ${error.message}`);
      return false;
    }
  }

  /**
   * Pinecone에 문서 인덱싱
   * @private
   */
  private async indexToPinecone(
    id: string,
    vector: number[],
    metadata: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await this.apiClient.post(
        `/vectors/upsert`,
        {
          vectors: [{
            id,
            values: vector,
            metadata
          }],
          namespace: this.vectorDBConfig.namespace
        }
      );
      
      return response.status === 200;
    } catch (error) {
      monitoring.log('ai', 'error', `Pinecone 인덱싱 오류: ${error.message}`);
      return false;
    }
  }

  /**
   * Qdrant에 문서 인덱싱
   * @private
   */
  private async indexToQdrant(
    id: string,
    vector: number[],
    metadata: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await this.apiClient.put(
        `/collections/${this.vectorDBConfig.indexName}/points`,
        {
          points: [{
            id,
            vector,
            payload: metadata
          }]
        }
      );
      
      return response.status === 200;
    } catch (error) {
      monitoring.log('ai', 'error', `Qdrant 인덱싱 오류: ${error.message}`);
      return false;
    }
  }

  /**
   * Milvus에 문서 인덱싱
   * @private
   */
  private async indexToMilvus(
    id: string,
    vector: number[],
    metadata: Record<string, any>
  ): Promise<boolean> {
    // Milvus 구현
    return false;
  }

  /**
   * 의미적 검색 수행
   * @param options 검색 옵션
   * @returns 검색 결과
   */
  public async search(options: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
    try {
      const {
        query,
        maxResults = 10,
        threshold = 0.7,
        useCache = true,
        cacheTTL = 3600, // 1시간
        filters = {}
      } = options;
      
      // 캐시 처리
      if (useCache) {
        const cacheKey = `semantic_search:${query}:${maxResults}:${threshold}:${JSON.stringify(filters)}`;
        const cachedResult = await cache.get(cacheKey);
        
        if (cachedResult) {
          monitoring.log('ai', 'info', `캐시된 의미적 검색 결과 반환: ${query}`);
          return cachedResult;
        }
      }
      
      // 쿼리 임베딩 생성
      const queryVector = await this.generateEmbedding(query);
      
      // 벡터 검색 수행
      let results: SemanticSearchResult[] = [];
      
      if (this.vectorDBConfig.provider === 'pinecone') {
        results = await this.searchPinecone(queryVector, maxResults, threshold, filters);
      } else if (this.vectorDBConfig.provider === 'qdrant') {
        results = await this.searchQdrant(queryVector, maxResults, threshold, filters);
      } else if (this.vectorDBConfig.provider === 'milvus') {
        results = await this.searchMilvus(queryVector, maxResults, threshold, filters);
      }
      
      // 결과 캐싱
      if (useCache && results.length > 0) {
        const cacheKey = `semantic_search:${query}:${maxResults}:${threshold}:${JSON.stringify(filters)}`;
        await cache.set(cacheKey, results, { ttl: cacheTTL });
      }
      
      return results;
    } catch (error) {
      monitoring.log('ai', 'error', `의미적 검색 오류: ${error.message}`);
      return [];
    }
  }

  /**
   * Pinecone에서 검색 수행
   * @private
   */
  private async searchPinecone(
    queryVector: number[],
    maxResults: number,
    threshold: number,
    filters: Record<string, any>
  ): Promise<SemanticSearchResult[]> {
    try {
      const response = await this.apiClient.post(
        `/query`,
        {
          namespace: this.vectorDBConfig.namespace,
          topK: maxResults,
          vector: queryVector,
          includeMetadata: true,
          includeValues: false,
          filter: Object.keys(filters).length > 0 ? filters : undefined
        }
      );
      
      if (response.status === 200 && response.data.matches) {
        return response.data.matches
          .filter((match: any) => match.score >= threshold)
          .map((match: any) => ({
            id: match.id,
            score: match.score,
            metadata: match.metadata
          }));
      }
      
      return [];
    } catch (error) {
      monitoring.log('ai', 'error', `Pinecone 검색 오류: ${error.message}`);
      return [];
    }
  }

  /**
   * Qdrant에서 검색 수행
   * @private
   */
  private async searchQdrant(
    queryVector: number[],
    maxResults: number,
    threshold: number,
    filters: Record<string, any>
  ): Promise<SemanticSearchResult[]> {
    try {
      const filter = Object.keys(filters).length > 0 ? {
        must: Object.entries(filters).map(([key, value]) => ({
          key,
          match: { value }
        }))
      } : undefined;
      
      const response = await this.apiClient.post(
        `/collections/${this.vectorDBConfig.indexName}/points/search`,
        {
          vector: queryVector,
          limit: maxResults,
          filter,
          with_payload: true
        }
      );
      
      if (response.status === 200 && response.data.result) {
        return response.data.result
          .filter((match: any) => match.score >= threshold)
          .map((match: any) => ({
            id: match.id,
            score: match.score,
            metadata: match.payload
          }));
      }
      
      return [];
    } catch (error) {
      monitoring.log('ai', 'error', `Qdrant 검색 오류: ${error.message}`);
      return [];
    }
  }

  /**
   * Milvus에서 검색 수행
   * @private
   */
  private async searchMilvus(
    queryVector: number[],
    maxResults: number,
    threshold: number,
    filters: Record<string, any>
  ): Promise<SemanticSearchResult[]> {
    // Milvus 구현
    return [];
  }

  /**
   * 인덱스 통계 가져오기
   * @returns 인덱스 통계
   */
  public async getIndexStats(): Promise<Record<string, any>> {
    try {
      if (this.vectorDBConfig.provider === 'pinecone') {
        const response = await this.apiClient.get(
          `/describe_index_stats`,
          {
            params: {
              indexName: this.vectorDBConfig.indexName
            }
          }
        );
        
        if (response.status === 200) {
          return response.data;
        }
      } else if (this.vectorDBConfig.provider === 'qdrant') {
        const response = await this.apiClient.get(
          `/collections/${this.vectorDBConfig.indexName}`
        );
        
        if (response.status === 200) {
          return response.data;
        }
      }
      
      return {};
    } catch (error) {
      monitoring.log('ai', 'error', `인덱스 통계 가져오기 오류: ${error.message}`);
      return {};
    }
  }

  /**
   * 문서 삭제
   * @param id 문서 ID
   * @returns 성공 여부
   */
  public async deleteDocument(id: string): Promise<boolean> {
    try {
      if (this.vectorDBConfig.provider === 'pinecone') {
        const response = await this.apiClient.post(
          `/vectors/delete`,
          {
            ids: [id],
            namespace: this.vectorDBConfig.namespace
          }
        );
        
        return response.status === 200;
      } else if (this.vectorDBConfig.provider === 'qdrant') {
        const response = await this.apiClient.post(
          `/collections/${this.vectorDBConfig.indexName}/points/delete`,
          {
            points: [id]
          }
        );
        
        return response.status === 200;
      }
      
      return false;
    } catch (error) {
      monitoring.log('ai', 'error', `문서 삭제 오류: ${error.message}`);
      return false;
    }
  }
}

export const semanticSearch = SemanticSearch.getInstance(); 