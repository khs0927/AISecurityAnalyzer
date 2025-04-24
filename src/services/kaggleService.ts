import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { extract } from 'node-stream-zip';
import config from '../config';
import { logger } from '../utils/logger';
import { DatabaseService } from './databaseService';
import { CacheService } from './cacheService';
import { Dataset, DatasetSearchOptions, DatasetFile } from '../models/types';
import { generateUniqueId, sleep } from '../utils/helpers';

const pipelineAsync = promisify(pipeline);
const mkdirAsync = promisify(fs.mkdir);
const accessAsync = promisify(fs.access);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);
const unlinkAsync = promisify(fs.unlink);
const rmdirAsync = promisify(fs.rmdir);

/**
 * Kaggle API 서비스
 * 의료 데이터셋 검색 및 관리를 담당합니다.
 */
export class KaggleService {
  private readonly baseUrl = 'https://www.kaggle.com/api/v1';
  private readonly username: string;
  private readonly apiKey: string;
  private readonly tempDir: string;
  private readonly db: DatabaseService;
  private readonly cache: CacheService;
  private readonly downloadConcurrency: number;
  private readonly requestDelay: number;
  private readonly maxRetries: number;

  /**
   * Kaggle 서비스 생성자
   */
  constructor(db: DatabaseService, cache: CacheService) {
    this.username = config.apis.kaggle.username;
    this.apiKey = config.apis.kaggle.apiKey;
    this.tempDir = config.apis.kaggle.tempDir || path.join(process.cwd(), 'temp', 'kaggle');
    this.db = db;
    this.cache = cache;
    this.downloadConcurrency = config.apis.kaggle.downloadConcurrency || 2;
    this.requestDelay = config.apis.kaggle.requestDelay || 500;
    this.maxRetries = config.apis.kaggle.maxRetries || 3;
    
    // 임시 디렉토리 생성
    this.ensureTempDir().catch(err => {
      logger.error(`Kaggle 임시 디렉토리 생성 실패: ${err.message}`);
    });
  }

