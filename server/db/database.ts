import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';
import { monitoring } from '../utils/monitoring';

/**
 * PostgreSQL 데이터베이스 연결 및 관리를 위한 클래스
 */
export class Database {
  private pool: Pool;
  private static instance: Database;
  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private readonly MAX_RETRIES = 5;
  
  /**
   * 데이터베이스 클래스의 생성자
   * @private
   */
  private constructor() {
    this.pool = new Pool({
      user: config.database.username,
      host: config.database.host,
      database: config.database.database,
      password: config.database.password,
      port: config.database.port,
      max: config.database.poolMax || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    this.pool.on('connect', () => {
      this.isConnected = true;
      this.connectionRetries = 0;
      monitoring.log('info', '데이터베이스에 연결되었습니다', {}, 'database');
    });
    
    this.pool.on('error', (err) => {
      monitoring.log('error', `데이터베이스 연결 오류: ${err.message}`, {}, 'database');
      this.isConnected = false;
      this.reconnect();
    });
  }
  
  /**
   * 데이터베이스 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  
  /**
   * 데이터베이스 연결을 재시도합니다
   * @private
   */
  private async reconnect(): Promise<void> {
    if (this.connectionRetries >= this.MAX_RETRIES) {
      monitoring.log('error', '최대 재연결 시도 횟수를 초과했습니다', {}, 'database');
      return;
    }
    
    this.connectionRetries++;
    monitoring.log('info', `데이터베이스 재연결 시도 ${this.connectionRetries}/${this.MAX_RETRIES}`, {}, 'database');
    
    // 기존 풀 종료
    await this.pool.end();
    
    // 새 풀 생성
    this.pool = new Pool({
      user: config.database.username,
      host: config.database.host,
      database: config.database.database,
      password: config.database.password,
      port: config.database.port,
      max: config.database.poolMax || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  
  /**
   * SQL 쿼리를 실행합니다
   * @param text SQL 쿼리 문자열
   * @param params 쿼리 파라미터
   */
  public async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      monitoring.log('debug', `쿼리 실행: ${text}, 파라미터: ${params ? JSON.stringify(params) : 'none'}, 소요시간: ${duration}ms`, {}, 'database');
      
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      monitoring.log('error', `쿼리 실행 오류: ${err.message}, 쿼리: ${text}`, {}, 'database');
      throw error;
    }
  }
  
  /**
   * 트랜잭션을 시작합니다
   */
  public async beginTransaction(): Promise<PoolClient> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      return client;
    } catch (error: unknown) {
      client.release();
      const err = error as Error;
      monitoring.log('error', `트랜잭션 시작 오류: ${err.message}`, {}, 'database');
      throw error;
    }
  }
  
  /**
   * 트랜잭션을 커밋합니다
   * @param client 데이터베이스 클라이언트
   */
  public async commitTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('COMMIT');
    } catch (error: unknown) {
      const err = error as Error;
      monitoring.log('error', `트랜잭션 커밋 오류: ${err.message}`, {}, 'database');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * 트랜잭션을 롤백합니다
   * @param client 데이터베이스 클라이언트
   */
  public async rollbackTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK');
    } catch (error: unknown) {
      const err = error as Error;
      monitoring.log('error', `트랜잭션 롤백 오류: ${err.message}`, {}, 'database');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * 트랜잭션 내에서 쿼리를 실행합니다
   * @param client 데이터베이스 클라이언트
   * @param text SQL 쿼리 문자열
   * @param params 쿼리 파라미터
   */
  public async queryWithTransaction<T = any>(
    client: PoolClient,
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    try {
      const start = Date.now();
      const result = await client.query<T>(text, params);
      const duration = Date.now() - start;
      
      monitoring.log('debug', `트랜잭션 쿼리 실행: ${text}, 소요시간: ${duration}ms`, {}, 'database');
      
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      monitoring.log('error', `트랜잭션 쿼리 실행 오류: ${err.message}, 쿼리: ${text}`, {}, 'database');
      throw error;
    }
  }
  
  /**
   * 데이터베이스 연결 상태를 확인합니다
   */
  public async checkConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      monitoring.log('error', `데이터베이스 연결 상태 확인 오류: ${err.message}`, {}, 'database');
      return false;
    }
  }
  
  /**
   * 데이터베이스 연결을 종료합니다
   */
  public async closeConnection(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      monitoring.log('info', '데이터베이스 연결이 종료되었습니다', {}, 'database');
    } catch (error: unknown) {
      const err = error as Error;
      monitoring.log('error', `데이터베이스 연결 종료 오류: ${err.message}`, {}, 'database');
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
export const db = Database.getInstance(); 