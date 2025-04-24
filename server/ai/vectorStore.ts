import { db } from '../db/database';
import { monitoring } from '../utils/monitoring';
import { embeddingService, EmbeddingResult } from './embedding';
import { vectorSchema } from '../db/vectorSchema';
import { cache } from '../utils/cache';

/**
 * 벡터 저장소 검색 결과 인터페이스
 */
export interface VectorSearchResult {
  id: string;
  objectId: string;
  objectType: string;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * 문서 청크 인터페이스
 */
export interface DocumentChunk {
  documentId: string;
  documentType: string;
  chunkIndex: number;
  textContent: string;
  metadata?: Record<string, any>;
  tokens?: number;
}

/**
 * 객체 벡터화 결과 인터페이스
 */
export interface VectorizeResult {
  objectId: string;
  objectType: string;
  success: boolean;
  embeddingId?: number;
  error?: string;
}

/**
 * 벡터 저장소 검색 옵션 인터페이스
 */
export interface VectorSearchOptions {
  query: string;
  objectType?: string | string[];
  filter?: Record<string, any>;
  maxResults?: number;
  minScore?: number;
  includeMetadata?: boolean;
  includeVector?: boolean;
  model?: string;
  useCache?: boolean;
  cacheTTL?: number;
}

/**
 * 문서 분할 옵션 인터페이스
 */
export interface TextSplitterOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separator?: string | RegExp;
}

/**
 * pgvector를 활용한 벡터 저장소 클래스
 */
export class VectorStore {
  private static instance: VectorStore;
  private defaultModel: string;
  private defaultChunkSize: number = 512;
  private defaultChunkOverlap: number = 50;
  
  /**
   * 생성자
   * @private
   */
  private constructor() {
    this.defaultModel = 'pritamdeka/S-PubMedBert-MS-MARCO'; // 의학 분야 특화 모델
    monitoring.log('ai', 'info', `벡터 저장소 초기화 완료 (기본 모델: ${this.defaultModel})`);
  }
  
