import { db } from '../db/database';
import { monitoring } from '../utils/monitoring';
import { v4 as uuidv4 } from 'uuid';

/**
 * 건강 데이터 관련 타입 정의
 */
export enum HealthDataType {
  VITAL_SIGNS = 'vital_signs',
  LAB_RESULT = 'lab_result',
  MEDICATION = 'medication',
  DIAGNOSIS = 'diagnosis',
  PROCEDURE = 'procedure',
  IMAGING = 'imaging',
  ECG = 'ecg',
  SLEEP_DATA = 'sleep_data',
  EXERCISE = 'exercise',
  DIETARY = 'dietary',
  MENTAL_HEALTH = 'mental_health',
  CUSTOM = 'custom'
}

export interface VitalSigns {
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  painLevel?: number;
}

export interface LabResult {
  testName: string;
  testCode?: string;
  value: number | string;
  unit?: string;
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  abnormalFlag?: 'normal' | 'high' | 'low' | 'critical';
  observationDate?: Date;
  specimenType?: string;
}

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: Date;
  endDate?: Date;
  prescriber?: string;
  reason?: string;
  instructions?: string;
  active: boolean;
}

export interface Diagnosis {
  condition: string;
  icdCode?: string;
  diagnosisDate?: Date;
  diagnosedBy?: string;
  status: 'active' | 'resolved' | 'remission' | 'recurrence';
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

export interface HealthDataEntry {
  id?: string;
  userId: number;
  type: HealthDataType;
  recordedAt: Date;
  deviceId?: string;
  deviceType?: string;
  sourceName?: string;
  metadata?: Record<string, any>;
  data: VitalSigns | LabResult | Medication | Diagnosis | any;
}

/**
 * 건강 데이터 쿼리 옵션
 */
export interface HealthDataQueryOptions {
  userId?: number;
  type?: HealthDataType | HealthDataType[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'recordedAt' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
  includeMetadata?: boolean;
  deviceId?: string;
  sourceName?: string;
}

/**
 * 건강 데이터 관리 클래스
 */
export class HealthDataManager {
  private static instance: HealthDataManager;
  
  private constructor() {}
  
  /**
   * HealthDataManager 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): HealthDataManager {
    if (!HealthDataManager.instance) {
      HealthDataManager.instance = new HealthDataManager();
    }
    return HealthDataManager.instance;
  }
  
  /**
   * 새로운 건강 데이터를 저장합니다
   * @param entry 건강 데이터 항목
   */
  public async saveHealthData(entry: HealthDataEntry): Promise<string> {
    try {
      const id = entry.id || uuidv4();
      const now = new Date();
      
      await db.query(
        `INSERT INTO health_data (
          id, user_id, type, recorded_at, device_id, device_type, 
          source_name, metadata, data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          entry.userId,
          entry.type,
          entry.recordedAt,
          entry.deviceId || null,
          entry.deviceType || null,
          entry.sourceName || null,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
          JSON.stringify(entry.data),
          now,
          now
        ]
      );
      
      monitoring.log('health', 'info', `사용자 ${entry.userId}의 건강 데이터(${entry.type}) 저장 완료`);
      return id;
    } catch (error) {
      monitoring.log('health', 'error', `건강 데이터 저장 오류: ${error.message}`);
      throw new Error(`건강 데이터 저장 오류: ${error.message}`);
    }
  }
  
  /**
   * 여러 건강 데이터를 일괄 저장합니다
   * @param entries 건강 데이터 항목 배열
   */
  public async bulkSaveHealthData(entries: HealthDataEntry[]): Promise<string[]> {
    if (entries.length === 0) {
      return [];
    }
    
    const client = await db.beginTransaction();
    const ids: string[] = [];
    
    try {
      const now = new Date();
      
      for (const entry of entries) {
        const id = entry.id || uuidv4();
        ids.push(id);
        
        await db.queryWithTransaction(
          client,
          `INSERT INTO health_data (
            id, user_id, type, recorded_at, device_id, device_type, 
            source_name, metadata, data, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            id,
            entry.userId,
            entry.type,
            entry.recordedAt,
            entry.deviceId || null,
            entry.deviceType || null,
            entry.sourceName || null,
            entry.metadata ? JSON.stringify(entry.metadata) : null,
            JSON.stringify(entry.data),
            now,
            now
          ]
        );
      }
      
      await db.commitTransaction(client);
      monitoring.log('health', 'info', `${entries.length}개 건강 데이터 일괄 저장 완료`);
      return ids;
    } catch (error) {
      await db.rollbackTransaction(client);
      monitoring.log('health', 'error', `건강 데이터 일괄 저장 오류: ${error.message}`);
      throw new Error(`건강 데이터 일괄 저장 오류: ${error.message}`);
    }
  }
  
