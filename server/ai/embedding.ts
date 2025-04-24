import axios from 'axios';
import { monitoring } from '../utils/monitoring';
import { config } from '../config';
import { cache } from '../utils/cache';

/**
 * 임베딩 생성 옵션 인터페이스
 */
export interface EmbeddingOptions {
  text: string | string[];
  model?: string;
  dimensions?: number;
  useCache?: boolean;
  cacheTTL?: number;
}

/**
 * 임베딩 결과 인터페이스
 */
export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  tokenCount?: number;
}

/**
 * 텍스트 임베딩 생성 클래스
 */
export class EmbeddingService {
  private static instance: EmbeddingService;
  private apiEndpoint: string;
  private apiKey: string;
  private defaultModel: string;
  private modelDimensions: Map<string, number>;
  
  /**
   * 생성자
   * @private
   */
  private constructor() {
    this.apiEndpoint = config.ai.embedding?.apiEndpoint || 'https://api.huggingface.co/models';
    this.apiKey = config.ai.huggingFace?.apiKey || '';
    this.defaultModel = config.ai.embedding?.model || 'sentence-transformers/all-MiniLM-L6-v2';
    
    // 모델별 임베딩 차원 매핑
    this.modelDimensions = new Map<string, number>([
      ['sentence-transformers/all-MiniLM-L6-v2', 384],
      ['sentence-transformers/all-mpnet-base-v2', 768],
      ['sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', 384],
      ['pritamdeka/S-PubMedBert-MS-MARCO', 768],
      ['microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext', 768],
      ['NeuML/pubmedbert-base-embeddings', 768]
    ]);
    
    monitoring.log('ai', 'info', `임베딩 서비스 초기화 완료 (기본 모델: ${this.defaultModel})`);
  }
  
  /**
   * EmbeddingService 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }
  
  /**
   * 텍스트에서 임베딩 벡터를 생성합니다
   * @param options 임베딩 생성 옵션
   * @returns 임베딩 결과
   */
  public async generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResult> {
    try {
      const {
        text,
        model = this.defaultModel,
        useCache = true,
        cacheTTL = 86400 // 기본 1일 캐싱
      } = options;
      
      // 빈 텍스트 체크
      if (
        (!text) || 
        (typeof text === 'string' && text.trim() === '') || 
        (Array.isArray(text) && (text.length === 0 || text.every(t => t.trim() === '')))
      ) {
        const dimensions = this.getDimensions(model);
        return {
          embedding: new Array(dimensions).fill(0),
          dimensions,
          model
        };
      }
      
      // 캐시 처리
      if (useCache) {
        const textValue = Array.isArray(text) ? text.join(' ').slice(0, 500) : text.slice(0, 500);
        const cacheKey = `embedding:${model}:${Buffer.from(textValue).toString('base64')}`;
        const cachedResult = await cache.get<EmbeddingResult>(cacheKey);
        
        if (cachedResult) {
          monitoring.log('ai', 'debug', `캐시된 임베딩 결과 사용: ${textValue.slice(0, 50)}...`);
          return cachedResult;
        }
      }
      
      // 임베딩 API 요청 준비
      const embedUrl = `${this.apiEndpoint}/${encodeURIComponent(model)}/feature-extraction`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
      };
      
      // API 요청
      const response = await axios.post(
        embedUrl,
        { inputs: text, normalize: true },
        { headers }
      );
      
      // 응답 처리
      let embedding: number[] = [];
      let tokenCount: number | undefined;
      
      if (response.status === 200) {
        if (Array.isArray(response.data)) {
          if (Array.isArray(text)) {
            // 다중 텍스트 임베딩 결과의 평균
            embedding = this.averageEmbeddings(response.data);
          } else {
            // 단일 텍스트, 다중 레이어 결과의 경우 - 마지막 레이어 사용
            embedding = response.data[0];
          }
        } else if (response.data.embeddings) {
          embedding = response.data.embeddings;
          tokenCount = response.data.token_count;
        } else {
          embedding = response.data;
        }
      } else {
        throw new Error(`임베딩 API 오류: ${response.status} ${response.statusText}`);
      }
      
      // 차원 정보 확인
      const dimensions = embedding.length || this.getDimensions(model);
      
      // 결과 객체 생성
      const result: EmbeddingResult = {
        embedding,
        dimensions,
        model,
        tokenCount
      };
      
      // 결과 캐싱
      if (useCache) {
        const textValue = Array.isArray(text) ? text.join(' ').slice(0, 500) : text.slice(0, 500);
        const cacheKey = `embedding:${model}:${Buffer.from(textValue).toString('base64')}`;
        await cache.set(cacheKey, result, { ttl: cacheTTL });
      }
      
      return result;
    } catch (error) {
      monitoring.log('ai', 'error', `임베딩 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 다중 텍스트 임베딩의 평균을 계산합니다
   * @private
   */
  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      return [];
    }
    
    if (embeddings.length === 1) {
      return embeddings[0];
    }
    
    const dimension = embeddings[0].length;
    const result = new Array(dimension).fill(0);
    
    for (const embedding of embeddings) {
      for (let i = 0; i < dimension; i++) {
        result[i] += embedding[i];
      }
    }
    
    for (let i = 0; i < dimension; i++) {
      result[i] /= embeddings.length;
    }
    
    return result;
  }
  
  /**
   * 두 임베딩 벡터 간의 코사인 유사도를 계산합니다
   * @param embedA 첫 번째 임베딩 벡터
   * @param embedB 두 번째 임베딩 벡터
   * @returns 코사인 유사도 (-1에서 1사이 값, 1이 가장 유사)
   */
  public cosineSimilarity(embedA: number[], embedB: number[]): number {
    if (embedA.length !== embedB.length) {
      throw new Error(`임베딩 차원이 일치하지 않습니다: ${embedA.length} vs ${embedB.length}`);
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < embedA.length; i++) {
      dotProduct += embedA[i] * embedB[i];
      normA += embedA[i] * embedA[i];
      normB += embedB[i] * embedB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }
  
  /**
   * 두 임베딩 벡터 간의 유클리드 거리를 계산합니다
   * @param embedA 첫 번째 임베딩 벡터
   * @param embedB 두 번째 임베딩 벡터
   * @returns 유클리드 거리 (값이 작을수록 더 유사)
   */
  public euclideanDistance(embedA: number[], embedB: number[]): number {
    if (embedA.length !== embedB.length) {
      throw new Error(`임베딩 차원이 일치하지 않습니다: ${embedA.length} vs ${embedB.length}`);
    }
    
    let sum = 0;
    
    for (let i = 0; i < embedA.length; i++) {
      const diff = embedA[i] - embedB[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }
  
  /**
   * 텍스트의 대략적인 토큰 수를 추정합니다 (영어 기준)
   * @param text 토큰 수를 계산할 텍스트
   * @returns 대략적인 토큰 수
   */
  public estimateTokenCount(text: string): number {
    // 간단한 휴리스틱: 단어 수의 약 1.3배
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }
  
  /**
   * 모델에 따른 임베딩 차원을 반환합니다
   * @param model 모델 이름
   * @returns 임베딩 차원
   */
  public getDimensions(model: string): number {
    return this.modelDimensions.get(model) || config.ai.embedding?.dimensions || 768;
  }
}

// 임베딩 서비스 인스턴스 생성 및 내보내기
export const embeddingService = EmbeddingService.getInstance(); 