  /**
   * 의료 관련 데이터셋 검색
   * @param query 검색어
   * @param options 검색 옵션
   * @returns 데이터셋 목록
   */
  public async searchDatasets(
    query: string,
    options: DatasetSearchOptions = {}
  ): Promise<Dataset[]> {
    const cacheKey = `kaggle_search:${query}:${JSON.stringify(options)}`;
    const cachedResult = await this.cache.get<Dataset[]>(cacheKey);
    
    if (cachedResult) {
      logger.debug(`Kaggle 검색 캐시 히트: ${query}`);
      return cachedResult;
    }
    
    try {
      const { maxResults = 20, sort, fileType, license, tags } = options;
      
      const searchUrl = `${this.baseUrl}/datasets/list`;
      const params: Record<string, any> = {
        search: query,
        page: 1,
        size: maxResults
      };
      
      if (sort) {
        params.sortBy = sort;
      }
      
      if (fileType) {
        params.fileType = fileType;
      }
      
      if (license) {
        params.license = license;
      }
      
      if (tags && tags.length > 0) {
        params.tagsInclude = tags.join(',');
      }
      
      // 'medical'과 'healthcare' 태그가 없는 경우 기본적으로 추가
      if (!tags || !tags.some(tag => ['medical', 'healthcare', 'health'].includes(tag.toLowerCase()))) {
        params.tagsInclude = params.tagsInclude 
          ? `${params.tagsInclude},medical,healthcare` 
          : 'medical,healthcare';
      }
      
      const response = await this.makeRequest<Dataset[]>(searchUrl, params);
      
      if (!response || !Array.isArray(response)) {
        logger.warn(`Kaggle 검색 결과가 없습니다: ${query}`);
        return [];
      }
      
      // 결과 필터링 (의료 관련 데이터셋만)
      const medicalDatasets = response.filter(dataset => {
        // 제목이나 설명에 의료 관련 키워드가 포함된 경우
        const titleLower = dataset.title?.toLowerCase() || '';
        const descriptionLower = dataset.description?.toLowerCase() || '';
        const tagsLower = dataset.tags?.map(tag => tag.toLowerCase()) || [];
        
        const medicalKeywords = [
          'health', 'medical', 'clinical', 'hospital', 'patient', 
          'disease', 'doctor', 'medicine', 'healthcare', 'diagnosis',
          'treatment', 'surgery', 'cancer', 'covid', 'therapy',
          'drug', 'pharma', 'epidemic', 'pandemic', 'virus',
          'vaccine', 'infection', 'mortality', 'symptom', 'syndrome'
        ];
        
        return medicalKeywords.some(keyword => 
          titleLower.includes(keyword) || 
          descriptionLower.includes(keyword) ||
          tagsLower.includes(keyword)
        );
      });
      
      // 캐시에 검색 결과 저장 (1시간)
      await this.cache.set(cacheKey, medicalDatasets, 60 * 60);
      
      logger.info(`Kaggle 검색 완료: ${query}, ${medicalDatasets.length}개 결과 발견`);
      return medicalDatasets;
      
    } catch (error) {
      logger.error(`Kaggle 검색 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Kaggle 검색 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 데이터셋 상세 정보 조회
   * @param owner 데이터셋 소유자
   * @param slug 데이터셋 슬러그
   * @returns 데이터셋 정보
   */
  public async getDatasetInfo(owner: string, slug: string): Promise<Dataset> {
    const datasetRef = `${owner}/${slug}`;
    const cacheKey = `kaggle_dataset:${datasetRef}`;
    const cachedInfo = await this.cache.get<Dataset>(cacheKey);
    
    if (cachedInfo) {
      logger.debug(`Kaggle 데이터셋 정보 캐시 히트: ${datasetRef}`);
      return cachedInfo;
    }
    
    try {
      const url = `${this.baseUrl}/datasets/view/${datasetRef}`;
      const response = await this.makeRequest<Dataset>(url);
      
      if (!response) {
        throw new Error(`데이터셋을 찾을 수 없습니다: ${datasetRef}`);
      }
      
      // 캐시에 저장 (1일)
      await this.cache.set(cacheKey, response, 24 * 60 * 60);
      
      return response;
      
    } catch (error) {
      logger.error(`Kaggle 데이터셋 정보 조회 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Kaggle 데이터셋 정보 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 데이터셋 파일 목록 조회
   * @param owner 데이터셋 소유자
   * @param slug 데이터셋 슬러그
   * @returns 파일 목록
   */
  public async getDatasetFiles(owner: string, slug: string): Promise<DatasetFile[]> {
    const datasetRef = `${owner}/${slug}`;
    const cacheKey = `kaggle_files:${datasetRef}`;
    const cachedFiles = await this.cache.get<DatasetFile[]>(cacheKey);
    
    if (cachedFiles) {
      logger.debug(`Kaggle 파일 목록 캐시 히트: ${datasetRef}`);
      return cachedFiles;
    }
    
    try {
      const url = `${this.baseUrl}/datasets/list/${datasetRef}/files`;
      const response = await this.makeRequest<{files: DatasetFile[]}>(url);
      
      if (!response || !response.files) {
        logger.warn(`Kaggle 데이터셋 파일이 없거나 응답이 비어있습니다: ${datasetRef}`);
        return [];
      }
      
      // 캐시에 저장 (1일)
      await this.cache.set(cacheKey, response.files, 24 * 60 * 60);
      
      return response.files;
      
    } catch (error) {
      logger.error(`Kaggle 파일 목록 조회 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Kaggle 파일 목록 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 데이터셋 저장 (메타데이터 및 파일 정보)
   * @param dataset 데이터셋 정보
   * @param options 저장 옵션
   * @returns 저장된 데이터셋 ID
   */
  public async saveDataset(
    dataset: Dataset, 
    options: { 
      downloadFiles?: boolean,
      fileTypes?: string[],
      maxFileSize?: number, // MB 단위
      extractContents?: boolean,
      includeFiles?: boolean,
      includeTags?: boolean
    } = {}
  ): Promise<number> {
    try {
      // 데이터셋 소유자와 슬러그 확인
      if (!dataset.ref || !dataset.ref.includes('/')) {
        throw new Error('유효하지 않은 데이터셋 참조입니다');
      }
      
      const [owner, slug] = dataset.ref.split('/');
      
      // 데이터셋 기본 정보가 부족한 경우 API에서 추가 정보 조회
      let fullDataset = dataset;
      if (!dataset.title || !dataset.description || !dataset.totalBytes) {
        fullDataset = await this.getDatasetInfo(owner, slug);
      }
      
      // 데이터셋 저장 또는 업데이트
      const datasetId = await this.db.upsertDataset({
        ref: fullDataset.ref,
        title: fullDataset.title || '',
        description: fullDataset.description || '',
        owner: owner,
        slug: slug,
        url: `https://www.kaggle.com/datasets/${fullDataset.ref}`,
        version: fullDataset.currentVersionNumber || 1,
        size: fullDataset.totalBytes || 0,
        lastUpdated: fullDataset.lastUpdated ? new Date(fullDataset.lastUpdated) : new Date(),
        downloadCount: fullDataset.downloadCount || 0,
        voteCount: fullDataset.voteCount || 0,
        usabilityRating: fullDataset.usabilityRating || 0,
        license: fullDataset.license?.name || 'unknown'
      });
      
      // 태그 정보 저장
      if (options.includeTags && fullDataset.tags && fullDataset.tags.length > 0) {
        for (const tagName of fullDataset.tags) {
          const tagId = await this.db.findOrCreateTag(tagName);
          await this.db.linkDatasetTag(datasetId, tagId);
        }
      }
      
      // 파일 정보 저장
      if (options.includeFiles) {
        const files = await this.getDatasetFiles(owner, slug);
        
        for (const file of files) {
          // 파일 타입 필터링
          if (options.fileTypes && options.fileTypes.length > 0) {
            const fileExt = path.extname(file.name).toLowerCase().substring(1);
            if (!options.fileTypes.includes(fileExt)) {
              continue;
            }
          }
          
          // 파일 크기 필터링
          if (options.maxFileSize && file.size > options.maxFileSize * 1024 * 1024) {
            logger.info(`파일 크기가 너무 큽니다. 건너뜁니다: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
            continue;
          }
          
          await this.db.addDatasetFile({
            datasetId,
            name: file.name,
            path: file.path || file.name,
            size: file.size,
            type: path.extname(file.name).substring(1).toLowerCase() || 'unknown',
            lastModified: file.lastModified ? new Date(file.lastModified) : null,
            downloadStatus: options.downloadFiles ? 'queued' : 'not_downloaded'
          });
        }
      }
      
      // 파일 다운로드 (옵션)
      if (options.downloadFiles) {
        try {
          await this.downloadDataset(owner, slug, options);
        } catch (downloadError) {
          logger.error(`데이터셋 다운로드 실패: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
          // 다운로드 실패해도 메타데이터는 이미 저장되었으므로 계속 진행
        }
      }
      
      logger.info(`데이터셋 저장 완료: ${owner}/${slug}`);
      return datasetId;
      
    } catch (error) {
      logger.error(`데이터셋 저장 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`데이터셋 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 데이터셋 파일 다운로드
   * @param owner 데이터셋 소유자
   * @param slug 데이터셋 슬러그
   * @param options 다운로드 옵션
   */
  public async downloadDataset(
    owner: string, 
    slug: string, 
    options: { 
      fileTypes?: string[],
      maxFileSize?: number,
      extractContents?: boolean
    } = {}
  ): Promise<string> {
    const datasetRef = `${owner}/${slug}`;
    const downloadDir = path.join(this.tempDir, owner, slug);
    
    try {
      // 다운로드 디렉토리 생성
      await this.ensureDir(downloadDir);
      
      // 파일 목록 조회
      let files = await this.getDatasetFiles(owner, slug);
      
      // 파일 타입 필터링
      if (options.fileTypes && options.fileTypes.length > 0) {
        files = files.filter(file => {
          const fileExt = path.extname(file.name).toLowerCase().substring(1);
          return options.fileTypes!.includes(fileExt);
        });
      }
      
      // 파일 크기 필터링
      if (options.maxFileSize) {
        files = files.filter(file => 
          file.size <= options.maxFileSize! * 1024 * 1024
        );
      }
      
      if (files.length === 0) {
        logger.warn(`다운로드할 유효한 파일이 없습니다: ${datasetRef}`);
        return downloadDir;
      }
      
      // 압축 파일 여부 확인 (전체 데이터셋 다운로드 결정)
      const hasArchiveFile = files.some(file => {
        const ext = path.extname(file.name).toLowerCase();
        return ['.zip', '.tar', '.gz', '.tgz', '.7z'].includes(ext);
      });
      
      if (hasArchiveFile && files.length > 1) {
        // 전체 데이터셋 다운로드 (압축 파일로)
        logger.info(`데이터셋 전체 다운로드 중: ${datasetRef}`);
        await this.downloadFullDataset(owner, slug, downloadDir);
        
        // 압축 파일 추출 (옵션)
        if (options.extractContents) {
          await this.extractDatasetFiles(downloadDir);
        }
      } else {
        // 개별 파일 다운로드
        logger.info(`개별 파일 다운로드 중: ${files.length}개 파일, 데이터셋: ${datasetRef}`);
        
        // 동시 다운로드 제한을 위한 청크 처리
        const chunks = [];
        for (let i = 0; i < files.length; i += this.downloadConcurrency) {
          chunks.push(files.slice(i, i + this.downloadConcurrency));
        }
        
        for (const chunk of chunks) {
          await Promise.all(
            chunk.map(file => this.downloadDatasetFile(owner, slug, file.name, downloadDir))
          );
          
          // API 요청 제한 준수를 위한 딜레이
          await sleep(this.requestDelay);
        }
      }
      
      logger.info(`데이터셋 다운로드 완료: ${datasetRef}`);
      return downloadDir;
      
    } catch (error) {
      logger.error(`데이터셋 다운로드 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`데이터셋 다운로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 단일 데이터셋 파일 다운로드
   */
  private async downloadDatasetFile(
    owner: string, 
    slug: string, 
    filename: string, 
    downloadDir: string
  ): Promise<string> {
    const outputPath = path.join(downloadDir, filename);
    const fileDir = path.dirname(outputPath);
    
    // 파일이 이미 존재하는지 확인
    try {
      await accessAsync(outputPath, fs.constants.F_OK);
      logger.debug(`파일이 이미 존재합니다: ${filename}`);
      return outputPath;
    } catch {
      // 파일이 없으면 다운로드 계속 진행
    }
    
    try {
      // 파일 디렉토리 생성
      await this.ensureDir(fileDir);
      
      const url = `${this.baseUrl}/datasets/download/${owner}/${slug}/${encodeURIComponent(filename)}`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.username}:${this.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      });
      
      // 파일 저장
      const writer = createWriteStream(outputPath);
      await pipelineAsync(response.data, writer);
      
      logger.debug(`파일 다운로드 완료: ${filename}`);
      return outputPath;
      
    } catch (error) {
      logger.error(`파일 다운로드 오류: ${filename}, ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`파일 다운로드 중 오류가 발생했습니다: ${filename}, ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 전체 데이터셋 다운로드 (압축 파일로)
   */
  private async downloadFullDataset(
    owner: string, 
    slug: string, 
    downloadDir: string
  ): Promise<string> {
    const zipFilename = `${slug}.zip`;
    const outputPath = path.join(downloadDir, zipFilename);
    
    // 파일이 이미 존재하는지 확인
    try {
      await accessAsync(outputPath, fs.constants.F_OK);
      logger.debug(`데이터셋 압축 파일이 이미 존재합니다: ${zipFilename}`);
      return outputPath;
    } catch {
      // 파일이 없으면 다운로드 계속 진행
    }
    
    try {
      const url = `${this.baseUrl}/datasets/download/${owner}/${slug}`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.username}:${this.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      });
      
      // 압축 파일 저장
      const writer = createWriteStream(outputPath);
      await pipelineAsync(response.data, writer);
      
      logger.debug(`데이터셋 다운로드 완료: ${zipFilename}`);
      return outputPath;
      
    } catch (error) {
      logger.error(`데이터셋 다운로드 오류: ${zipFilename}, ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`데이터셋 다운로드 중 오류가 발생했습니다: ${zipFilename}, ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 압축 파일 추출
   */
  private async extractDatasetFiles(downloadDir: string): Promise<void> {
    try {
      const files = await readdirAsync(downloadDir);
      
      for (const file of files) {
        const filePath = path.join(downloadDir, file);
        const ext = path.extname(file).toLowerCase();
        
        // 파일 상태 확인
        const stat = await statAsync(filePath);
        if (!stat.isFile()) {
          continue;
        }
        
        // ZIP 파일 추출
        if (ext === '.zip') {
          const extractDir = path.join(downloadDir, path.basename(file, ext));
          await this.ensureDir(extractDir);
          
          try {
            await extract({ file: filePath, dir: extractDir });
            logger.info(`ZIP 파일 추출 완료: ${file}`);
            
            // 추출 후 원본 ZIP 파일 삭제 (선택 사항)
            // await unlinkAsync(filePath);
          } catch (extractError) {
            logger.error(`ZIP 파일 추출 오류: ${file}, ${extractError instanceof Error ? extractError.message : String(extractError)}`);
          }
        }
      }
    } catch (error) {
      logger.error(`압축 파일 추출 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`압축 파일 추출 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 임시 디렉토리 생성 확인
   */
  private async ensureTempDir(): Promise<void> {
    await this.ensureDir(this.tempDir);
  }

  /**
   * 디렉토리 존재 확인 및 생성
   */
  private async ensureDir(dir: string): Promise<void> {
    try {
      await accessAsync(dir, fs.constants.F_OK);
    } catch {
      await mkdirAsync(dir, { recursive: true });
    }
  }

  /**
   * 임시 파일 정리
   * @param olderThan 특정 일수보다 오래된 파일만 삭제 (일 단위)
   */
  public async cleanupTempFiles(olderThan: number = 7): Promise<void> {
    try {
      const now = Date.now();
      const maxAge = olderThan * 24 * 60 * 60 * 1000; // 일 -> 밀리초
      
      await this.removeOldFiles(this.tempDir, now - maxAge);
      
      logger.info(`임시 파일 정리 완료: ${olderThan}일보다 오래된 파일 삭제됨`);
    } catch (error) {
      logger.error(`임시 파일 정리 오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 오래된 파일 재귀적 삭제
   */
  private async removeOldFiles(dir: string, olderThan: number): Promise<void> {
    try {
      const entries = await readdirAsync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await statAsync(fullPath);
        
        if (stats.isDirectory()) {
          await this.removeOldFiles(fullPath, olderThan);
          
          // 빈 디렉토리 삭제
          try {
            const subEntries = await readdirAsync(fullPath);
            if (subEntries.length === 0) {
              await rmdirAsync(fullPath);
              logger.debug(`빈 디렉토리 삭제됨: ${fullPath}`);
            }
          } catch (err) {
            logger.error(`디렉토리 삭제 오류: ${fullPath}, ${err instanceof Error ? err.message : String(err)}`);
          }
        } else if (stats.isFile() && stats.mtimeMs < olderThan) {
          await unlinkAsync(fullPath);
          logger.debug(`오래된 파일 삭제됨: ${fullPath}`);
        }
      }
    } catch (error) {
      logger.error(`파일 정리 오류: ${dir}, ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * API 요청 처리 함수
   * 재시도 로직 포함
   */
  private async makeRequest<T>(url: string, params: Record<string, any> = {}): Promise<T> {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.username}:${this.apiKey}`).toString('base64')}`,
            'Content-Type': 'application/json'
          },
          params
        });
        
        return response.data;
        
      } catch (error) {
        retries++;
        const isLastRetry = retries >= this.maxRetries;
        const status = axios.isAxiosError(error) && error.response ? error.response.status : 'unknown';
        
        logger.warn(`Kaggle API 요청 실패 (${status}), 재시도 ${retries}/${this.maxRetries}`);
        
        if (isLastRetry) {
          throw error;
        }
        
        // 재시도 전 지수 백오프 딜레이
        await sleep(this.requestDelay * Math.pow(2, retries));
      }
    }
    
    throw new Error('모든 API 요청 재시도가 실패했습니다');
  }
} 