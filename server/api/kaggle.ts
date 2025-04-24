import axios from 'axios';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import * as fs from 'fs/promises';
import * as path from 'path';
import { db } from '../db/database';
import { monitoring } from '../utils/monitoring';
import { config } from '../config';

/**
 * Kaggle API 관련 인터페이스
 */
export interface KaggleDataset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  url: string;
  isPrivate: boolean;
  licenseName: string;
  ownerName: string;
  ownerRef: string;
  lastUpdated: Date;
  downloadCount: number;
  voteCount: number;
  usabilityRating: number;
  tags: string[];
  fileCount: number;
  totalSize: number;
  downloadSize: number;
  fileTypes: string[];
}

export interface KaggleSearchOptions {
  query: string;
  maxResults?: number;
  page?: number;
  sortBy?: 'relevance' | 'published' | 'downloadCount' | 'voteCount';
  fileType?: string;
  licenses?: string[];
  tags?: string[];
  minSize?: number;
  maxSize?: number;
  hasTables?: boolean;
}

export interface KaggleDownloadOptions {
  datasetId: string;
  filePath?: string;
  targetDir?: string;
  fileName?: string;
  unzip?: boolean;
}

/**
 * Kaggle API와 상호작용하는 클래스
 */
export class KaggleAPI {
  private static instance: KaggleAPI;
  private readonly baseUrl = 'https://www.kaggle.com/api/v1';
  private username: string;
  private key: string;
  private tempDir: string;
  
  private constructor() {
    this.username = config.apis.kaggle.username;
    this.key = config.apis.kaggle.key;
    this.tempDir = path.join(process.cwd(), 'tmp', 'kaggle');
    
    if (!this.username || !this.key) {
      monitoring.log('api', 'warn', 'Kaggle API 인증 정보가 설정되지 않았습니다.');
    }
  }
  
