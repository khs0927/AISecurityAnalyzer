import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { monitoring } from '../utils/monitoring';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

// Kaggle API 상수
const KAGGLE_API_URL = 'https://www.kaggle.com/api/v1';
const KAGGLE_USERNAME = process.env.KAGGLE_USERNAME || '';
const KAGGLE_KEY = process.env.KAGGLE_KEY || '';
const KAGGLE_DATASETS_DIR = path.join(process.cwd(), 'data', 'kaggle');
const KAGGLE_CACHE_DIR = path.join(process.cwd(), 'cache', 'kaggle');
const KAGGLE_MAX_RETRIES = 3;
const KAGGLE_RETRY_DELAY_MS = 1000;
const KAGGLE_RATE_LIMIT_MS = 500; // 초당 2개 요청

// 데이터셋 인터페이스
export interface KaggleDataset {
  id: string;
  ref: string;
  title: string;
  subtitle: string;
  description: string;
  url: string;
  isPrivate: boolean;
  licenseName: string;
  licenseUrl: string;
  keywords: string[];
  collaborators: string[];
  data: KaggleDataFile[];
  lastUpdated: Date;
  totalSize: number;
  usabilityRating: number;
  downloadCount: number;
  voteCount: number;
  ownerName: string;
  ownerRef: string;
  ownerUrl: string;
  totalViews: number;
  totalDownloads: number;
  totalVotes: number;
  hasCovariates: boolean;
  hasDoi: boolean;
  doi?: string;
  tags: string[];
  downloadPath?: string;
}

// 데이터 파일 인터페이스
export interface KaggleDataFile {
  name: string;
  description?: string;
  size: number;
  contentType: string;
  path?: string;
}

// 데이터셋 검색 매개변수
export interface KaggleDatasetSearchParams {
  query: string;
  filetype?: string;
  license?: string;
  tags?: string[];
  user?: string;
  page?: number;
  size?: number;
  sortBy?: 'relevance' | 'updated' | 'votes' | 'downloads';
  minSize?: number;
  maxSize?: number;
  useCache?: boolean;
}

// 검색 결과 인터페이스
export interface KaggleSearchResult {
  datasets: KaggleDataset[];
  totalCount: number;
  hasMore: boolean;
  nextPage?: number;
}

// Kaggle API 클래스
export class KaggleAPI {
  private isConfigured: boolean = false;
  private lastRequestTime: number = 0;

  constructor() {
    // 캐시 디렉토리 생성
    if (!fs.existsSync(KAGGLE_CACHE_DIR)) {
      fs.mkdirSync(KAGGLE_CACHE_DIR, { recursive: true });
    }
    
    // 데이터셋 디렉토리 생성
    if (!fs.existsSync(KAGGLE_DATASETS_DIR)) {
      fs.mkdirSync(KAGGLE_DATASETS_DIR, { recursive: true });
    }
    
    // Kaggle 자격 증명 확인
    this.checkCredentials();
    
    monitoring.log('info', 'Kaggle API 클라이언트 초기화됨', {
      credentialsPresent: this.isConfigured,
      category: 'api'
    });
  }

  /**
   * Kaggle 자격 증명 확인
   */
  private checkCredentials(): void {
    this.isConfigured = !!(KAGGLE_USERNAME && KAGGLE_KEY);
    
    if (!this.isConfigured) {
      monitoring.log('warn', 'Kaggle 자격 증명이 구성되지 않았습니다. API 호출이 작동하지 않을 수 있습니다.', {
        category: 'api'
      });
    } else {
      // 인증 파일 경로
      const kaggleDir = process.env.KAGGLE_CONFIG_DIR || path.join(require('os').homedir(), '.kaggle');
      const kaggleJson = path.join(kaggleDir, 'kaggle.json');
      
      // 디렉토리가 없으면 생성
      if (!fs.existsSync(kaggleDir)) {
        fs.mkdirSync(kaggleDir, { recursive: true, mode: 0o700 });
      }
      
      // 인증 파일이 없으면 생성
      if (!fs.existsSync(kaggleJson)) {
        try {
          fs.writeFileSync(
            kaggleJson,
            JSON.stringify({ username: KAGGLE_USERNAME, key: KAGGLE_KEY }),
            { encoding: 'utf8', mode: 0o600 }
          );
          
          monitoring.log('info', 'Kaggle 자격 증명 파일 생성됨', {
            path: kaggleJson,
            category: 'api'
          });
        } catch (error: any) {
          monitoring.log('error', 'Kaggle 자격 증명 파일 생성 실패', {
            error: error.message,
            path: kaggleJson,
            category: 'api'
          });
          
          this.isConfigured = false;
        }
      }
    }
  }

