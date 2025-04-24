import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { db } from '../db';
import { kaggleDatasets } from '../../shared/medicalData.schema';
import { monitoring } from '../utils/monitoring';
import { env } from '../config/env';

const exec = promisify(execCallback);

export class KaggleService {
  private apiUsername: string;
  private apiKey: string;
  private baseUrl = 'https://www.kaggle.com/api/v1';
  private datasetDownloadPath: string;

  constructor() {
    this.apiUsername = env.KAGGLE_USERNAME || '';
    this.apiKey = env.KAGGLE_API_KEY || '';
    this.datasetDownloadPath = env.KAGGLE_DOWNLOAD_PATH || path.join(process.cwd(), 'data', 'kaggle');
    
    // 필수 환경 변수 확인
    if (!this.apiUsername || !this.apiKey) {
      monitoring.logMessage('warning', 'kaggle', 'Kaggle API 사용자명 또는 API 키가 설정되지 않았습니다.');
    }
    
    // 다운로드 디렉토리가 존재하는지 확인하고 없으면 생성
    if (!fs.existsSync(this.datasetDownloadPath)) {
      try {
        fs.mkdirSync(this.datasetDownloadPath, { recursive: true });
        monitoring.logMessage('info', 'kaggle', `다운로드 디렉토리 생성: ${this.datasetDownloadPath}`);
      } catch (error: any) {
        monitoring.logMessage('error', 'kaggle', `다운로드 디렉토리 생성 실패: ${error.message}`);
      }
    }
  }