  /**
   * Kaggle API 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): KaggleAPI {
    if (!KaggleAPI.instance) {
      KaggleAPI.instance = new KaggleAPI();
    }
    return KaggleAPI.instance;
  }
  
  /**
   * API 호출을 위한 인증 헤더를 생성합니다
   */
  private getAuthHeaders() {
    const auth = Buffer.from(`${this.username}:${this.key}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Kaggle API 인증 정보가 유효한지 확인합니다
   */
  public async validateCredentials(): Promise<boolean> {
    if (!this.username || !this.key) {
      return false;
    }
    
    try {
      await axios.get(`${this.baseUrl}/datasets/list`, {
        headers: this.getAuthHeaders(),
        params: { limit: 1 }
      });
      return true;
    } catch (error) {
      monitoring.log('api', 'error', `Kaggle API 인증 실패: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Kaggle 데이터셋을 검색합니다
   * @param options 검색 옵션
   */
  public async searchDatasets(options: KaggleSearchOptions): Promise<KaggleDataset[]> {
    try {
      monitoring.log('api', 'info', `Kaggle 데이터셋 검색 시작: ${options.query}`);
      
      const params: any = {
        search: options.query,
        limit: options.maxResults || 20,
        page: options.page || 1
      };
      
      if (options.sortBy) {
        params.sortBy = options.sortBy;
      }
      
      if (options.fileType) {
        params.fileType = options.fileType;
      }
      
      if (options.licenses && options.licenses.length > 0) {
        params.licenses = options.licenses.join(',');
      }
      
      if (options.tags && options.tags.length > 0) {
        params.tagIds = options.tags.join(',');
      }
      
      if (options.hasTables !== undefined) {
        params.hasTables = options.hasTables;
      }
      
      const response = await axios.get(`${this.baseUrl}/datasets/list`, {
        headers: this.getAuthHeaders(),
        params
      });
      
      const datasets = this.transformKaggleDatasets(response.data);
      
      monitoring.log('api', 'info', `Kaggle 데이터셋 검색 완료: ${datasets.length}개 데이터셋 발견`);
      
      // 검색 기록 저장
      this.saveSearchHistory(options.query, datasets.length);
      
      return datasets;
    } catch (error) {
      monitoring.log('api', 'error', `Kaggle 데이터셋 검색 오류: ${error.message}`);
      throw new Error(`Kaggle 데이터셋 검색 오류: ${error.message}`);
    }
  }
  
  /**
   * Kaggle API 응답을 KaggleDataset 객체로 변환합니다
   * @param data API 응답 데이터
   */
  private transformKaggleDatasets(data: any[]): KaggleDataset[] {
    return data.map(item => ({
      id: item.ref,
      title: item.title,
      subtitle: item.subtitle || '',
      description: item.description || '',
      url: `https://www.kaggle.com/datasets/${item.ref}`,
      isPrivate: item.isPrivate || false,
      licenseName: item.licenseName || '',
      ownerName: item.ownerName || '',
      ownerRef: item.ownerRef || '',
      lastUpdated: new Date(item.lastUpdated || Date.now()),
      downloadCount: item.downloadCount || 0,
      voteCount: item.voteCount || 0,
      usabilityRating: item.usabilityRating || 0,
      tags: item.tags ? item.tags.map((tag: any) => tag.name) : [],
      fileCount: item.fileCount || 0,
      totalSize: item.totalBytes || 0,
      downloadSize: item.downloadBytes || 0,
      fileTypes: item.files ? item.files.map((file: any) => path.extname(file.name).substring(1)) : []
    }));
  }
  
  /**
   * 데이터셋에 포함된 파일 목록을 가져옵니다
   * @param datasetId 데이터셋 ID
   */
  public async getDatasetFiles(datasetId: string): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/datasets/list/${datasetId}/files`, {
        headers: this.getAuthHeaders()
      });
      
      return response.data.map((file: any) => file.name);
    } catch (error) {
      monitoring.log('api', 'error', `Kaggle 데이터셋 파일 목록 가져오기 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Kaggle 데이터셋을 다운로드합니다
   * @param options 다운로드 옵션
   */
  public async downloadDataset(options: KaggleDownloadOptions): Promise<string> {
    const { datasetId, filePath, targetDir, fileName, unzip = true } = options;
    
    // 데이터셋을 저장할 디렉토리 생성
    const downloadDir = targetDir || path.join(this.tempDir, datasetId.replace('/', '_'));
    await this.ensureDirectoryExists(downloadDir);
    
    const downloadUrl = filePath
      ? `${this.baseUrl}/datasets/download/${datasetId}/${filePath}`
      : `${this.baseUrl}/datasets/download/${datasetId}`;
    
    const outputFile = fileName
      ? path.join(downloadDir, fileName)
      : path.join(downloadDir, 'dataset.zip');
    
    try {
      monitoring.log('api', 'info', `Kaggle 데이터셋 다운로드 시작: ${datasetId}`);
      
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        headers: this.getAuthHeaders(),
        responseType: 'stream'
      });
      
      const writer = createWriteStream(outputFile);
      await pipeline(response.data, writer);
      
      monitoring.log('api', 'info', `Kaggle 데이터셋 다운로드 완료: ${outputFile}`);
      
      // ZIP 파일 압축 해제
      if (unzip && outputFile.endsWith('.zip')) {
        await this.unzipFile(outputFile, downloadDir);
      }
      
      return downloadDir;
    } catch (error) {
      monitoring.log('api', 'error', `Kaggle 데이터셋 다운로드 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 특정 디렉토리가 존재하는지 확인하고, 없으면 생성합니다
   * @param dir 디렉토리 경로
   */
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
      monitoring.log('system', 'info', `디렉토리 생성: ${dir}`);
    }
  }
  
  /**
   * ZIP 파일을 압축 해제합니다
   * @param zipFile ZIP 파일 경로
   * @param targetDir 압축 해제 대상 디렉토리
   */
  private async unzipFile(zipFile: string, targetDir: string): Promise<void> {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    try {
      monitoring.log('system', 'info', `ZIP 파일 압축 해제 시작: ${zipFile}`);
      
      await execPromise(`unzip -o "${zipFile}" -d "${targetDir}"`);
      
      monitoring.log('system', 'info', `ZIP 파일 압축 해제 완료: ${targetDir}`);
    } catch (error) {
      monitoring.log('system', 'error', `ZIP 파일 압축 해제 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 검색 기록을 데이터베이스에 저장합니다
   * @param query 검색 쿼리
   * @param resultCount 결과 수
   * @param userId 사용자 ID (선택사항)
   */
  private async saveSearchHistory(query: string, resultCount: number, userId?: number): Promise<void> {
    try {
      await db.query(
        `INSERT INTO search_history (user_id, search_query, search_type, result_count)
         VALUES ($1, $2, $3, $4)`,
        [userId, query, 'kaggle', resultCount]
      );
    } catch (error) {
      monitoring.log('database', 'error', `검색 기록 저장 오류: ${error.message}`);
      // 검색 기록 저장 실패는 전체 작업을 중단시키지 않음
    }
  }
  
  /**
   * 데이터셋 정보를 데이터베이스에 저장합니다
   * @param datasets 데이터셋 목록
   */
  public async saveDatasetsToDatabase(datasets: KaggleDataset[]): Promise<number> {
    if (datasets.length === 0) {
      return 0;
    }
    
    let savedCount = 0;
    const client = await db.beginTransaction();
    
    try {
      for (const dataset of datasets) {
        // 이미 존재하는 데이터셋인지 확인
        const existingResult = await db.queryWithTransaction(
          client,
          'SELECT id FROM medical_datasets WHERE kaggle_id = $1',
          [dataset.id]
        );
        
        if (existingResult.rows.length > 0) {
          // 이미 존재하면 업데이트
          await db.queryWithTransaction(
            client,
            `UPDATE medical_datasets
             SET 
               title = $1,
               description = $2,
               owner = $3,
               file_size_bytes = $4,
               download_count = $5,
               last_updated = $6,
               tags = $7,
               file_formats = $8,
               url = $9,
               license_name = $10,
               updated_at = CURRENT_TIMESTAMP
             WHERE kaggle_id = $11`,
            [
              dataset.title,
              dataset.description,
              dataset.ownerName,
              dataset.totalSize,
              dataset.downloadCount,
              dataset.lastUpdated,
              dataset.tags,
              [...new Set(dataset.fileTypes)], // 중복 제거
              dataset.url,
              dataset.licenseName,
              dataset.id
            ]
          );
        } else {
          // 새로운 데이터셋 삽입
          await db.queryWithTransaction(
            client,
            `INSERT INTO medical_datasets (
               kaggle_id, title, description, owner, file_size_bytes,
               download_count, last_updated, tags, file_formats, url,
               license_name
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              dataset.id,
              dataset.title,
              dataset.description,
              dataset.ownerName,
              dataset.totalSize,
              dataset.downloadCount,
              dataset.lastUpdated,
              dataset.tags,
              [...new Set(dataset.fileTypes)], // 중복 제거
              dataset.url,
              dataset.licenseName
            ]
          );
          savedCount++;
        }
      }
      
      await db.commitTransaction(client);
      monitoring.log('database', 'info', `${savedCount}개의 새로운 데이터셋이 데이터베이스에 저장되었습니다`);
      return savedCount;
    } catch (error) {
      await db.rollbackTransaction(client);
      monitoring.log('database', 'error', `데이터셋 저장 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 임시 파일을 정리합니다
   * @param olderThanDays 특정 일수보다 오래된 파일만 삭제
   */
  public async cleanupTempFiles(olderThanDays = 7): Promise<number> {
    try {
      const now = Date.now();
      const maxAge = olderThanDays * 24 * 60 * 60 * 1000; // 일 -> 밀리초
      
      // 임시 디렉토리가 존재하는지 확인
      try {
        await fs.access(this.tempDir);
      } catch {
        // 디렉토리가 없으면 생성하고 종료
        await fs.mkdir(this.tempDir, { recursive: true });
        return 0;
      }
      
      // 디렉토리 내 모든 항목 가져오기
      const items = await fs.readdir(this.tempDir);
      let deletedCount = 0;
      
      for (const item of items) {
        const itemPath = path.join(this.tempDir, item);
        const stats = await fs.stat(itemPath);
        
        // 파일 생성 시간 확인
        const age = now - stats.birthtime.getTime();
        
        if (age > maxAge) {
          if (stats.isDirectory()) {
            await fs.rm(itemPath, { recursive: true, force: true });
          } else {
            await fs.unlink(itemPath);
          }
          deletedCount++;
        }
      }
      
      monitoring.log('temp-files', 'info', `${deletedCount}개의 임시 파일이 정리되었습니다`);
      return deletedCount;
    } catch (error) {
      monitoring.log('temp-files', 'error', `임시 파일 정리 오류: ${error.message}`);
      return 0;
    }
  }
}

// 싱글톤 인스턴스 생성
export const kaggleApi = KaggleAPI.getInstance(); 