  /**
   * API 가용성 확인
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * API 요청 비율 제한 준수
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const delay = KAGGLE_RATE_LIMIT_MS - elapsed;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * 요청 헤더 생성
   */
  private getHeaders(): Record<string, string> {
    const authHeader = Buffer.from(`${KAGGLE_USERNAME}:${KAGGLE_KEY}`).toString('base64');
    
    return {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * HTTP 요청 실행 (재시도 로직 포함)
   */
  private async makeHttpRequest(url: string, retries: number = KAGGLE_MAX_RETRIES): Promise<any> {
    try {
      await this.respectRateLimit();
      
      return await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 30000
      });
    } catch (error: any) {
      // 429 오류 또는 네트워크 오류인 경우 재시도
      if (
        (error.response && error.response.status === 429) || 
        error.code === 'ECONNABORTED' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND'
      ) {
        if (retries > 0) {
          // 재시도 전 대기
          const delay = KAGGLE_RETRY_DELAY_MS * (KAGGLE_MAX_RETRIES - retries + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // 재귀적으로 재시도
          return this.makeHttpRequest(url, retries - 1);
        }
      }
      
      throw error;
    }
  }

  /**
   * 검색 캐시 키 생성
   */
  private getCacheKey(params: KaggleDatasetSearchParams): string {
    const { query, filetype, license, tags, user, page, size, sortBy, minSize, maxSize } = params;
    
    const key = `${query}_${filetype || ''}_${license || ''}_${tags?.join(',') || ''}_${user || ''}_${page || 1}_${size || 20}_${sortBy || 'relevance'}_${minSize || 0}_${maxSize || 0}`;
    
    return path.join(KAGGLE_CACHE_DIR, `search_${key.replace(/[^a-z0-9_]/gi, '_')}.json`);
  }

  /**
   * 데이터셋 캐시 키 생성
   */
  private getDatasetCacheKey(ref: string): string {
    return path.join(KAGGLE_CACHE_DIR, `dataset_${ref.replace('/', '_')}.json`);
  }

  /**
   * 캐시에서 검색 결과 로드
   */
  private loadFromCache(cacheKey: string): KaggleSearchResult | null {
    try {
      if (fs.existsSync(cacheKey)) {
        const cachedData = fs.readFileSync(cacheKey, 'utf-8');
        const result = JSON.parse(cachedData) as KaggleSearchResult;
        
        monitoring.log('debug', 'Kaggle 검색 결과 캐시에서 로드됨', {
          resultCount: result.datasets.length,
          category: 'api'
        });
        
        return result;
      }
    } catch (error: any) {
      monitoring.log('warn', 'Kaggle 캐시 로드 오류', {
        error: error.message,
        cacheKey,
        category: 'api'
      });
    }
    
    return null;
  }

  /**
   * 캐시에 검색 결과 저장
   */
  private saveToCache(cacheKey: string, result: KaggleSearchResult): void {
    try {
      fs.writeFileSync(cacheKey, JSON.stringify(result, null, 2));
      
      monitoring.log('debug', 'Kaggle 검색 결과 캐시에 저장됨', {
        resultCount: result.datasets.length,
        category: 'api'
      });
    } catch (error: any) {
      monitoring.log('warn', 'Kaggle 캐시 저장 오류', {
        error: error.message,
        cacheKey,
        category: 'api'
      });
    }
  }

  /**
   * 의료 데이터셋 검색
   */
  async searchDatasets(params: KaggleDatasetSearchParams): Promise<KaggleSearchResult> {
    // API가 구성되어 있는지 확인
    if (!this.isConfigured) {
      throw new Error('Kaggle API 자격 증명이 구성되지 않았습니다.');
    }
    
    const {
      query,
      filetype,
      license,
      tags,
      user,
      page = 1,
      size = 20,
      sortBy = 'relevance',
      minSize,
      maxSize,
      useCache = true
    } = params;
    
    // 캐시 확인
    const cacheKey = this.getCacheKey(params);
    if (useCache) {
      const cachedResult = this.loadFromCache(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }
    
    try {
      // 쿼리 구성
      let searchQuery = `"${query}" medical health`;
      if (tags && tags.length > 0) {
        searchQuery += ` tag:"${tags.join('" tag:"')}"`;
      }
      
      if (user) {
        searchQuery += ` user:"${user}"`;
      }
      
      if (filetype) {
        searchQuery += ` filetype:${filetype}`;
      }
      
      if (license) {
        searchQuery += ` license:"${license}"`;
      }
      
      // URL 인코딩
      const encodedQuery = encodeURIComponent(searchQuery);
      
      // 정렬 매개변수
      let sortParam = '';
      switch (sortBy) {
        case 'updated':
          sortParam = 'lastUpdated';
          break;
        case 'votes':
          sortParam = 'voteCount';
          break;
        case 'downloads':
          sortParam = 'downloadCount';
          break;
        default:
          sortParam = 'relevance';
      }
      
      // API 요청 URL 구성
      const requestUrl = `${KAGGLE_API_URL}/datasets/list?search=${encodedQuery}&page=${page}&pageSize=${size}&sortBy=${sortParam}`;
      
      // API 요청
      const response = await this.makeHttpRequest(requestUrl);
      
      // 응답 데이터 처리
      const datasets: KaggleDataset[] = response.data.map((item: any) => {
        // 값이 없는 경우 기본값 제공
        return {
          id: item.id || '',
          ref: item.ref || '',
          title: item.title || '',
          subtitle: item.subtitle || '',
          description: item.description || '',
          url: item.url ? `https://www.kaggle.com${item.url}` : '',
          isPrivate: !!item.isPrivate,
          licenseName: item.licenseName || '',
          licenseUrl: item.licenseUrl || '',
          keywords: item.keywords || [],
          collaborators: item.collaborators || [],
          data: (item.files || []).map((file: any) => ({
            name: file.name || '',
            description: file.description || '',
            size: file.totalBytes || 0,
            contentType: file.fileType || ''
          })),
          lastUpdated: new Date(item.lastUpdated || Date.now()),
          totalSize: item.totalBytes || 0,
          usabilityRating: item.usabilityRating || 0,
          downloadCount: item.downloadCount || 0,
          voteCount: item.voteCount || 0,
          ownerName: item.ownerName || '',
          ownerRef: item.ownerRef || '',
          ownerUrl: item.ownerUrl ? `https://www.kaggle.com${item.ownerUrl}` : '',
          totalViews: item.totalViews || 0,
          totalDownloads: item.totalDownloads || 0,
          totalVotes: item.totalVotes || 0,
          hasCovariates: !!item.hasCovariates,
          hasDoi: !!item.doi,
          doi: item.doi || undefined,
          tags: (item.tags || []).map((tag: any) => tag.name || '')
        };
      });
      
      // 크기 필터링
      let filteredDatasets = datasets;
      if (minSize !== undefined || maxSize !== undefined) {
        filteredDatasets = datasets.filter(dataset => {
          if (minSize !== undefined && dataset.totalSize < minSize) {
            return false;
          }
          if (maxSize !== undefined && dataset.totalSize > maxSize) {
            return false;
          }
          return true;
        });
      }
      
      // 결과 구성
      const result: KaggleSearchResult = {
        datasets: filteredDatasets,
        totalCount: response.data.length,
        hasMore: response.data.length === size,
        nextPage: response.data.length === size ? page + 1 : undefined
      };
      
      // 캐시에 저장
      if (useCache) {
        this.saveToCache(cacheKey, result);
      }
      
      return result;
    } catch (error: any) {
      monitoring.log('error', 'Kaggle 데이터셋 검색 오류', {
        error: error.message,
        query,
        stack: error.stack,
        category: 'api'
      });
      
      throw new Error(`Kaggle 데이터셋 검색 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * 데이터셋 메타데이터 조회
   */
  async getDatasetMetadata(owner: string, datasetName: string, useCache: boolean = true): Promise<KaggleDataset | null> {
    // API가 구성되어 있는지 확인
    if (!this.isConfigured) {
      throw new Error('Kaggle API 자격 증명이 구성되지 않았습니다.');
    }
    
    const datasetRef = `${owner}/${datasetName}`;
    
    // 캐시 확인
    const cacheKey = this.getDatasetCacheKey(datasetRef);
    if (useCache) {
      try {
        if (fs.existsSync(cacheKey)) {
          const cachedData = fs.readFileSync(cacheKey, 'utf-8');
          const dataset = JSON.parse(cachedData) as KaggleDataset;
          
          monitoring.log('debug', 'Kaggle 데이터셋 메타데이터 캐시에서 로드됨', {
            datasetRef,
            category: 'api'
          });
          
          return dataset;
        }
      } catch (error) {
        // 캐시 로드 실패 시 API 요청
      }
    }
    
    try {
      // API 요청 URL 구성
      const requestUrl = `${KAGGLE_API_URL}/datasets/view/${owner}/${datasetName}`;
      
      // API 요청
      const response = await this.makeHttpRequest(requestUrl);
      const data = response.data;
      
      // 메타데이터 구성
      const dataset: KaggleDataset = {
        id: data.id || '',
        ref: data.ref || datasetRef,
        title: data.title || '',
        subtitle: data.subtitle || '',
        description: data.description || '',
        url: data.url ? `https://www.kaggle.com${data.url}` : '',
        isPrivate: !!data.isPrivate,
        licenseName: data.licenseName || '',
        licenseUrl: data.licenseUrl || '',
        keywords: data.keywords || [],
        collaborators: data.collaborators || [],
        data: (data.files || []).map((file: any) => ({
          name: file.name || '',
          description: file.description || '',
          size: file.totalBytes || 0,
          contentType: file.fileType || ''
        })),
        lastUpdated: new Date(data.lastUpdated || Date.now()),
        totalSize: data.totalBytes || 0,
        usabilityRating: data.usabilityRating || 0,
        downloadCount: data.downloadCount || 0,
        voteCount: data.voteCount || 0,
        ownerName: data.ownerName || owner,
        ownerRef: data.ownerRef || owner,
        ownerUrl: data.ownerUrl ? `https://www.kaggle.com${data.ownerUrl}` : '',
        totalViews: data.totalViews || 0,
        totalDownloads: data.totalDownloads || 0,
        totalVotes: data.totalVotes || 0,
        hasCovariates: !!data.hasCovariates,
        hasDoi: !!data.doi,
        doi: data.doi || undefined,
        tags: (data.tags || []).map((tag: any) => tag.name || '')
      };
      
      // 캐시에 저장
      if (useCache) {
        fs.writeFileSync(cacheKey, JSON.stringify(dataset, null, 2));
      }
      
      return dataset;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        monitoring.log('warn', 'Kaggle 데이터셋 찾을 수 없음', {
          datasetRef,
          category: 'api'
        });
        
        return null;
      }
      
      monitoring.log('error', 'Kaggle 데이터셋 메타데이터 조회 오류', {
        error: error.message,
        datasetRef,
        stack: error.stack,
        category: 'api'
      });
      
      throw new Error(`Kaggle 데이터셋 메타데이터 조회 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * 데이터셋 파일 목록 조회
   */
  async getDatasetFiles(owner: string, datasetName: string): Promise<KaggleDataFile[]> {
    // 메타데이터 조회
    const dataset = await this.getDatasetMetadata(owner, datasetName);
    
    if (!dataset) {
      throw new Error(`데이터셋을 찾을 수 없습니다: ${owner}/${datasetName}`);
    }
    
    return dataset.data;
  }

  /**
   * 데이터셋 다운로드 (전체 또는 특정 파일)
   */
  async downloadDataset(owner: string, datasetName: string, path?: string, filename?: string): Promise<string> {
    // API가 구성되어 있는지 확인
    if (!this.isConfigured) {
      throw new Error('Kaggle API 자격 증명이 구성되지 않았습니다.');
    }
    
    const datasetRef = `${owner}/${datasetName}`;
    const downloadPath = path || path.join(KAGGLE_DATASETS_DIR, datasetRef.replace('/', '_'));
    
    // 다운로드 디렉토리 생성
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    
    return new Promise<string>((resolve, reject) => {
      // Kaggle CLI 명령 구성
      const args = ['datasets', 'download', '-p', downloadPath];
      
      // 특정 파일 다운로드 옵션
      if (filename) {
        args.push('-f', filename);
      }
      
      // 압축 해제 옵션
      args.push('--unzip');
      
      // 데이터셋 참조 추가
      args.push(datasetRef);
      
      // 명령 실행
      const kaggle = spawn('kaggle', args);
      
      let output = '';
      let errorOutput = '';
      
      kaggle.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        monitoring.log('debug', 'Kaggle 다운로드 진행 중', {
          output: chunk.trim(),
          datasetRef,
          category: 'api'
        });
      });
      
      kaggle.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        
        monitoring.log('warn', 'Kaggle 다운로드 오류 출력', {
          error: chunk.trim(),
          datasetRef,
          category: 'api'
        });
      });
      
      kaggle.on('close', (code) => {
        if (code === 0) {
          monitoring.log('info', 'Kaggle 데이터셋 다운로드 완료', {
            datasetRef,
            path: downloadPath,
            filename: filename || '(전체)',
            category: 'api'
          });
          
          // 메타데이터 업데이트
          this.getDatasetMetadata(owner, datasetName, false)
            .then(dataset => {
              if (dataset) {
                // 다운로드 경로 추가
                dataset.downloadPath = downloadPath;
                
                // 캐시에 저장
                const cacheKey = this.getDatasetCacheKey(datasetRef);
                fs.writeFileSync(cacheKey, JSON.stringify(dataset, null, 2));
              }
            })
            .catch(error => {
              monitoring.log('warn', 'Kaggle 메타데이터 업데이트 오류', {
                error: error.message,
                datasetRef,
                category: 'api'
              });
            });
          
          resolve(downloadPath);
        } else {
          const error = `Kaggle 데이터셋 다운로드 실패 (종료 코드: ${code}): ${errorOutput}`;
          
          monitoring.log('error', 'Kaggle 데이터셋 다운로드 실패', {
            code,
            error: errorOutput,
            datasetRef,
            category: 'api'
          });
          
          reject(new Error(error));
        }
      });
    });
  }

  /**
   * 인기 의료 데이터셋 조회
   */
  async getPopularMedicalDatasets(limit: number = 10): Promise<KaggleDataset[]> {
    const searchParams: KaggleDatasetSearchParams = {
      query: 'medical health',
      sortBy: 'downloads',
      size: limit,
      useCache: true
    };
    
    const result = await this.searchDatasets(searchParams);
    return result.datasets;
  }

  /**
   * 최신 의료 데이터셋 조회
   */
  async getRecentMedicalDatasets(limit: number = 10): Promise<KaggleDataset[]> {
    const searchParams: KaggleDatasetSearchParams = {
      query: 'medical health',
      sortBy: 'updated',
      size: limit,
      useCache: true
    };
    
    const result = await this.searchDatasets(searchParams);
    return result.datasets;
  }

  /**
   * 태그별 데이터셋 조회
   */
  async getDatasetsByTags(tags: string[], limit: number = 10): Promise<KaggleDataset[]> {
    const searchParams: KaggleDatasetSearchParams = {
      query: 'medical',
      tags: tags,
      size: limit,
      useCache: true
    };
    
    const result = await this.searchDatasets(searchParams);
    return result.datasets;
  }

  /**
   * 키워드로 데이터셋 검색
   */
  async searchByKeyword(keyword: string, limit: number = 10): Promise<KaggleDataset[]> {
    const searchParams: KaggleDatasetSearchParams = {
      query: keyword,
      size: limit,
      useCache: true
    };
    
    const result = await this.searchDatasets(searchParams);
    return result.datasets;
  }

  /**
   * 다운로드된 데이터셋 목록 조회
   */
  getDownloadedDatasets(): KaggleDataset[] {
    const result: KaggleDataset[] = [];
    
    try {
      // 캐시 디렉토리에서 데이터셋 메타데이터 파일 찾기
      const files = fs.readdirSync(KAGGLE_CACHE_DIR);
      
      for (const file of files) {
        if (file.startsWith('dataset_') && file.endsWith('.json')) {
          try {
            const cacheFile = path.join(KAGGLE_CACHE_DIR, file);
            const data = fs.readFileSync(cacheFile, 'utf-8');
            const dataset = JSON.parse(data) as KaggleDataset;
            
            // 다운로드 경로가 있고 실제로 존재하는 경우만 포함
            if (dataset.downloadPath && fs.existsSync(dataset.downloadPath)) {
              result.push(dataset);
            }
          } catch (error) {
            // 파일 읽기 오류 무시
          }
        }
      }
    } catch (error: any) {
      monitoring.log('error', '다운로드된 데이터셋 목록 조회 오류', {
        error: error.message,
        category: 'api'
      });
    }
    
    return result;
  }

  /**
   * 의료 데이터 태그 목록 조회
   */
  async getMedicalDataTags(): Promise<string[]> {
    // 미리 정의된 의료 관련 태그 목록
    const medicalTags = [
      'health', 'healthcare', 'medical', 'medicine', 'covid-19',
      'disease', 'clinical', 'hospital', 'patient', 'diagnosis',
      'radiology', 'cancer', 'heart-disease', 'diabetes', 'genomics',
      'mri', 'x-ray', 'ct-scan', 'biomedical', 'public-health',
      'epidemiology', 'pharmacy', 'drug', 'genome', 'bioinformatics',
      'mental-health', 'laboratory', 'ecg', 'eeg', 'vaccination',
      'virus', 'obesity', 'allergen', 'mortality', 'healthcare-provider',
      'infectious-disease', 'pandemic', 'syndrome', 'pathology'
    ];
    
    return medicalTags;
  }
}

// 싱글톤 인스턴스 생성
export const kaggleAPI = new KaggleAPI();
export default kaggleAPI; 
export default kaggleAPI; 