  /**
   * 건강 데이터를 조회합니다
   * @param id 건강 데이터 ID
   */
  public async getHealthDataById(id: string): Promise<HealthDataEntry | null> {
    try {
      const result = await db.query(
        `SELECT
          id, user_id, type, recorded_at, device_id, device_type, 
          source_name, metadata, data
        FROM health_data
        WHERE id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapDbRowToHealthData(result.rows[0]);
    } catch (error) {
      monitoring.log('health', 'error', `건강 데이터 조회 오류: ${error.message}`);
      throw new Error(`건강 데이터 조회 오류: ${error.message}`);
    }
  }
  
  /**
   * 건강 데이터를 검색합니다
   * @param options 검색 옵션
   */
  public async queryHealthData(options: HealthDataQueryOptions): Promise<{
    data: HealthDataEntry[];
    total: number;
  }> {
    try {
      const queryParams: any[] = [];
      let queryConditions: string[] = [];
      
      if (options.userId !== undefined) {
        queryParams.push(options.userId);
        queryConditions.push(`user_id = $${queryParams.length}`);
      }
      
      if (options.type !== undefined) {
        if (Array.isArray(options.type)) {
          if (options.type.length > 0) {
            const typePlaceholders = options.type.map((_, i) => `$${queryParams.length + i + 1}`).join(', ');
            queryParams.push(...options.type);
            queryConditions.push(`type IN (${typePlaceholders})`);
          }
        } else {
          queryParams.push(options.type);
          queryConditions.push(`type = $${queryParams.length}`);
        }
      }
      
      if (options.startDate !== undefined) {
        queryParams.push(options.startDate);
        queryConditions.push(`recorded_at >= $${queryParams.length}`);
      }
      
      if (options.endDate !== undefined) {
        queryParams.push(options.endDate);
        queryConditions.push(`recorded_at <= $${queryParams.length}`);
      }
      
      if (options.deviceId !== undefined) {
        queryParams.push(options.deviceId);
        queryConditions.push(`device_id = $${queryParams.length}`);
      }
      
      if (options.sourceName !== undefined) {
        queryParams.push(options.sourceName);
        queryConditions.push(`source_name = $${queryParams.length}`);
      }
      
      // 조건이 없으면 전체 데이터를 대상으로 함
      const whereClause = queryConditions.length > 0
        ? `WHERE ${queryConditions.join(' AND ')}`
        : '';
      
      // 정렬 설정
      const sortBy = options.sortBy || 'recordedAt';
      const sortColumn = sortBy === 'recordedAt' ? 'recorded_at' : 'created_at';
      const sortDirection = options.sortDirection === 'asc' ? 'ASC' : 'DESC';
      
      // 페이지네이션 설정
      const limit = options.limit || 100;
      const offset = options.offset || 0;
      
      // 총 개수 조회
      const countQuery = `
        SELECT COUNT(*) as total
        FROM health_data
        ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total, 10);
      
      // 필드 선택
      const selectedFields = options.includeMetadata
        ? 'id, user_id, type, recorded_at, device_id, device_type, source_name, metadata, data'
        : 'id, user_id, type, recorded_at, device_id, device_type, source_name, data';
      
      // 데이터 조회
      const dataQuery = `
        SELECT ${selectedFields}
        FROM health_data
        ${whereClause}
        ORDER BY ${sortColumn} ${sortDirection}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;
      
      queryParams.push(limit, offset);
      const dataResult = await db.query(dataQuery, queryParams);
      
      const data = dataResult.rows.map(row => this.mapDbRowToHealthData(row));
      
      return { data, total };
    } catch (error) {
      monitoring.log('health', 'error', `건강 데이터 검색 오류: ${error.message}`);
      throw new Error(`건강 데이터 검색 오류: ${error.message}`);
    }
  }
  
  /**
   * 건강 데이터를 업데이트합니다
   * @param id 건강 데이터 ID
   * @param updates 업데이트할 필드
   */
  public async updateHealthData(
    id: string,
    updates: Partial<Omit<HealthDataEntry, 'id' | 'userId'>>
  ): Promise<boolean> {
    try {
      const existingData = await this.getHealthDataById(id);
      if (!existingData) {
        return false;
      }
      
      const updateFields: string[] = [];
      const queryParams: any[] = [id];
      
      if (updates.type !== undefined) {
        queryParams.push(updates.type);
        updateFields.push(`type = $${queryParams.length}`);
      }
      
      if (updates.recordedAt !== undefined) {
        queryParams.push(updates.recordedAt);
        updateFields.push(`recorded_at = $${queryParams.length}`);
      }
      
      if (updates.deviceId !== undefined) {
        queryParams.push(updates.deviceId);
        updateFields.push(`device_id = $${queryParams.length}`);
      }
      
      if (updates.deviceType !== undefined) {
        queryParams.push(updates.deviceType);
        updateFields.push(`device_type = $${queryParams.length}`);
      }
      
      if (updates.sourceName !== undefined) {
        queryParams.push(updates.sourceName);
        updateFields.push(`source_name = $${queryParams.length}`);
      }
      
      if (updates.metadata !== undefined) {
        queryParams.push(JSON.stringify(updates.metadata));
        updateFields.push(`metadata = $${queryParams.length}`);
      }
      
      if (updates.data !== undefined) {
        queryParams.push(JSON.stringify(updates.data));
        updateFields.push(`data = $${queryParams.length}`);
      }
      
      if (updateFields.length === 0) {
        return true; // 업데이트할 필드가 없음
      }
      
      queryParams.push(new Date());
      updateFields.push(`updated_at = $${queryParams.length}`);
      
      const query = `
        UPDATE health_data
        SET ${updateFields.join(', ')}
        WHERE id = $1
      `;
      
      const result = await db.query(query, queryParams);
      
      const success = result.rowCount > 0;
      if (success) {
        monitoring.log('health', 'info', `건강 데이터 ID ${id} 업데이트 완료`);
      }
      
      return success;
    } catch (error) {
      monitoring.log('health', 'error', `건강 데이터 업데이트 오류: ${error.message}`);
      throw new Error(`건강 데이터 업데이트 오류: ${error.message}`);
    }
  }
  
  /**
   * 건강 데이터를 삭제합니다
   * @param id 건강 데이터 ID
   */
  public async deleteHealthData(id: string): Promise<boolean> {
    try {
      const result = await db.query(
        'DELETE FROM health_data WHERE id = $1',
        [id]
      );
      
      const success = result.rowCount > 0;
      if (success) {
        monitoring.log('health', 'info', `건강 데이터 ID ${id} 삭제 완료`);
      }
      
      return success;
    } catch (error) {
      monitoring.log('health', 'error', `건강 데이터 삭제 오류: ${error.message}`);
      throw new Error(`건강 데이터 삭제 오류: ${error.message}`);
    }
  }
  
  /**
   * 특정 사용자의 모든 건강 데이터를 삭제합니다
   * @param userId 사용자 ID
   */
  public async deleteUserHealthData(userId: number): Promise<number> {
    try {
      const result = await db.query(
        'DELETE FROM health_data WHERE user_id = $1',
        [userId]
      );
      
      const count = result.rowCount;
      monitoring.log('health', 'info', `사용자 ${userId}의 건강 데이터 ${count}개 삭제 완료`);
      
      return count;
    } catch (error) {
      monitoring.log('health', 'error', `사용자 건강 데이터 삭제 오류: ${error.message}`);
      throw new Error(`사용자 건강 데이터 삭제 오류: ${error.message}`);
    }
  }
  
  /**
   * 특정 사용자의 건강 데이터 통계를 조회합니다
   * @param userId 사용자 ID
   */
  public async getUserHealthStatistics(userId: number): Promise<Record<string, any>> {
    try {
      // 데이터 유형별 개수
      const typeCountQuery = `
        SELECT type, COUNT(*) as count
        FROM health_data
        WHERE user_id = $1
        GROUP BY type
        ORDER BY count DESC
      `;
      
      const typeCountResult = await db.query(typeCountQuery, [userId]);
      const typeCounts = typeCountResult.rows.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count, 10);
        return acc;
      }, {});
      
      // 최근 업데이트 날짜
      const lastUpdateQuery = `
        SELECT MAX(recorded_at) as last_update
        FROM health_data
        WHERE user_id = $1
      `;
      
      const lastUpdateResult = await db.query(lastUpdateQuery, [userId]);
      const lastUpdate = lastUpdateResult.rows[0]?.last_update || null;
      
      // 데이터 소스별 개수
      const sourceCountQuery = `
        SELECT source_name, COUNT(*) as count
        FROM health_data
        WHERE user_id = $1 AND source_name IS NOT NULL
        GROUP BY source_name
        ORDER BY count DESC
      `;
      
      const sourceCountResult = await db.query(sourceCountQuery, [userId]);
      const sourceCounts = sourceCountResult.rows.reduce((acc, row) => {
        acc[row.source_name] = parseInt(row.count, 10);
        return acc;
      }, {});
      
      // 결과 조합
      return {
        totalRecords: Object.values(typeCounts).reduce((sum: any, count: any) => sum + count, 0),
        byType: typeCounts,
        bySource: sourceCounts,
        lastUpdate
      };
    } catch (error) {
      monitoring.log('health', 'error', `사용자 건강 통계 조회 오류: ${error.message}`);
      throw new Error(`사용자 건강 통계 조회 오류: ${error.message}`);
    }
  }
  
  /**
   * 데이터베이스 행을 HealthDataEntry 객체로 변환합니다
   * @param row 데이터베이스 행
   */
  private mapDbRowToHealthData(row: any): HealthDataEntry {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      recordedAt: row.recorded_at,
      deviceId: row.device_id,
      deviceType: row.device_type,
      sourceName: row.source_name,
      metadata: row.metadata ? row.metadata : undefined,
      data: row.data
    };
  }
}

// 싱글톤 인스턴스 생성
export const healthDataManager = HealthDataManager.getInstance(); 