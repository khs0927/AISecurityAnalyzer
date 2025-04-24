import { db } from './database';
import { monitoring } from '../utils/monitoring';

/**
 * 데이터베이스 스키마 초기화 및 관리를 위한 클래스
 */
export class DatabaseSchema {
  /**
   * 모든 데이터베이스 테이블을 초기화합니다
   */
  public static async initializeAllTables(): Promise<void> {
    try {
      monitoring.log('database', 'info', '데이터베이스 스키마 초기화 시작');
      
      // 테이블 생성 순서 중요 (외래 키 제약조건 때문)
      await DatabaseSchema.createUserTable();
      await DatabaseSchema.createMedicalPaperTable();
      await DatabaseSchema.createMedicalDatasetTable();
      await DatabaseSchema.createHealthDataTable();
      await DatabaseSchema.createSearchHistoryTable();
      
      monitoring.log('database', 'info', '데이터베이스 스키마 초기화 완료');
    } catch (error) {
      monitoring.log('database', 'error', `데이터베이스 스키마 초기화 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * users 테이블을 생성합니다
   */
  private static async createUserTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(200),
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `;
    
    try {
      await db.query(query);
      monitoring.log('database', 'info', 'users 테이블 생성 완료');
    } catch (error) {
      monitoring.log('database', 'error', `users 테이블 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * medical_papers 테이블을 생성합니다
   */
  private static async createMedicalPaperTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS medical_papers (
        id SERIAL PRIMARY KEY,
        pubmed_id VARCHAR(20) UNIQUE,
        title TEXT NOT NULL,
        abstract TEXT,
        authors TEXT[],
        publication_date DATE,
        journal VARCHAR(255),
        doi VARCHAR(100),
        keywords TEXT[],
        citation_count INTEGER DEFAULT 0,
        full_text_available BOOLEAN DEFAULT false,
        source_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_medical_papers_pubmed_id ON medical_papers(pubmed_id);
      CREATE INDEX IF NOT EXISTS idx_medical_papers_title ON medical_papers USING gin(to_tsvector('english', title));
      CREATE INDEX IF NOT EXISTS idx_medical_papers_keywords ON medical_papers USING gin(keywords);
    `;
    
    try {
      await db.query(query);
      monitoring.log('database', 'info', 'medical_papers 테이블 생성 완료');
    } catch (error) {
      monitoring.log('database', 'error', `medical_papers 테이블 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * medical_datasets 테이블을 생성합니다
   */
  private static async createMedicalDatasetTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS medical_datasets (
        id SERIAL PRIMARY KEY,
        kaggle_id VARCHAR(100) UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        owner VARCHAR(100),
        file_size_bytes BIGINT,
        download_count INTEGER DEFAULT 0,
        last_updated TIMESTAMP,
        tags TEXT[],
        file_formats TEXT[],
        url VARCHAR(255),
        license_name VARCHAR(100),
        license_url VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_medical_datasets_kaggle_id ON medical_datasets(kaggle_id);
      CREATE INDEX IF NOT EXISTS idx_medical_datasets_title ON medical_datasets USING gin(to_tsvector('english', title));
      CREATE INDEX IF NOT EXISTS idx_medical_datasets_tags ON medical_datasets USING gin(tags);
    `;
    
    try {
      await db.query(query);
      monitoring.log('database', 'info', 'medical_datasets 테이블 생성 완료');
    } catch (error) {
      monitoring.log('database', 'error', `medical_datasets 테이블 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * health_data 테이블을 생성합니다
   */
  private static async createHealthDataTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS health_data (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data_type VARCHAR(50) NOT NULL,
        data_value JSONB NOT NULL,
        recorded_at TIMESTAMP NOT NULL,
        device_info JSONB,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT valid_data_type CHECK (
          data_type IN ('heart_rate', 'blood_pressure', 'blood_glucose', 'weight', 'sleep', 'steps', 'ecg', 'medication', 'other')
        )
      );
      
      CREATE INDEX IF NOT EXISTS idx_health_data_user_id ON health_data(user_id);
      CREATE INDEX IF NOT EXISTS idx_health_data_data_type ON health_data(data_type);
      CREATE INDEX IF NOT EXISTS idx_health_data_recorded_at ON health_data(recorded_at);
    `;
    
    try {
      await db.query(query);
      monitoring.log('database', 'info', 'health_data 테이블 생성 완료');
    } catch (error) {
      monitoring.log('database', 'error', `health_data 테이블 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * search_history 테이블을 생성합니다
   */
  private static async createSearchHistoryTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS search_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        search_query TEXT NOT NULL,
        search_type VARCHAR(50) NOT NULL,
        result_count INTEGER,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT valid_search_type CHECK (
          search_type IN ('pubmed', 'kaggle', 'health_data', 'combined')
        )
      );
      
      CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_search_history_search_type ON search_history(search_type);
      CREATE INDEX IF NOT EXISTS idx_search_history_executed_at ON search_history(executed_at);
    `;
    
    try {
      await db.query(query);
      monitoring.log('database', 'info', 'search_history 테이블 생성 완료');
    } catch (error) {
      monitoring.log('database', 'error', `search_history 테이블 생성 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 데이터베이스 테이블 구조를 업데이트합니다
   * @param version 업데이트할 버전 번호
   */
  public static async upgradeSchema(version: number): Promise<void> {
    try {
      // 현재 스키마 버전 확인
      const currentVersionResult = await db.query(
        "SELECT current_setting('app.schema_version', true) as version"
      );
      
      let currentVersion: number;
      if (currentVersionResult.rows[0].version === null) {
        // 설정이 없으면 초기 버전 설정
        await db.query("SELECT set_config('app.schema_version', '1', false)");
        currentVersion = 1;
      } else {
        currentVersion = parseInt(currentVersionResult.rows[0].version, 10);
      }
      
      if (currentVersion >= version) {
        monitoring.log('database', 'info', `현재 스키마 버전(${currentVersion})이 요청된 버전(${version})보다 높거나 같습니다. 업그레이드가 필요하지 않습니다.`);
        return;
      }
      
      monitoring.log('database', 'info', `스키마 버전 업그레이드: ${currentVersion} -> ${version}`);
      
      // 버전별 업그레이드 로직 실행
      switch (currentVersion) {
        case 1:
          if (version >= 2) await this.upgradeToV2();
          // 다음 버전으로 계속 진행됨
          if (version >= 3) await this.upgradeToV3();
          break;
        case 2:
          if (version >= 3) await this.upgradeToV3();
          break;
      }
      
      // 스키마 버전 업데이트
      await db.query("SELECT set_config('app.schema_version', $1, false)", [version.toString()]);
      monitoring.log('database', 'info', `스키마 버전이 ${version}으로 업그레이드되었습니다.`);
    } catch (error) {
      monitoring.log('database', 'error', `스키마 업그레이드 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 스키마 버전 2로 업그레이드
   */
  private static async upgradeToV2(): Promise<void> {
    const client = await db.beginTransaction();
    
    try {
      // 의료 논문에 분류 필드 추가
      await db.queryWithTransaction(
        client,
        `ALTER TABLE medical_papers
         ADD COLUMN IF NOT EXISTS categories TEXT[]`
      );
      
      // 데이터셋에 평점 필드 추가
      await db.queryWithTransaction(
        client,
        `ALTER TABLE medical_datasets
         ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 5)`
      );
      
      await db.commitTransaction(client);
      monitoring.log('database', 'info', '스키마 버전 2로 업그레이드 완료');
    } catch (error) {
      await db.rollbackTransaction(client);
      monitoring.log('database', 'error', `스키마 버전 2 업그레이드 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 스키마 버전 3으로 업그레이드
   */
  private static async upgradeToV3(): Promise<void> {
    const client = await db.beginTransaction();
    
    try {
      // 사용자 즐겨찾기 테이블 추가
      await db.queryWithTransaction(
        client,
        `CREATE TABLE IF NOT EXISTS user_favorites (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          item_type VARCHAR(50) NOT NULL,
          item_id INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT valid_item_type CHECK (
            item_type IN ('paper', 'dataset')
          ),
          
          CONSTRAINT unique_user_favorite UNIQUE (user_id, item_type, item_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_favorites_item ON user_favorites(item_type, item_id);`
      );
      
      await db.commitTransaction(client);
      monitoring.log('database', 'info', '스키마 버전 3으로 업그레이드 완료');
    } catch (error) {
      await db.rollbackTransaction(client);
      monitoring.log('database', 'error', `스키마 버전 3 업그레이드 오류: ${error.message}`);
      throw error;
    }
  }
}

// 데이터베이스 스키마 내보내기
export const dbSchema = DatabaseSchema; 