  /**
   * API 호출을 위한 헤더 생성
   */
  private getHeaders() {
    const credentials = Buffer.from(`${this.apiUsername}:${this.apiKey}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 의료 관련 데이터셋 검색
   */
  async searchDatasets(query: string, options: {
    maxResults?: number;
    sortBy?: 'relevance' | 'updated' | 'downloadCount' | 'voteCount';
    fileType?: string;
    tagNames?: string[];
  } = {}): Promise<any[]> {
    const { maxResults = 20, sortBy = 'relevance', fileType, tagNames = [] } = options;
    
    try {
      monitoring.logMessage('info', 'kaggle', `키워드 "${query}"로 의료 데이터셋 검색 시작`);
      
      // 검색 파라미터 구성
      let searchUrl = `${this.baseUrl}/datasets/list`;
      let params: any = {
        search: `${query} medical health healthcare medicine`,
        page: 1,
        pageSize: maxResults,
      };
      
      if (sortBy === 'updated') {
        params.sortBy = 'lastUpdated';
      } else if (sortBy === 'downloadCount') {
        params.sortBy = 'downloadCount';
      } else if (sortBy === 'voteCount') {
        params.sortBy = 'voteCount';
      }
      
      if (fileType) {
        params.fileType = fileType;
      }
      
      if (tagNames.length > 0) {
        params.tagIds = tagNames.join(',');
      }
      
      // API 호출
      const response = await axios.get(searchUrl, {
        headers: this.getHeaders(),
        params
      });
      
      const datasets = response.data.map((dataset: any) => ({
        datasetId: dataset.ref,
        title: dataset.title,
        description: dataset.description,
        owner: dataset.ownerName,
        tags: dataset.tags.map((tag: any) => tag.name),
        size: dataset.totalBytes,
        lastUpdated: dataset.lastUpdated,
        downloadCount: dataset.downloadCount,
        voteCount: dataset.voteCount,
        fileCount: dataset.fileCount,
        metadata: {
          license: dataset.licenseName,
          usabilityRating: dataset.usabilityRating,
          keywords: dataset.keywords,
          subtitle: dataset.subtitle,
          isPrivate: dataset.isPrivate,
        }
      }));
      
      monitoring.logMessage('info', 'kaggle', `${datasets.length}개 데이터셋 검색 완료`);
      return datasets;
    } catch (error: any) {
      monitoring.logMessage('error', 'kaggle', `데이터셋 검색 오류: ${error.message}`);
      throw new Error(`Kaggle 데이터셋 검색 오류: ${error.message}`);
    }
  }

  /**
   * 데이터셋 세부 정보 조회
   */
  async getDatasetDetails(datasetId: string): Promise<any> {
    try {
      monitoring.logMessage('info', 'kaggle', `데이터셋 세부 정보 조회 시작: ${datasetId}`);
      
      // API 호출
      const response = await axios.get(`${this.baseUrl}/datasets/view/${datasetId}`, {
        headers: this.getHeaders()
      });
      
      const dataset = response.data;
      
      // 파일 목록 조회
      const filesResponse = await axios.get(`${this.baseUrl}/datasets/list/${datasetId}/files`, {
        headers: this.getHeaders()
      });
      
      const filesList = filesResponse.data.map((file: any) => ({
        name: file.name,
        size: file.totalBytes,
        contentType: file.contentType
      }));
      
      // 세부 정보 및 파일 목록 반환
      return {
        datasetId: dataset.ref,
        title: dataset.title,
        description: dataset.description,
        owner: dataset.ownerName,
        tags: dataset.tags.map((tag: any) => tag.name),
        size: dataset.totalBytes,
        lastUpdated: dataset.lastUpdated,
        downloadCount: dataset.downloadCount,
        voteCount: dataset.voteCount,
        fileCount: dataset.fileCount,
        metadata: {
          license: dataset.licenseName,
          usabilityRating: dataset.usabilityRating,
          keywords: dataset.keywords,
          subtitle: dataset.subtitle,
          isPrivate: dataset.isPrivate,
        },
        files: filesList
      };
    } catch (error: any) {
      monitoring.logMessage('error', 'kaggle', `데이터셋 세부 정보 조회 오류: ${error.message}`);
      throw new Error(`데이터셋 세부 정보 조회 오류: ${error.message}`);
    }
  }

  /**
   * 데이터셋 다운로드
   * Kaggle CLI를 사용하여 다운로드 실행
   */
  async downloadDataset(datasetId: string, options: {
    unzip?: boolean;
    path?: string;
  } = {}): Promise<{ success: boolean; path: string; error?: string }> {
    const { unzip = true, path: customPath } = options;
    const downloadPath = customPath || path.join(this.datasetDownloadPath, datasetId.replace('/', '_'));
    
    try {
      monitoring.logMessage('info', 'kaggle', `데이터셋 다운로드 시작: ${datasetId}`);
      
      // 다운로드 디렉토리 생성
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }
      
      // Kaggle CLI 명령 생성
      let command = `kaggle datasets download ${datasetId} --path=${downloadPath}`;
      if (!unzip) {
        command += ' --unzip=false';
      }
      
      // 명령 실행
      const { stdout, stderr } = await exec(command);
      
      if (stderr && stderr.length > 0) {
        monitoring.logMessage('warning', 'kaggle', `다운로드 경고: ${stderr}`);
      }
      
      monitoring.logMessage('info', 'kaggle', `데이터셋 다운로드 완료: ${datasetId}`);
      
      return {
        success: true,
        path: downloadPath
      };
    } catch (error: any) {
      monitoring.logMessage('error', 'kaggle', `데이터셋 다운로드 오류: ${error.message}`);
      return {
        success: false,
        path: downloadPath,
        error: error.message
      };
    }
  }

  /**
   * 검색 결과를 데이터베이스에 저장
   */
  async saveDatasetsToDB(datasets: any[]): Promise<number> {
    if (!datasets.length) return 0;
    
    try {
      monitoring.logMessage('info', 'kaggle', `${datasets.length}개 데이터셋 정보 저장 시작`);
      let savedCount = 0;
      
      for (const dataset of datasets) {
        try {
          // 이미 저장된 데이터셋인지 확인
          const existing = await db.query.kaggleDatasets.findFirst({
            where: (fields, { eq }) => eq(fields.datasetId, dataset.datasetId)
          });
          
          if (existing) {
            monitoring.logMessage('debug', 'kaggle', `데이터셋 ${dataset.datasetId} 이미 존재함, 건너뜀`);
            continue;
          }
          
          // 데이터베이스에 삽입
          await db.insert(kaggleDatasets).values({
            datasetId: dataset.datasetId,
            title: dataset.title,
            description: dataset.description || '',
            owner: dataset.owner,
            tags: dataset.tags,
            size: dataset.size?.toString() || '0',
            lastUpdated: dataset.lastUpdated ? new Date(dataset.lastUpdated) : new Date(),
            downloadCount: dataset.downloadCount || 0,
            voteCount: dataset.voteCount || 0,
            fileCount: dataset.fileCount || 0,
            metadata: dataset.metadata || {},
            isDownloaded: false
          });
          
          savedCount++;
        } catch (saveError: any) {
          monitoring.logMessage('warning', 'kaggle', `데이터셋 저장 오류 (ID: ${dataset.datasetId}): ${saveError.message}`);
          continue;
        }
      }
      
      monitoring.logMessage('info', 'kaggle', `${savedCount}개 데이터셋 정보 저장 완료`);
      return savedCount;
    } catch (error: any) {
      monitoring.logMessage('error', 'kaggle', `데이터셋 정보 저장 오류: ${error.message}`);
      throw new Error(`데이터셋 정보 저장 오류: ${error.message}`);
    }
  }

  /**
   * 데이터셋 다운로드 후 DB 업데이트
   */
  async downloadAndUpdateDB(datasetId: string, options: {
    unzip?: boolean;
    path?: string;
  } = {}): Promise<{ success: boolean; path: string; error?: string }> {
    try {
      // 데이터셋 다운로드
      const downloadResult = await this.downloadDataset(datasetId, options);
      
      if (!downloadResult.success) {
        return downloadResult;
      }
      
      // 다운로드 경로 업데이트
      await db.update(kaggleDatasets)
        .set({
          downloadPath: downloadResult.path,
          isDownloaded: true,
          updatedAt: new Date()
        })
        .where(eq(kaggleDatasets.datasetId, datasetId));
      
      monitoring.logMessage('info', 'kaggle', `데이터셋 다운로드 정보 DB 업데이트 완료: ${datasetId}`);
      
      return downloadResult;
    } catch (error: any) {
      monitoring.logMessage('error', 'kaggle', `데이터셋 다운로드 및 DB 업데이트 오류: ${error.message}`);
      throw new Error(`데이터셋 다운로드 및 DB 업데이트 오류: ${error.message}`);
    }
  }

  /**
   * 키워드로 검색하고 결과를 데이터베이스에 저장
   */
  async searchAndSave(query: string, options: {
    maxResults?: number;
    sortBy?: 'relevance' | 'updated' | 'downloadCount' | 'voteCount';
    fileType?: string;
    tagNames?: string[];
  } = {}): Promise<{ fetched: number; saved: number }> {
    try {
      // 검색 실행
      const datasets = await this.searchDatasets(query, options);
      
      if (!datasets.length) {
        return { fetched: 0, saved: 0 };
      }
      
      // 데이터베이스에 저장
      const savedCount = await this.saveDatasetsToDB(datasets);
      
      return {
        fetched: datasets.length,
        saved: savedCount
      };
    } catch (error: any) {
      monitoring.logMessage('error', 'kaggle', `검색 및 저장 과정 오류: ${error.message}`);
      throw new Error(`Kaggle 검색 및 저장 오류: ${error.message}`);
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const kaggleService = new KaggleService(); 