import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { monitoring } from '../utils/monitoring';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

// DB 연결 설정 객체
interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number; // 최대 연결 수
  idleTimeoutMillis?: number; // 유휴 연결 제한 시간
  connectionTimeoutMillis?: number; // 연결 제한 시간
}

class PostgresDatabase {
  private pool: Pool;
  private _db: ReturnType<typeof drizzle> | null = null;
  private config: DBConfig;
  private migrationPath: string;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private readonly MAX_CONNECTION_ATTEMPTS = 5;

  constructor() {
    // 환경 변수에서 DB 설정 로드
    this.config = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'medical_data',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      ssl: process.env.POSTGRES_SSL === 'true',
      max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '10'),
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '5000')
    };

    this.migrationPath = path.resolve(process.cwd(), 'drizzle');
    
    // Pool 초기화
    this.pool = new Pool(this.config);
    
    // 연결 이벤트 리스너
    this.pool.on('error', (err) => {
      monitoring.log('error', 'PostgreSQL 연결 오류', { 
        error: err.message, 
        category: 'database', 
        stack: err.stack 
      });
      if (this.isConnected) {
        this.isConnected = false;
        this.reconnect();
      }
    });
  }

  /**
   * 데이터베이스에 연결하고 ORM 인스턴스 초기화
   */
  async connect(): Promise<ReturnType<typeof drizzle>> {
    try {
      if (this._db && this.isConnected) {
        return this._db;
      }

      // 연결 상태 확인
      const client = await this.pool.connect();
      client.release();
      
      // Drizzle ORM 인스턴스 생성
      this._db = drizzle(this.pool);
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      monitoring.log('info', 'PostgreSQL 데이터베이스에 연결되었습니다', { 
        host: this.config.host, 
        database: this.config.database,
        category: 'database' 
      });
      
      return this._db;
    } catch (error: any) {
      this.isConnected = false;
      this.connectionAttempts++;
      
      monitoring.log('error', 'PostgreSQL 연결 실패', { 
        error: error.message, 
        attempt: this.connectionAttempts,
        category: 'database',
        stack: error.stack
      });
      
      if (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
        // 재시도
        monitoring.log('info', `PostgreSQL 연결 재시도 (${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS})`, {
          category: 'database'
        });
        
        // 지수 백오프 적용 (1초, 2초, 4초, 8초, 16초)
        const backoffTime = Math.pow(2, this.connectionAttempts - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        return this.connect();
      } else {
        monitoring.log('error', '최대 재시도 횟수를 초과했습니다. PostgreSQL 연결 실패', { 
          category: 'database' 
        });
        throw new Error(`PostgreSQL 연결 실패: ${error.message}`);
      }
    }
  }

  /**
   * 데이터베이스 연결 재설정
   */
  private async reconnect(): Promise<void> {
    try {
      if (this.isConnected) return;
      
      monitoring.log('info', 'PostgreSQL 연결 재설정 시도', { category: 'database' });
      
      // 기존 풀 종료
      await this.pool.end();
      
      // 새 풀 생성
      this.pool = new Pool(this.config);
      
      // 이벤트 리스너 등록
      this.pool.on('error', (err) => {
        monitoring.log('error', 'PostgreSQL 연결 오류', { 
          error: err.message, 
          category: 'database', 
          stack: err.stack 
        });
        if (this.isConnected) {
          this.isConnected = false;
          this.reconnect();
        }
      });
      
      // 연결 시도
      await this.connect();
    } catch (error: any) {
      monitoring.log('error', 'PostgreSQL 재연결 실패', { 
        error: error.message, 
        category: 'database',
        stack: error.stack
      });
    }
  }

  /**
   * 데이터베이스 마이그레이션 실행
   */
  async runMigrations(): Promise<void> {
    try {
      const db = await this.connect();
      
      // 마이그레이션 폴더 존재 여부 확인
      if (!fs.existsSync(this.migrationPath)) {
        monitoring.log('info', '마이그레이션 폴더가 존재하지 않아 생성합니다', { 
          path: this.migrationPath,
          category: 'database' 
        });
        fs.mkdirSync(this.migrationPath, { recursive: true });
      }
      
      monitoring.log('info', 'PostgreSQL 마이그레이션 시작', { 
        path: this.migrationPath,
        category: 'database' 
      });
      
      await migrate(db, { migrationsFolder: this.migrationPath });
      
      monitoring.log('info', 'PostgreSQL 마이그레이션 완료', { category: 'database' });
    } catch (error: any) {
      monitoring.log('error', 'PostgreSQL 마이그레이션 실패', { 
        error: error.message, 
        category: 'database',
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 데이터베이스 ping 체크
   */
  async ping(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT 1 as ping');
      client.release();
      return result.rows[0].ping === 1;
    } catch (error: any) {
      monitoring.log('error', 'PostgreSQL ping 실패', { 
        error: error.message, 
        category: 'database',
        stack: error.stack
      });
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 데이터베이스 연결 상태 확인
   */
  async checkConnection(): Promise<{ isConnected: boolean; poolStatus: any }> {
    const isAlive = await this.ping();
    const poolStatus = {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
    
    return {
      isConnected: isAlive,
      poolStatus
    };
  }

  /**
   * 데이터베이스 연결 종료
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      monitoring.log('info', 'PostgreSQL 연결 종료', { category: 'database' });
      await this.pool.end();
      this.isConnected = false;
    }
  }

  /**
   * drizzle DB 인스턴스 가져오기
   */
  get db(): ReturnType<typeof drizzle> {
    if (!this._db) {
      throw new Error('데이터베이스에 연결되지 않았습니다. connect()를 먼저 호출하세요.');
    }
    return this._db;
  }
}

// 싱글톤 인스턴스 생성
export const postgres = new PostgresDatabase();

// 기본 내보내기
export default postgres; 