import { db } from './database';
import { monitoring } from '../utils/monitoring';
import { config } from '../config';

/**
 * 벡터 데이터베이스 스키마 초기화 및 관리를 위한 클래스
 */
export class VectorDatabaseSchema {
  /**
   * 모든 벡터 관련 테이블을 초기화합니다
   */
  public static async initializeVectorTables(): Promise<void> {
    try {
      monitoring.log('database', 'info', '벡터 데이터베이스 스키마 초기화 시작');
      
      // pgvector 확장 설치 확인 및 설치
      await VectorDatabaseSchema.ensurePgVectorExtension();
      
      // 벡터 테이블 생성
      await VectorDatabaseSchema.createVectorEmbeddingsTable();
      await VectorDatabaseSchema.createDocumentChunksTable();
      await VectorDatabaseSchema.createVectorIndexesTable();
      
      monitoring.log('database', 'info', '벡터 데이터베이스 스키마 초기화 완료');
    } catch (error) {
      monitoring.log('database', 'error', `벡터 데이터베이스 스키마 초기화 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * pgvector 확장이 설치되어 있는지 확인하고, 설치되어 있지 않으면 설치합니다
   */
  private static async ensurePgVectorExtension(): Promise<void> {
    try {
      // 확장 존재 여부 확인
      const extensionResult = await db.query(
        "SELECT extname FROM pg_extension WHERE extname = 'vector'"
      );
      
      if (extensionResult.rowCount === 0) {
        monitoring.log('database', 'info', 'pgvector 확장 설치 시작');
        
        try {
          // pgvector 확장 설치
          await db.query('CREATE EXTENSION IF NOT EXISTS vector');
          monitoring.log('database', 'info', 'pgvector 확장 설치 완료');
        } catch (error) {
          monitoring.log('database', 'error', `pgvector 확장 설치 오류: ${error.message}`);
          throw new Error(`pgvector 확장 설치 실패: ${error.message}. 데이터베이스 관리자에게 문의하세요.`);
        }
      } else {
        monitoring.log('database', 'debug', 'pgvector 확장이 이미 설치되어 있습니다');
      }
    } catch (error) {
      monitoring.log('database', 'error', `pgvector 확장 확인 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 벡터 임베딩 테이블을 생성합니다
   */
  private static async createVectorEmbeddingsTable(): Promise<void> {
    const dimensions = config.ai.embedding?.dimensions || 768; // 기본 차원 768 (BERT 기반 모델)
    
    const query = `
      CREATE TABLE IF NOT EXISTS vector_embeddings (
        id SERIAL PRIMARY KEY,
        object_id VARCHAR(255) NOT NULL,
        object_type VARCHAR(50) NOT NULL,
        embedding vector(${dimensions}),
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT unique_object_vector UNIQUE (object_id, object_type)
      );
      
      CREATE INDEX IF NOT EXISTS idx_vector_embeddings_object_id ON vector_embeddings(object_id);
      CREATE INDEX IF NOT EXISTS idx_vector_embeddings_object_type ON vector_embeddings(object_type);
    `;
    
    try {
      await db.query(query);
      monitoring.log('database', 'info', 'vector_embeddings 테이블 생성 완료');
    } catch (error) {
      monitoring.log('database', 'error', `vector_embeddings 테이블 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 문서 청크 테이블을 생성합니다.
   * 대용량 문서는 청크로 분할하여 임베딩을 생성합니다.
   */
  private static async createDocumentChunksTable(): Promise<void> {
    const dimensions = config.ai.embedding?.dimensions || 768;
    
    const query = `
      CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        document_id VARCHAR(255) NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        chunk_index INTEGER NOT NULL,
        text_content TEXT NOT NULL,
        embedding vector(${dimensions}),
        tokens INTEGER,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT unique_document_chunk UNIQUE (document_id, document_type, chunk_index)
      );
      
      CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
      CREATE INDEX IF NOT EXISTS idx_document_chunks_document_type ON document_chunks(document_type);
    `;
    
    try {
      await db.query(query);
      monitoring.log('database', 'info', 'document_chunks 테이블 생성 완료');
    } catch (error) {
      monitoring.log('database', 'error', `document_chunks 테이블 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 벡터 인덱스 메타데이터 테이블을 생성합니다
   */
  private static async createVectorIndexesTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS vector_indexes (
        id SERIAL PRIMARY KEY,
        index_name VARCHAR(100) NOT NULL UNIQUE,
        table_name VARCHAR(100) NOT NULL,
        column_name VARCHAR(100) NOT NULL,
        index_method VARCHAR(50) NOT NULL,
        dimensions INTEGER NOT NULL,
        distance_method VARCHAR(20) NOT NULL,
        creation_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT true,
        description TEXT,
        parameters JSONB
      );
    `;
    
    try {
      await db.query(query);
      monitoring.log('database', 'info', 'vector_indexes 테이블 생성 완료');
    } catch (error) {
      monitoring.log('database', 'error', `vector_indexes 테이블 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 벡터 검색을 위한 인덱스를 생성합니다
   * @param indexConfig 인덱스 구성 정보
   */
  public static async createVectorIndex(indexConfig: {
    indexName: string;
    tableName: string;
    columnName: string;
    method: 'ivfflat' | 'hnsw';
    distanceMethod: 'cosine' | 'l2' | 'inner';
    parameters?: Record<string, any>;
    description?: string;
  }): Promise<void> {
    const client = await db.beginTransaction();
    
    try {
      const { indexName, tableName, columnName, method, distanceMethod, parameters, description } = indexConfig;
      
      // 이미 존재하는 인덱스인지 확인
      const existingIndex = await db.queryWithTransaction(
        client,
        `SELECT id FROM vector_indexes WHERE index_name = $1`,
        [indexName]
      );
      
      if (existingIndex.rowCount > 0) {
        await db.rollbackTransaction(client);
        monitoring.log('database', 'warn', `'${indexName}'는 이미 존재하는 인덱스 이름입니다.`);
        return;
      }
      
      // 인덱스 생성 SQL 구성
      let indexSql = '';
      const dimensions = config.ai.embedding?.dimensions || 768;
      
      if (method === 'ivfflat') {
        // IVFFlat 인덱스 (더 큰 데이터셋에 효율적)
        const lists = parameters?.lists || Math.ceil(Math.sqrt(dimensions));
        indexSql = `CREATE INDEX ${indexName} ON ${tableName} USING ivfflat (${columnName} ${distanceMethod}) WITH (lists = ${lists})`;
      } else if (method === 'hnsw') {
        // HNSW 인덱스 (더 빠른 검색 속도)
        const m = parameters?.m || 16;
        const efConstruction = parameters?.efConstruction || 64;
        indexSql = `CREATE INDEX ${indexName} ON ${tableName} USING hnsw (${columnName} ${distanceMethod}) WITH (m = ${m}, ef_construction = ${efConstruction})`;
      }
      
      // 인덱스 생성
      await db.queryWithTransaction(client, indexSql);
      
      // 인덱스 메타데이터 저장
      await db.queryWithTransaction(
        client,
        `INSERT INTO vector_indexes (
          index_name, table_name, column_name, index_method, dimensions, distance_method, parameters, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          indexName,
          tableName,
          columnName,
          method,
          dimensions,
          distanceMethod,
          parameters ? JSON.stringify(parameters) : null,
          description || null
        ]
      );
      
      await db.commitTransaction(client);
      monitoring.log('database', 'info', `벡터 인덱스 '${indexName}' 생성 완료`);
    } catch (error) {
      await db.rollbackTransaction(client);
      monitoring.log('database', 'error', `벡터 인덱스 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 기존 벡터 인덱스를 삭제합니다
   * @param indexName 삭제할 인덱스 이름
   */
  public static async dropVectorIndex(indexName: string): Promise<void> {
    const client = await db.beginTransaction();
    
    try {
      // 인덱스 메타데이터 조회
      const indexResult = await db.queryWithTransaction(
        client,
        `SELECT id FROM vector_indexes WHERE index_name = $1`,
        [indexName]
      );
      
      if (indexResult.rowCount === 0) {
        await db.rollbackTransaction(client);
        monitoring.log('database', 'warn', `'${indexName}' 인덱스가 존재하지 않습니다.`);
        return;
      }
      
      // 인덱스 삭제
      await db.queryWithTransaction(
        client,
        `DROP INDEX IF EXISTS ${indexName}`
      );
      
      // 인덱스 메타데이터 삭제
      await db.queryWithTransaction(
        client,
        `DELETE FROM vector_indexes WHERE index_name = $1`,
        [indexName]
      );
      
      await db.commitTransaction(client);
      monitoring.log('database', 'info', `벡터 인덱스 '${indexName}' 삭제 완료`);
    } catch (error) {
      await db.rollbackTransaction(client);
      monitoring.log('database', 'error', `벡터 인덱스 삭제 오류: ${error.message}`);
      throw error;
    }
  }
}

// 벡터 데이터베이스 스키마 내보내기
export const vectorSchema = VectorDatabaseSchema; 