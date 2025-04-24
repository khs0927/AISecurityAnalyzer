import { Pool, PoolClient, QueryResult } from 'pg';
import { monitoring } from '../utils/monitoring';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 환경 변수 로드
dotenv.config();

// DB 연결 정보
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'medical_data';
const DB_SCHEMA = process.env.DB_SCHEMA || 'public';

// 쿼리 로그 디렉토리
const QUERY_LOG_DIR = path.join(process.cwd(), 'logs', 'db_queries');

// 로그 디렉토리 생성 함수
function ensureLogDirectory(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    console.error('로그 디렉토리 생성 실패:', error);
  }
}

// 테이블 정의
export enum TableName {
  PUBMED_ARTICLES = 'pubmed_articles',
  PUBMED_AUTHORS = 'pubmed_authors',
  PUBMED_KEYWORDS = 'pubmed_keywords',
  KAGGLE_DATASETS = 'kaggle_datasets',
  KAGGLE_FILES = 'kaggle_files',
  DATA_SOURCES = 'data_sources',
  MEDICAL_TERMS = 'medical_terms',
  RESEARCH_TOPICS = 'research_topics',
  DATASET_METADATA = 'dataset_metadata',
  SEARCH_HISTORY = 'search_history',
}

// 쿼리 타입 정의
export enum QueryType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CREATE = 'CREATE',
  ALTER = 'ALTER',
  DROP = 'DROP',
  TRUNCATE = 'TRUNCATE',
  CUSTOM = 'CUSTOM',
}

// 테이블 이름을 문자열로 변환
export function tableName(table: TableName): string {
  return `${DB_SCHEMA}.${table}`;
}

export class MedicalDataDB {
  private pool: Pool;
  private isConnected: boolean = false;
  private isInitialized: boolean = false;
  private queryLogEnabled: boolean = false;