  /**
   * VectorStore 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): VectorStore {
    if (!VectorStore.instance) {
      VectorStore.instance = new VectorStore();
    }
    return VectorStore.instance;
  }
  
  /**
   * 벡터 저장소를 초기화합니다
   */
  public async initialize(): Promise<void> {
    try {
      // 벡터 테이블 스키마 초기화
      await vectorSchema.initializeVectorTables();
      
      // 인덱스 생성 
      this.createDefaultIndices().catch(err => {
        monitoring.log('database', 'error', `기본 벡터 인덱스 생성 오류: ${err.message}`);
      });
      
      monitoring.log('ai', 'info', '벡터 저장소 초기화 완료');
    } catch (error) {
      monitoring.log('ai', 'error', `벡터 저장소 초기화 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 기본 벡터 인덱스를 생성합니다
   * @private
   */
  private async createDefaultIndices(): Promise<void> {
    try {
      // 임베딩 테이블 인덱스 생성
      await vectorSchema.createVectorIndex({
        indexName: 'idx_vector_embeddings_embedding_cosine',
        tableName: 'vector_embeddings',
        columnName: 'embedding',
        method: 'hnsw',
        distanceMethod: 'cosine',
        description: '코사인 유사도를 위한 HNSW 인덱스',
        parameters: {
          m: 16,
          efConstruction: 64
        }
      });
      
      // 문서 청크 테이블 인덱스 생성
      await vectorSchema.createVectorIndex({
        indexName: 'idx_document_chunks_embedding_cosine',
        tableName: 'document_chunks',
        columnName: 'embedding',
        method: 'hnsw',
        distanceMethod: 'cosine',
        description: '코사인 유사도를 위한 HNSW 인덱스',
        parameters: {
          m: 16,
          efConstruction: 64
        }
      });
      
      monitoring.log('database', 'info', '기본 벡터 인덱스 생성 완료');
    } catch (error) {
      monitoring.log('database', 'error', `기본 벡터 인덱스 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 객체를 벡터화하여 저장합니다
   * @param objectId 대상 객체 ID
   * @param objectType 대상 객체 유형
   * @param text 벡터화할 텍스트
   * @param metadata 추가 메타데이터
   * @param model 사용할 임베딩 모델
   */
  public async vectorizeObject(
    objectId: string,
    objectType: string,
    text: string,
    metadata?: Record<string, any>,
    model: string = this.defaultModel
  ): Promise<VectorizeResult> {
    try {
      // 유효성 검사
      if (!objectId || !objectType || !text) {
        return {
          objectId,
          objectType,
          success: false,
          error: '유효하지 않은 입력 데이터'
        };
      }
      
      // 이미 존재하는지 확인
      const existingResult = await db.query(
        'SELECT id FROM vector_embeddings WHERE object_id = $1 AND object_type = $2',
        [objectId, objectType]
      );
      
      // 임베딩 생성
      const embeddingResult = await embeddingService.generateEmbedding({
        text,
        model
      });
      
      const client = await db.beginTransaction();
      
      try {
        let embeddingId: number;
        
        if (existingResult.rowCount > 0) {
          // 기존 벡터 업데이트
          const result = await db.queryWithTransaction(
            client,
            `UPDATE vector_embeddings 
             SET embedding = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE object_id = $3 AND object_type = $4
             RETURNING id`,
            [embeddingResult.embedding, metadata || {}, objectId, objectType]
          );
          
          embeddingId = result.rows[0].id;
          
          monitoring.log('ai', 'debug', `객체 벡터 업데이트 완료: ${objectType}/${objectId}`);
        } else {
          // 새 벡터 삽입
          const result = await db.queryWithTransaction(
            client,
            `INSERT INTO vector_embeddings (object_id, object_type, embedding, metadata)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [objectId, objectType, embeddingResult.embedding, metadata || {}]
          );
          
          embeddingId = result.rows[0].id;
          
          monitoring.log('ai', 'debug', `객체 벡터 저장 완료: ${objectType}/${objectId}`);
        }
        
        await db.commitTransaction(client);
        
        return {
          objectId,
          objectType,
          success: true,
          embeddingId
        };
      } catch (error) {
        await db.rollbackTransaction(client);
        throw error;
      }
    } catch (error) {
      monitoring.log('ai', 'error', `객체 벡터화 오류: ${error.message}`);
      
      return {
        objectId,
        objectType,
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 유사한 벡터를 검색합니다
   * @param options 검색 옵션
   */
  public async similaritySearch(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    try {
      const {
        query,
        objectType,
        filter,
        maxResults = 10,
        minScore = 0.7,
        includeMetadata = true,
        includeVector = false,
        model = this.defaultModel,
        useCache = true,
        cacheTTL = 3600 // 1시간
      } = options;
      
      // 캐시 처리
      if (useCache) {
        const cacheKey = `vector_search:${query}:${objectType || 'all'}:${maxResults}:${minScore}:${model}:${JSON.stringify(filter || {})}`;
        const cachedResult = await cache.get<VectorSearchResult[]>(cacheKey);
        
        if (cachedResult) {
          monitoring.log('ai', 'debug', `캐시된 벡터 검색 결과 사용: ${query}`);
          return cachedResult;
        }
      }
      
      // 쿼리 텍스트 임베딩 생성
      const queryEmbedding = await embeddingService.generateEmbedding({
        text: query,
        model
      });
      
      // SQL 쿼리 구성
      let sql = `
        SELECT 
          id,
          object_id,
          object_type,
          1 - (embedding <=> $1) as score
          ${includeMetadata ? ', metadata' : ''}
          ${includeVector ? ', embedding' : ''}
        FROM vector_embeddings
        WHERE 1=1
      `;
      
      const params: any[] = [queryEmbedding.embedding];
      let paramIndex = 2;
      
      // 객체 타입 필터링
      if (objectType) {
        if (Array.isArray(objectType)) {
          sql += ` AND object_type = ANY($${paramIndex++})`;
          params.push(objectType);
        } else {
          sql += ` AND object_type = $${paramIndex++}`;
          params.push(objectType);
        }
      }
      
      // 추가 필터 적용
      if (filter && Object.keys(filter).length > 0) {
        for (const [key, value] of Object.entries(filter)) {
          sql += ` AND metadata->>'${key}' = $${paramIndex++}`;
          params.push(value);
        }
      }
      
      // 점수 필터 및 정렬, 제한
      sql += `
        HAVING 1 - (embedding <=> $1) >= $${paramIndex++}
        ORDER BY score DESC
        LIMIT $${paramIndex++}
      `;
      
      params.push(minScore, maxResults);
      
      // 쿼리 실행
      const result = await db.query(sql, params);
      
      // 결과 변환
      const searchResults: VectorSearchResult[] = result.rows.map(row => ({
        id: row.id.toString(),
        objectId: row.object_id,
        objectType: row.object_type,
        score: row.score,
        metadata: includeMetadata ? row.metadata : undefined
      }));
      
      // 결과 캐싱
      if (useCache && searchResults.length > 0) {
        const cacheKey = `vector_search:${query}:${objectType || 'all'}:${maxResults}:${minScore}:${model}:${JSON.stringify(filter || {})}`;
        await cache.set(cacheKey, searchResults, { ttl: cacheTTL });
      }
      
      return searchResults;
    } catch (error) {
      monitoring.log('ai', 'error', `벡터 검색 오류: ${error.message}`);
      return [];
    }
  }
  
  /**
   * 텍스트를 청크로 분할합니다
   * @param text 분할할 텍스트
   * @param options 분할 옵션
   */
  public splitTextIntoChunks(text: string, options: TextSplitterOptions = {}): string[] {
    const {
      chunkSize = this.defaultChunkSize,
      chunkOverlap = this.defaultChunkOverlap,
      separator = /\n\s*\n|\n(?=\s*#{1,6}\s)|(?<=\. |\? |! )(?=[A-Z])/
    } = options;
    
    if (!text || text.trim() === '') {
      return [];
    }
    
    // 섹션 분할 (구분자로 나누기)
    const sections = separator instanceof RegExp
      ? text.split(separator)
      : text.split(separator);
    
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const section of sections) {
      const trimmedSection = section.trim();
      if (!trimmedSection) continue;
      
      // 섹션이 청크 크기보다 크면 단어 단위로 추가 분할
      if (trimmedSection.length > chunkSize) {
        const words = trimmedSection.split(/\s+/);
        let tempChunk = '';
        
        for (const word of words) {
          if ((tempChunk + ' ' + word).length <= chunkSize) {
            tempChunk = tempChunk ? `${tempChunk} ${word}` : word;
          } else {
            chunks.push(tempChunk);
            tempChunk = word;
          }
        }
        
        if (tempChunk) {
          currentChunk = currentChunk
            ? `${currentChunk} ${tempChunk}`
            : tempChunk;
        }
      } 
      // 현재 청크에 섹션 추가 시 크기 초과하면 청크 완성 후 새 청크 시작
      else if (currentChunk && (currentChunk.length + trimmedSection.length + 1) > chunkSize) {
        chunks.push(currentChunk);
        currentChunk = trimmedSection;
      } 
      // 현재 청크에 섹션 추가
      else {
        currentChunk = currentChunk
          ? `${currentChunk} ${trimmedSection}`
          : trimmedSection;
      }
      
      // 현재 청크가 청크 크기를 초과하면 청크 완성
      if (currentChunk.length >= chunkSize) {
        chunks.push(currentChunk);
        
        // 청크 오버랩 처리
        const words = currentChunk.split(/\s+/);
        const overlapWordCount = Math.ceil(words.length * (chunkOverlap / currentChunk.length));
        
        if (overlapWordCount > 0 && overlapWordCount < words.length) {
          currentChunk = words.slice(-overlapWordCount).join(' ');
        } else {
          currentChunk = '';
        }
      }
    }
    
    // 남은 청크 추가
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  /**
   * 문서를 청크 단위로 저장합니다
   * @param document 문서 정보
   * @param text 문서 전체 텍스트
   * @param splitterOptions 텍스트 분할 옵션
   * @param model 임베딩 모델
   */
  public async storeDocumentChunks(
    document: {
      id: string,
      type: string,
      metadata?: Record<string, any>
    },
    text: string,
    splitterOptions: TextSplitterOptions = {},
    model: string = this.defaultModel
  ): Promise<{ success: boolean, chunkCount: number, error?: string }> {
    try {
      if (!document.id || !document.type || !text) {
        return {
          success: false,
          chunkCount: 0,
          error: '유효하지 않은 문서 데이터'
        };
      }
      
      // 기존 청크 삭제
      await db.query(
        'DELETE FROM document_chunks WHERE document_id = $1 AND document_type = $2',
        [document.id, document.type]
      );
      
      // 텍스트 분할
      const chunks = this.splitTextIntoChunks(text, splitterOptions);
      
      if (chunks.length === 0) {
        return {
          success: false,
          chunkCount: 0,
          error: '분할된 청크가 없습니다'
        };
      }
      
      // 모든 청크 임베딩 처리 (병렬)
      const chunkEmbeddings: { 
        index: number; 
        text: string; 
        embedding: number[]; 
        tokens?: number; 
      }[] = [];
      
      // 배치 크기 - API 호출 수 제한
      const batchSize = 5;
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);
        const batchPromises = batchChunks.map(async (chunk, j) => {
          try {
            const embedding = await embeddingService.generateEmbedding({
              text: chunk,
              model
            });
            
            return {
              index: i + j,
              text: chunk,
              embedding: embedding.embedding,
              tokens: embedding.tokenCount || embeddingService.estimateTokenCount(chunk)
            };
          } catch (error) {
            monitoring.log('ai', 'error', `청크 ${i + j} 임베딩 오류: ${error.message}`);
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        chunkEmbeddings.push(...batchResults.filter(r => r !== null));
      }
      
      // 청크 저장
      const client = await db.beginTransaction();
      
      try {
        // 트랜잭션으로 모든 청크 삽입
        for (const chunk of chunkEmbeddings) {
          await db.queryWithTransaction(
            client,
            `INSERT INTO document_chunks (
              document_id, document_type, chunk_index, text_content, 
              embedding, tokens, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              document.id,
              document.type,
              chunk.index,
              chunk.text,
              chunk.embedding,
              chunk.tokens,
              document.metadata || {}
            ]
          );
        }
        
        await db.commitTransaction(client);
        
        monitoring.log('ai', 'info', `문서 청크 저장 완료: ${document.type}/${document.id}, 청크 ${chunkEmbeddings.length}개`);
        
        return {
          success: true,
          chunkCount: chunkEmbeddings.length
        };
      } catch (error) {
        await db.rollbackTransaction(client);
        throw error;
      }
    } catch (error) {
      monitoring.log('ai', 'error', `문서 청크 저장 오류: ${error.message}`);
      
      return {
        success: false,
        chunkCount: 0,
        error: error.message
      };
    }
  }
  
  /**
   * 문서 청크에서 유사 내용을 검색합니다
   * @param options 검색 옵션
   */
  public async searchDocumentChunks(options: VectorSearchOptions): Promise<{
    results: VectorSearchResult[];
    chunks: { text: string; score: number; documentId: string; chunkIndex: number }[];
  }> {
    try {
      const {
        query,
        objectType,
        filter,
        maxResults = 5,
        minScore = 0.7,
        includeMetadata = true,
        model = this.defaultModel,
        useCache = true,
        cacheTTL = 3600 // 1시간
      } = options;
      
      // 캐시 처리
      if (useCache) {
        const cacheKey = `chunk_search:${query}:${objectType || 'all'}:${maxResults}:${minScore}:${model}:${JSON.stringify(filter || {})}`;
        const cachedResult = await cache.get(cacheKey);
        
        if (cachedResult) {
          monitoring.log('ai', 'debug', `캐시된 청크 검색 결과 사용: ${query}`);
          return cachedResult;
        }
      }
      
      // 쿼리 텍스트 임베딩 생성
      const queryEmbedding = await embeddingService.generateEmbedding({
        text: query,
        model
      });
      
      // SQL 쿼리 구성
      let sql = `
        SELECT 
          id,
          document_id,
          document_type,
          chunk_index,
          text_content,
          1 - (embedding <=> $1) as score
          ${includeMetadata ? ', metadata' : ''}
        FROM document_chunks
        WHERE 1=1
      `;
      
      const params: any[] = [queryEmbedding.embedding];
      let paramIndex = 2;
      
      // 객체 타입 필터링
      if (objectType) {
        if (Array.isArray(objectType)) {
          sql += ` AND document_type = ANY($${paramIndex++})`;
          params.push(objectType);
        } else {
          sql += ` AND document_type = $${paramIndex++}`;
          params.push(objectType);
        }
      }
      
      // 추가 필터 적용
      if (filter && Object.keys(filter).length > 0) {
        for (const [key, value] of Object.entries(filter)) {
          sql += ` AND metadata->>'${key}' = $${paramIndex++}`;
          params.push(value);
        }
      }
      
      // 점수 필터 및 정렬, 제한
      sql += `
        HAVING 1 - (embedding <=> $1) >= $${paramIndex++}
        ORDER BY score DESC
        LIMIT $${paramIndex++}
      `;
      
      params.push(minScore, maxResults);
      
      // 쿼리 실행
      const result = await db.query(sql, params);
      
      // 결과 변환
      const searchResults: VectorSearchResult[] = result.rows.map(row => ({
        id: row.id.toString(),
        objectId: row.document_id,
        objectType: row.document_type,
        score: row.score,
        metadata: includeMetadata ? row.metadata : undefined
      }));
      
      const chunks = result.rows.map(row => ({
        text: row.text_content,
        score: row.score,
        documentId: row.document_id,
        chunkIndex: row.chunk_index
      }));
      
      const response = {
        results: searchResults,
        chunks
      };
      
      // 결과 캐싱
      if (useCache && searchResults.length > 0) {
        const cacheKey = `chunk_search:${query}:${objectType || 'all'}:${maxResults}:${minScore}:${model}:${JSON.stringify(filter || {})}`;
        await cache.set(cacheKey, response, { ttl: cacheTTL });
      }
      
      return response;
    } catch (error) {
      monitoring.log('ai', 'error', `청크 검색 오류: ${error.message}`);
      return { results: [], chunks: [] };
    }
  }
  
  /**
   * 객체 ID 목록에서 유사도 행렬을 생성합니다
   * @param objectIds 객체 ID 목록
   * @param objectType 객체 유형
   */
  public async createSimilarityMatrix(
    objectIds: string[],
    objectType: string
  ): Promise<{ matrix: number[][], objectIds: string[] }> {
    try {
      if (!objectIds.length) {
        return { matrix: [], objectIds: [] };
      }
      
      // 객체 임베딩 로드
      const embeddings = await db.query(
        `SELECT object_id, embedding 
         FROM vector_embeddings 
         WHERE object_type = $1 AND object_id = ANY($2)`,
        [objectType, objectIds]
      );
      
      if (embeddings.rowCount === 0) {
        return { matrix: [], objectIds: [] };
      }
      
      // 실제 존재하는 객체 ID 목록
      const foundObjectIds = embeddings.rows.map(row => row.object_id);
      
      // 유사도 행렬 계산
      const n = foundObjectIds.length;
      const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
      
      for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
          // 같은 객체는 유사도 1
          if (i === j) {
            matrix[i][j] = 1;
            continue;
          }
          
          // 코사인 유사도 계산
          const similarity = embeddingService.cosineSimilarity(
            embeddings.rows[i].embedding,
            embeddings.rows[j].embedding
          );
          
          // 대칭 행렬이므로 양쪽 모두 설정
          matrix[i][j] = similarity;
          matrix[j][i] = similarity;
        }
      }
      
      return { matrix, objectIds: foundObjectIds };
    } catch (error) {
      monitoring.log('ai', 'error', `유사도 행렬 생성 오류: ${error.message}`);
      return { matrix: [], objectIds: [] };
    }
  }
  
  /**
   * 벡터 저장소 통계를 가져옵니다
   */
  public async getStats(): Promise<Record<string, any>> {
    try {
      // 벡터 임베딩 테이블 통계
      const embeddingsStatsResult = await db.query(`
        SELECT 
          COUNT(*) as total_embeddings,
          COUNT(DISTINCT object_type) as total_object_types,
          MIN(created_at) as oldest_embedding,
          MAX(created_at) as newest_embedding
        FROM vector_embeddings
      `);
      
      // 객체 유형별 통계
      const objectTypeStatsResult = await db.query(`
        SELECT 
          object_type, 
          COUNT(*) as count
        FROM vector_embeddings
        GROUP BY object_type
        ORDER BY count DESC
      `);
      
      // 문서 청크 테이블 통계
      const chunksStatsResult = await db.query(`
        SELECT 
          COUNT(*) as total_chunks,
          COUNT(DISTINCT document_type) as total_document_types,
          AVG(tokens) as avg_tokens_per_chunk,
          MIN(created_at) as oldest_chunk,
          MAX(created_at) as newest_chunk
        FROM document_chunks
      `);
      
      // 문서 유형별 통계
      const documentTypeStatsResult = await db.query(`
        SELECT 
          document_type, 
          COUNT(*) as chunks,
          COUNT(DISTINCT document_id) as documents
        FROM document_chunks
        GROUP BY document_type
        ORDER BY chunks DESC
      `);
      
      return {
        embeddings: embeddingsStatsResult.rows[0],
        objectTypes: objectTypeStatsResult.rows,
        chunks: chunksStatsResult.rows[0],
        documentTypes: documentTypeStatsResult.rows,
        timestamp: new Date()
      };
    } catch (error) {
      monitoring.log('ai', 'error', `벡터 저장소 통계 조회 오류: ${error.message}`);
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// 벡터 저장소 인스턴스 생성 및 내보내기
export const vectorStore = VectorStore.getInstance(); 