  constructor() {
    // 풀 설정
    this.pool = new Pool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      max: 20,              // 최대 연결 수
      idleTimeoutMillis: 30000, // 연결 유휴 제한시간 (30초)
      connectionTimeoutMillis: 2000, // 연결 타임아웃 (2초)
    });

    // 이벤트 리스너 등록
    this.pool.on('error', (err: Error) => {
      monitoring.log('error', '예상치 못한 PostgreSQL 오류', {
        error: err.message,
        stack: err.stack,
        category: 'database'
      });
    });

    this.pool.on('connect', () => {
      monitoring.log('info', 'PostgreSQL에 새 연결 생성됨', {
        category: 'database'
      });
    });

    // 쿼리 로그 디렉토리 생성
    ensureLogDirectory(QUERY_LOG_DIR);

    this.queryLogEnabled = process.env.ENABLE_QUERY_LOG === 'true';

    monitoring.log('info', 'PostgreSQL 연결 풀 초기화 완료', {
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      schema: DB_SCHEMA,
      category: 'database'
    });
  }

  /**
   * 데이터베이스 연결 확인
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    try {
      // 테스트 연결
      const client = await this.pool.connect();
      this.isConnected = true;
      
      // 테스트 쿼리 실행
      const result = await client.query('SELECT NOW()');
      client.release();
      
      monitoring.log('info', 'PostgreSQL 연결 성공', {
        timestamp: result.rows[0].now,
        category: 'database'
      });
      
      return true;
    } catch (error: any) {
      this.isConnected = false;
      monitoring.log('error', 'PostgreSQL 연결 실패', {
        error: error.message,
        stack: error.stack,
        category: 'database'
      });
      
      return false;
    }
  }

  /**
   * 데이터베이스 초기화 - 필요한 테이블과 인덱스 생성
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // 연결 확인
      if (!await this.connect()) {
        return false;
      }

      const client = await this.pool.connect();
      
      try {
        // 트랜잭션 시작
        await client.query('BEGIN');

        // 스키마 생성 (존재하지 않는 경우)
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${DB_SCHEMA}`);

        // PubMed 테이블 생성
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName(TableName.PUBMED_ARTICLES)} (
            pmid VARCHAR(20) PRIMARY KEY,
            title TEXT NOT NULL,
            abstract TEXT,
            publication_date DATE,
            journal TEXT,
            doi VARCHAR(255),
            url TEXT,
            article_type VARCHAR(50),
            citation_count INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName(TableName.PUBMED_AUTHORS)} (
            id SERIAL PRIMARY KEY,
            pmid VARCHAR(20) REFERENCES ${tableName(TableName.PUBMED_ARTICLES)}(pmid) ON DELETE CASCADE,
            author_name TEXT NOT NULL,
            affiliation TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(pmid, author_name)
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName(TableName.PUBMED_KEYWORDS)} (
            id SERIAL PRIMARY KEY,
            pmid VARCHAR(20) REFERENCES ${tableName(TableName.PUBMED_ARTICLES)}(pmid) ON DELETE CASCADE,
            keyword TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(pmid, keyword)
          )
        `);

        // Kaggle 테이블 생성
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName(TableName.KAGGLE_DATASETS)} (
            id SERIAL PRIMARY KEY,
            ref VARCHAR(255) UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            size BIGINT,
            last_updated TIMESTAMP WITH TIME ZONE,
            download_count INT DEFAULT 0,
            vote_count INT DEFAULT 0,
            license VARCHAR(255),
            url TEXT,
            downloaded BOOLEAN DEFAULT FALSE,
            download_path TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName(TableName.KAGGLE_FILES)} (
            id SERIAL PRIMARY KEY,
            dataset_id INT REFERENCES ${tableName(TableName.KAGGLE_DATASETS)}(id) ON DELETE CASCADE,
            file_name TEXT NOT NULL,
            file_size BIGINT,
            file_type VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(dataset_id, file_name)
          )
        `);

        // 데이터 소스 테이블 생성
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName(TableName.DATA_SOURCES)} (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            source_type VARCHAR(50) NOT NULL,
            source_url TEXT,
            api_key_required BOOLEAN DEFAULT FALSE,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(name)
          )
        `);

        // 의학 용어 테이블 생성
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName(TableName.MEDICAL_TERMS)} (
            id SERIAL PRIMARY KEY,
            term VARCHAR(255) NOT NULL,
            definition TEXT,
            category VARCHAR(100),
            source VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(term)
          )
        `);

        // 연구 주제 테이블 생성
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName(TableName.RESEARCH_TOPICS)} (
            id SERIAL PRIMARY KEY,
            topic VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            keyword_count INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(topic)
          )
        `);

        // 데이터셋 메타데이터 테이블 생성
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName(TableName.DATASET_METADATA)} (
            id SERIAL PRIMARY KEY,
            dataset_name VARCHAR(255) NOT NULL,
            source_type VARCHAR(50) NOT NULL,
            source_id VARCHAR(255) NOT NULL,
            features JSONB,
            row_count INT,
            file_format VARCHAR(50),
            has_missing_values BOOLEAN DEFAULT FALSE,
            domain VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(source_type, source_id)
          )
        `);

        // 검색 기록 테이블 생성
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tableName(TableName.SEARCH_HISTORY)} (
            id SERIAL PRIMARY KEY,
            search_term TEXT NOT NULL,
            source VARCHAR(50) NOT NULL,
            result_count INT,
            user_id VARCHAR(255),
            search_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(search_term, source, user_id, search_time)
          )
        `);

        // 인덱스 생성
        await client.query(`CREATE INDEX IF NOT EXISTS idx_pubmed_article_title ON ${tableName(TableName.PUBMED_ARTICLES)} USING gin(to_tsvector('english', title))`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_pubmed_article_abstract ON ${tableName(TableName.PUBMED_ARTICLES)} USING gin(to_tsvector('english', abstract))`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_pubmed_author_name ON ${tableName(TableName.PUBMED_AUTHORS)} USING gin(to_tsvector('english', author_name))`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_pubmed_keyword ON ${tableName(TableName.PUBMED_KEYWORDS)} USING gin(to_tsvector('english', keyword))`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_kaggle_dataset_title ON ${tableName(TableName.KAGGLE_DATASETS)} USING gin(to_tsvector('english', title))`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_kaggle_dataset_description ON ${tableName(TableName.KAGGLE_DATASETS)} USING gin(to_tsvector('english', description))`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_research_topic ON ${tableName(TableName.RESEARCH_TOPICS)} USING gin(to_tsvector('english', topic))`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_medical_term ON ${tableName(TableName.MEDICAL_TERMS)} USING gin(to_tsvector('english', term))`);

        // 데이터 소스 기본 데이터 삽입
        await client.query(`
          INSERT INTO ${tableName(TableName.DATA_SOURCES)} (name, description, source_type, source_url, api_key_required)
          VALUES 
            ('PubMed', 'Medical research articles database by NCBI', 'API', 'https://pubmed.ncbi.nlm.nih.gov/', true),
            ('Kaggle', 'Data science platform with datasets', 'API', 'https://www.kaggle.com/', true)
          ON CONFLICT (name) DO NOTHING
        `);

        // 트랜잭션 커밋
        await client.query('COMMIT');
        
        this.isInitialized = true;
        
        monitoring.log('info', 'PostgreSQL 데이터베이스 초기화 완료', {
          category: 'database'
        });
        
        return true;
      } catch (error: any) {
        // 트랜잭션 롤백
        await client.query('ROLLBACK');
        
        monitoring.log('error', 'PostgreSQL 데이터베이스 초기화 실패', {
          error: error.message,
          stack: error.stack,
          category: 'database'
        });
        
        return false;
      } finally {
        client.release();
      }
    } catch (error: any) {
      monitoring.log('error', 'PostgreSQL 데이터베이스 초기화 중 오류 발생', {
        error: error.message,
        stack: error.stack,
        category: 'database'
      });
      
      return false;
    }
  }

  /**
   * 데이터베이스 스키마 초기화 - SQL 파일에서 스키마 불러와 적용
   */
  async initializeSchema(): Promise<boolean> {
    try {
      // 연결 확인
      if (!await this.connect()) {
        throw new Error('데이터베이스 연결에 실패했습니다.');
      }

      // 스키마 SQL 파일 경로
      const schemaPath = path.join(process.cwd(), 'src', 'database', 'schema.sql');
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`스키마 파일을 찾을 수 없습니다: ${schemaPath}`);
      }

      // SQL 파일 읽기
      const schemaSql = fs.readFileSync(schemaPath, 'utf8').toString();
      
      // SQL 실행
      await this.query(schemaSql);
      
      monitoring.log('info', '데이터베이스 스키마가 성공적으로 초기화되었습니다.', {
        category: 'database'
      });
      
      return true;
    } catch (error: any) {
      monitoring.log('error', '데이터베이스 스키마 초기화 중 오류 발생', {
        error: error.message,
        stack: error.stack,
        category: 'database'
      });
      
      return false;
    }
  }

  /**
   * 일반 쿼리 실행
   */
  async query<T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      // 연결 확인
      if (!this.isConnected && !await this.connect()) {
        throw new Error('데이터베이스에 연결할 수 없습니다.');
      }

      const start = Date.now();
      const queryType = this.getQueryType(text);
      
      // 쿼리 실행
      const result = await this.pool.query<T>(text, params);
      
      const duration = Date.now() - start;
      
      // 쿼리 로깅
      this.logQuery(text, params, queryType, duration, result.rowCount);
      
      return result;
    } catch (error: any) {
      monitoring.log('error', 'PostgreSQL 쿼리 실행 오류', {
        error: error.message,
        stack: error.stack,
        query: text,
        params,
        category: 'database'
      });
      
      throw error;
    }
  }

  /**
   * 트랜잭션 실행
   */
  async executeTransaction<T = any>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    // 연결 확인
    if (!this.isConnected && !await this.connect()) {
      throw new Error('데이터베이스에 연결할 수 없습니다.');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 벌크 삽입 실행
   */
  async bulkInsert<T>(
    table: TableName,
    columns: string[],
    values: any[][],
    returnColumns: string[] = ['id']
  ): Promise<T[]> {
    if (!values.length) {
      return [];
    }

    try {
      // 연결 확인
      if (!this.isConnected && !await this.connect()) {
        throw new Error('데이터베이스에 연결할 수 없습니다.');
      }

      const start = Date.now();
      
      // 매개변수 인덱스 생성
      let valueClause = '';
      let params: any[] = [];
      let index = 1;
      
      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        if (row.length !== columns.length) {
          throw new Error(`행 ${i}의 값 수(${row.length})가 열 수(${columns.length})와 일치하지 않습니다.`);
        }
        
        const rowParams = row.map(() => `$${index++}`);
        valueClause += (i === 0 ? '' : ',') + `(${rowParams.join(',')})`;
        params = params.concat(row);
      }
      
      // RETURNING 절 생성
      const returning = returnColumns.length ? ` RETURNING ${returnColumns.join(',')}` : '';
      
      // 쿼리 생성
      const query = `
        INSERT INTO ${tableName(table)} (${columns.join(',')})
        VALUES ${valueClause}
        ${returning}
      `;
      
      // 쿼리 실행
      const result = await this.pool.query(query, params);
      
      const duration = Date.now() - start;
      
      // 쿼리 로깅
      this.logQuery(query, params, QueryType.INSERT, duration, result.rowCount);
      
      return result.rows as T[];
    } catch (error: any) {
      monitoring.log('error', `PostgreSQL 벌크 삽입 오류 (${table})`, {
        error: error.message,
        stack: error.stack,
        table,
        columns,
        valueCount: values.length,
        category: 'database'
      });
      
      throw error;
    }
  }

  /**
   * UPSERT(INSERT ON CONFLICT UPDATE) 실행
   */
  async upsert<T>(
    table: TableName,
    columns: string[],
    values: any[],
    conflictColumns: string[],
    updateColumns: string[],
    returnColumns: string[] = ['id']
  ): Promise<T> {
    try {
      // 연결 확인
      if (!this.isConnected && !await this.connect()) {
        throw new Error('데이터베이스에 연결할 수 없습니다.');
      }

      const start = Date.now();
      
      // 매개변수 인덱스 생성
      const valueParams = values.map((_, i) => `$${i + 1}`);
      
      // 업데이트할 열 생성
      const updateSetClause = updateColumns
        .map((col, i) => {
          const colIndex = columns.indexOf(col);
          return colIndex !== -1 ? `${col} = $${colIndex + 1}` : null;
        })
        .filter(Boolean)
        .join(', ');
      
      // RETURNING 절 생성
      const returning = returnColumns.length ? ` RETURNING ${returnColumns.join(',')}` : '';
      
      // 쿼리 생성
      const query = `
        INSERT INTO ${tableName(table)} (${columns.join(',')})
        VALUES (${valueParams.join(',')})
        ON CONFLICT (${conflictColumns.join(',')})
        DO UPDATE SET ${updateSetClause}, updated_at = NOW()
        ${returning}
      `;
      
      // 쿼리 실행
      const result = await this.pool.query(query, values);
      
      const duration = Date.now() - start;
      
      // 쿼리 로깅
      this.logQuery(query, values, QueryType.CUSTOM, duration, result.rowCount);
      
      return result.rows[0] as T;
    } catch (error: any) {
      monitoring.log('error', `PostgreSQL UPSERT 오류 (${table})`, {
        error: error.message,
        stack: error.stack,
        table,
        columns,
        conflictColumns,
        updateColumns,
        category: 'database'
      });
      
      throw error;
    }
  }

  /**
   * 검색 이력 기록
   */
  async logSearchHistory(
    searchTerm: string,
    source: string,
    resultCount: number,
    userId?: string
  ): Promise<void> {
    try {
      await this.query(
        `INSERT INTO ${tableName(TableName.SEARCH_HISTORY)} 
        (search_term, source, result_count, user_id) 
        VALUES ($1, $2, $3, $4)`,
        [searchTerm, source, resultCount, userId || null]
      );
    } catch (error: any) {
      monitoring.log('warn', '검색 이력 기록 실패', {
        error: error.message,
        searchTerm,
        source,
        category: 'database'
      });
    }
  }

  /**
   * 쿼리 타입 추출
   */
  private getQueryType(query: string): QueryType {
    const upperQuery = query.trim().toUpperCase();
    
    if (upperQuery.startsWith('SELECT')) return QueryType.SELECT;
    if (upperQuery.startsWith('INSERT')) return QueryType.INSERT;
    if (upperQuery.startsWith('UPDATE')) return QueryType.UPDATE;
    if (upperQuery.startsWith('DELETE')) return QueryType.DELETE;
    if (upperQuery.startsWith('CREATE')) return QueryType.CREATE;
    if (upperQuery.startsWith('ALTER')) return QueryType.ALTER;
    if (upperQuery.startsWith('DROP')) return QueryType.DROP;
    if (upperQuery.startsWith('TRUNCATE')) return QueryType.TRUNCATE;
    
    return QueryType.CUSTOM;
  }

  /**
   * 쿼리 로깅
   */
  private logQuery(
    query: string,
    params: any[],
    queryType: QueryType,
    duration: number,
    rowCount?: number
  ): void {
    if (!this.queryLogEnabled) {
      return;
    }
    
    try {
      const timestamp = new Date().toISOString();
      const sanitizedQuery = this.sanitizeQuery(query);
      const sanitizedParams = this.sanitizeParams(params);
      
      const logMessage = JSON.stringify({
        timestamp,
        queryType,
        query: sanitizedQuery,
        params: sanitizedParams,
        duration,
        rowCount
      });
      
      const logFileName = `${timestamp.split('T')[0]}.log`;
      const logFilePath = path.join(QUERY_LOG_DIR, logFileName);
      
      // appendFileSync 대신 writeFileSync 사용
      const logContent = logMessage + '\n';
      try {
        fs.writeFileSync(
          logFilePath, 
          fs.existsSync(logFilePath) 
            ? fs.readFileSync(logFilePath, 'utf8') + logContent
            : logContent,
          'utf8'
        );
      } catch (error) {
        console.error('쿼리 로그 파일 쓰기 실패:', error);
      }
      
      monitoring.log('debug', '쿼리 실행', {
        queryType,
        duration,
        rowCount,
        category: 'database'
      });
    } catch (error) {
      console.error('쿼리 로깅 실패:', error);
    }
  }

  /**
   * 보안을 위한 쿼리 정제
   */
  private sanitizeQuery(query: string): string {
    // 여러 줄 쿼리를 한 줄로 변환
    return query.replace(/\s+/g, ' ').trim();
  }

  /**
   * 보안을 위한 매개변수 정제
   */
  private sanitizeParams(params: any[]): any[] {
    return params.map(param => {
      // 민감한 정보를 가릴 수 있는 로직 추가
      if (param === null || param === undefined) return null;
      if (typeof param === 'string' && param.length > 100) {
        return param.substring(0, 97) + '...';
      }
      return param;
    });
  }

  /**
   * 데이터베이스 연결 종료
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      
      monitoring.log('info', 'PostgreSQL 연결 풀 종료됨', {
        category: 'database'
      });
    } catch (error: any) {
      monitoring.log('error', 'PostgreSQL 연결 풀 종료 중 오류 발생', {
        error: error.message,
        stack: error.stack,
        category: 'database'
      });
    }
  }

  /**
   * 데이터베이스 성능 지표 수집
   */
  async collectPerformanceMetrics(): Promise<any> {
    try {
      // 연결 확인
      if (!this.isConnected && !await this.connect()) {
        throw new Error('데이터베이스에 연결할 수 없습니다.');
      }

      // 활성 세션 및 쿼리
      const activeQueries = await this.query(`
        SELECT pid, usename, application_name, client_addr, 
               state, query_start, NOW() - query_start AS duration, 
               query 
        FROM pg_stat_activity 
        WHERE state != 'idle' AND backend_type = 'client backend'
        ORDER BY duration DESC
      `);
      
      // 테이블 통계
      const tableStats = await this.query(`
        SELECT schemaname, relname, seq_scan, seq_tup_read, 
               idx_scan, idx_tup_fetch, n_tup_ins, n_tup_upd, 
               n_tup_del, n_live_tup, n_dead_tup, last_vacuum, 
               last_autovacuum, last_analyze, last_autoanalyze
        FROM pg_stat_user_tables
        WHERE schemaname = $1
        ORDER BY n_live_tup DESC
      `, [DB_SCHEMA]);
      
      // 인덱스 통계
      const indexStats = await this.query(`
        SELECT schemaname, relname, indexrelname, idx_scan, 
               idx_tup_read, idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = $1
        ORDER BY idx_scan DESC
      `, [DB_SCHEMA]);
      
      // 데이터베이스 크기
      const dbSize = await this.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) AS size
      `);
      
      // 테이블 크기
      const tableSize = await this.query(`
        SELECT relname, 
               pg_size_pretty(pg_total_relation_size(relid)) AS total_size, 
               pg_size_pretty(pg_relation_size(relid)) AS table_size,
               pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
        FROM pg_catalog.pg_statio_user_tables
        WHERE schemaname = $1
        ORDER BY pg_total_relation_size(relid) DESC
      `, [DB_SCHEMA]);
      
      // 캐시 적중률
      const cacheHitRatio = await this.query(`
        SELECT 
          sum(heap_blks_read) as heap_read,
          sum(heap_blks_hit) as heap_hit,
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
        FROM pg_statio_user_tables
        WHERE schemaname = $1
      `, [DB_SCHEMA]);
      
      return {
        database_size: dbSize.rows[0],
        active_queries: activeQueries.rows,
        table_stats: tableStats.rows,
        table_sizes: tableSize.rows,
        index_stats: indexStats.rows,
        cache_hit_ratio: cacheHitRatio.rows[0]
      };
    } catch (error: any) {
      monitoring.log('error', 'PostgreSQL 성능 지표 수집 오류', {
        error: error.message,
        stack: error.stack,
        category: 'database'
      });
      
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
export const medicalDataDB = new MedicalDataDB();
export default medicalDataDB; 