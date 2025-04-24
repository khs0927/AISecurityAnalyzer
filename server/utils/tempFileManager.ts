import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { monitoringInstance } from '../monitoringInstance';
import { v4 as uuid } from 'uuid';

/**
 * 임시 파일 메타데이터 인터페이스
 */
export interface TempFileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: number;
  expiresAt: number;
  tags?: string[];
  userId?: string;
  correlationId?: string;
  customData?: Record<string, any>;
}

/**
 * 임시 파일 상태 인터페이스
 */
export interface TempFileSystemStatus {
  totalFiles: number;
  totalSize: number;
  oldestFile: TempFileMetadata | null;
  newestFile: TempFileMetadata | null;
  diskSpaceAvailable: number;
  diskSpaceTotal: number;
  diskSpaceUsedPercent: number;
}

/**
 * 임시 파일 관리자 설정 인터페이스
 */
interface TempFileManagerOptions {
  baseDirectory: string;
  defaultExpirationMs: number;
  maxSizeBytes: number;
  cleanupIntervalMs: number;
  allowedMimeTypes?: string[];
}

/**
 * 임시 파일 관리자 클래스
 */
class TempFileManager {
  private options: TempFileManagerOptions;
  private metadata: Map<string, TempFileMetadata> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  // 기본 설정
  private DEFAULT_OPTIONS: TempFileManagerOptions = {
    baseDirectory: path.join(os.tmpdir(), 'ai-security-analyzer', 'uploads'),
    defaultExpirationMs: 24 * 60 * 60 * 1000, // 24시간
    maxSizeBytes: 1024 * 1024 * 1024, // 1GB
    cleanupIntervalMs: 60 * 60 * 1000, // 1시간마다 정리
    allowedMimeTypes: [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp', 
      'application/pdf',
      'application/json',
      'text/plain', 
      'text/csv',
      'text/html',
      'audio/mpeg',
      'audio/wav',
      'video/mp4'
    ],
  };

  constructor(options?: Partial<TempFileManagerOptions>) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
    this.initialize();
  }

  /**
   * 파일 관리자 초기화
   */
  private async initialize(): Promise<void> {
    try {
      const startTime = Date.now();
      // 임시 디렉토리 생성
      if (!fs.existsSync(this.options.baseDirectory)) {
        fs.mkdirSync(this.options.baseDirectory, { recursive: true });
      }

      // 기존 파일 메타데이터 로드
      await this.loadExistingFiles();

      // 정기 정리 타이머 시작
      this.startCleanupTimer();

      monitoringInstance.logPerformance(
        'tempFileManager.initialize',
        Date.now() - startTime,
        true,
        { baseDirectory: this.options.baseDirectory }
      );

      monitoringInstance.log('info', '임시 파일 관리자 초기화 완료', {
        baseDirectory: this.options.baseDirectory,
        fileCount: this.metadata.size
      }, 'temp-files');
    } catch (error) {
      monitoringInstance.log('error', '임시 파일 관리자 초기화 실패', {
        baseDirectory: this.options.baseDirectory,
        error
      }, 'temp-files');
      throw error;
    }
  }

  /**
   * 기존 파일 메타데이터 로드
   */
  private async loadExistingFiles(): Promise<void> {
    try {
      const files = fs.readdirSync(this.options.baseDirectory);
      const metadataPromises = files.map(async (fileName) => {
        try {
          const filePath = path.join(this.options.baseDirectory, fileName);
          const stats = fs.statSync(filePath);
          
          if (stats.isFile()) {
            // 메타데이터 파일인지 확인
            if (fileName.endsWith('.meta.json')) {
              const fileId = fileName.replace('.meta.json', '');
              const dataFilePath = path.join(this.options.baseDirectory, fileId);
              
              // 실제 파일이 존재하는지 확인
              if (fs.existsSync(dataFilePath)) {
                const metadataContent = fs.readFileSync(filePath, 'utf8');
                const metadata = JSON.parse(metadataContent) as TempFileMetadata;
                this.metadata.set(fileId, metadata);

                // 만료된 파일은 바로 삭제
                if (metadata.expiresAt < Date.now()) {
                  await this.deleteFile(fileId);
                }
              } else {
                // 메타데이터만 있고 실제 파일이 없는 경우 메타데이터 삭제
                fs.unlinkSync(filePath);
              }
            }
          }
        } catch (err) {
          monitoringInstance.log('error', '메타데이터 로드 중 오류 발생', {
            fileName,
            error: err
          }, 'temp-files');
        }
      });

      await Promise.all(metadataPromises);
    } catch (error) {
      monitoringInstance.log('error', '기존 파일 메타데이터 로드 실패', {
        error
      }, 'temp-files');
      throw error;
    }
  }

  /**
   * 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredFiles()
        .catch(error => {
          monitoringInstance.log('error', '만료 파일 정리 중 오류 발생', {
            error
          }, 'temp-files');
        });
    }, this.options.cleanupIntervalMs);

    monitoringInstance.log('info', '임시 파일 정리 타이머 시작', {
      intervalMs: this.options.cleanupIntervalMs
    }, 'temp-files');
  }

  /**
   * 정리 타이머 정지
   */
  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 파일 저장
   */
  public async saveFile(
    fileData: Buffer,
    originalName: string,
    mimeType: string,
    options?: {
      expirationMs?: number;
      userId?: string;
      correlationId?: string;
      tags?: string[];
      customData?: Record<string, any>;
    }
  ): Promise<TempFileMetadata> {
    const startTime = Date.now();
    
    try {
      // MIME 타입 확인
      if (this.options.allowedMimeTypes && 
          !this.options.allowedMimeTypes.includes(mimeType)) {
        throw new Error(`허용되지 않은 MIME 타입: ${mimeType}`);
      }

      // 파일 크기 확인
      const totalSize = this.getTotalSize() + fileData.length;
      if (totalSize > this.options.maxSizeBytes) {
        throw new Error('임시 파일 저장소 용량 초과');
      }

      // 파일 ID 생성
      const fileId = uuid();
      const filePath = path.join(this.options.baseDirectory, fileId);
      const metadataPath = path.join(this.options.baseDirectory, `${fileId}.meta.json`);

      // 만료 시간 계산
      const expirationMs = options?.expirationMs || this.options.defaultExpirationMs;
      const expiresAt = Date.now() + expirationMs;

      // 메타데이터 생성
      const metadata: TempFileMetadata = {
        id: fileId,
        originalName,
        mimeType,
        size: fileData.length,
        createdAt: Date.now(),
        expiresAt,
        tags: options?.tags || [],
        userId: options?.userId,
        correlationId: options?.correlationId,
        customData: options?.customData,
      };

      // 파일 및 메타데이터 저장
      fs.writeFileSync(filePath, fileData);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // 메타데이터 캐시 업데이트
      this.metadata.set(fileId, metadata);

      monitoringInstance.logPerformance(
        'tempFileManager.saveFile',
        Date.now() - startTime,
        true,
        { fileId, originalName, size: fileData.length }
      );

      return metadata;
    } catch (error) {
      monitoringInstance.logPerformance(
        'tempFileManager.saveFile',
        Date.now() - startTime,
        false,
        { originalName, error }
      );
      throw error;
    }
  }

  /**
   * 파일 가져오기
   */
  public async getFile(fileId: string): Promise<{ data: Buffer; metadata: TempFileMetadata }> {
    const startTime = Date.now();
    
    try {
      const metadata = this.metadata.get(fileId);
      if (!metadata) {
        throw new Error(`존재하지 않는 파일: ${fileId}`);
      }

      // 만료 확인
      if (metadata.expiresAt < Date.now()) {
        await this.deleteFile(fileId);
        throw new Error(`만료된 파일: ${fileId}`);
      }

      const filePath = path.join(this.options.baseDirectory, fileId);
      if (!fs.existsSync(filePath)) {
        // 메타데이터는 있지만 실제 파일이 없는 경우
        this.metadata.delete(fileId);
        const metadataPath = path.join(this.options.baseDirectory, `${fileId}.meta.json`);
        if (fs.existsSync(metadataPath)) {
          fs.unlinkSync(metadataPath);
        }
        throw new Error(`손상된 파일: ${fileId}`);
      }

      const data = fs.readFileSync(filePath);

      monitoringInstance.logPerformance(
        'tempFileManager.getFile',
        Date.now() - startTime,
        true,
        { fileId, size: data.length }
      );

      return { data, metadata };
    } catch (error) {
      monitoringInstance.logPerformance(
        'tempFileManager.getFile',
        Date.now() - startTime,
        false,
        { fileId, error }
      );
      throw error;
    }
  }

  /**
   * 파일 메타데이터 가져오기
   */
  public getFileMetadata(fileId: string): TempFileMetadata {
    const metadata = this.metadata.get(fileId);
    if (!metadata) {
      throw new Error(`존재하지 않는 파일: ${fileId}`);
    }
    return { ...metadata }; // 복사본 반환
  }

  /**
   * 파일 메타데이터 업데이트
   */
  public async updateFileMetadata(
    fileId: string,
    updates: Partial<Omit<TempFileMetadata, 'id' | 'originalName' | 'mimeType' | 'size' | 'createdAt'>>
  ): Promise<TempFileMetadata> {
    const startTime = Date.now();
    
    try {
      const metadata = this.metadata.get(fileId);
      if (!metadata) {
        throw new Error(`존재하지 않는 파일: ${fileId}`);
      }

      // 메타데이터 업데이트
      const updatedMetadata: TempFileMetadata = {
        ...metadata,
        ...updates,
        id: metadata.id, // 변경 불가 필드는 기존 값 유지
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        size: metadata.size,
        createdAt: metadata.createdAt,
      };

      // 메타데이터 파일 업데이트
      const metadataPath = path.join(this.options.baseDirectory, `${fileId}.meta.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));

      // 메모리 캐시 업데이트
      this.metadata.set(fileId, updatedMetadata);

      monitoringInstance.logPerformance(
        'tempFileManager.updateFileMetadata',
        Date.now() - startTime,
        true,
        { fileId }
      );

      return { ...updatedMetadata };
    } catch (error) {
      monitoringInstance.logPerformance(
        'tempFileManager.updateFileMetadata',
        Date.now() - startTime,
        false,
        { fileId, error }
      );
      throw error;
    }
  }

  /**
   * 파일 삭제
   */
  public async deleteFile(fileId: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const metadata = this.metadata.get(fileId);
      const filePath = path.join(this.options.baseDirectory, fileId);
      const metadataPath = path.join(this.options.baseDirectory, `${fileId}.meta.json`);
      
      // 실제 파일 삭제
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // 메타데이터 파일 삭제
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      // 메모리 캐시에서 삭제
      this.metadata.delete(fileId);

      monitoringInstance.logPerformance(
        'tempFileManager.deleteFile',
        Date.now() - startTime,
        true,
        { fileId, fileSize: metadata?.size || 0 }
      );

      return true;
    } catch (error) {
      monitoringInstance.logPerformance(
        'tempFileManager.deleteFile',
        Date.now() - startTime,
        false,
        { fileId, error }
      );
      return false;
    }
  }

  /**
   * 만료된 모든 파일 정리
   */
  public async cleanupExpiredFiles(): Promise<number> {
    const startTime = Date.now();
    let deletedCount = 0;

    try {
      const now = Date.now();
      const expiredFileIds: string[] = [];

      // 만료된 파일 ID 수집
      for (const [fileId, metadata] of this.metadata.entries()) {
        if (metadata.expiresAt < now) {
          expiredFileIds.push(fileId);
        }
      }

      // 병렬로 파일 삭제
      const deletePromises = expiredFileIds.map(fileId => this.deleteFile(fileId));
      const results = await Promise.allSettled(deletePromises);

      // 성공적으로 삭제된 파일 수 계산
      deletedCount = results.filter(result => result.status === 'fulfilled' && result.value).length;

      monitoringInstance.logPerformance(
        'tempFileManager.cleanupExpiredFiles',
        Date.now() - startTime,
        true,
        { deletedCount, totalFound: expiredFileIds.length }
      );

      return deletedCount;
    } catch (error) {
      monitoringInstance.logPerformance(
        'tempFileManager.cleanupExpiredFiles',
        Date.now() - startTime,
        false,
        { error }
      );
      throw error;
    }
  }

  /**
   * 모든 파일 삭제
   */
  public async deleteAllFiles(): Promise<number> {
    const startTime = Date.now();
    
    try {
      const fileIds = Array.from(this.metadata.keys());
      const deletePromises = fileIds.map(fileId => this.deleteFile(fileId));
      const results = await Promise.allSettled(deletePromises);
      
      // 성공적으로 삭제된 파일 수 계산
      const deletedCount = results.filter(result => result.status === 'fulfilled' && result.value).length;

      monitoringInstance.logPerformance(
        'tempFileManager.deleteAllFiles',
        Date.now() - startTime,
        true,
        { deletedCount, totalFound: fileIds.length }
      );

      return deletedCount;
    } catch (error) {
      monitoringInstance.logPerformance(
        'tempFileManager.deleteAllFiles',
        Date.now() - startTime,
        false,
        { error }
      );
      throw error;
    }
  }

  /**
   * 특정 태그를 가진 파일 목록 조회
   */
  public getFilesByTag(tag: string): TempFileMetadata[] {
    const result: TempFileMetadata[] = [];
    
    for (const metadata of this.metadata.values()) {
      if (metadata.tags && metadata.tags.includes(tag)) {
        result.push({ ...metadata });
      }
    }
    
    return result;
  }

  /**
   * 특정 사용자의 파일 목록 조회
   */
  public getFilesByUser(userId: string): TempFileMetadata[] {
    const result: TempFileMetadata[] = [];
    
    for (const metadata of this.metadata.values()) {
      if (metadata.userId === userId) {
        result.push({ ...metadata });
      }
    }
    
    return result;
  }

  /**
   * 특정 상관관계 ID를 가진 파일 목록 조회
   */
  public getFilesByCorrelationId(correlationId: string): TempFileMetadata[] {
    const result: TempFileMetadata[] = [];
    
    for (const metadata of this.metadata.values()) {
      if (metadata.correlationId === correlationId) {
        result.push({ ...metadata });
      }
    }
    
    return result;
  }

  /**
   * 전체 저장 크기 계산
   */
  private getTotalSize(): number {
    let totalSize = 0;
    
    for (const metadata of this.metadata.values()) {
      totalSize += metadata.size;
    }
    
    return totalSize;
  }

  /**
   * 파일 이동
   */
  public async moveFile(fileId: string, destinationPath: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      const { data, metadata } = await this.getFile(fileId);
      
      // 대상 디렉토리 확인 및 생성
      const dirPath = path.dirname(destinationPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 파일 쓰기
      fs.writeFileSync(destinationPath, data);
      
      // 성공 후 원본 삭제 (선택적)
      // await this.deleteFile(fileId);
      
      monitoringInstance.logPerformance(
        'tempFileManager.moveFile',
        Date.now() - startTime,
        true,
        { fileId, destinationPath, size: data.length }
      );
      
      return destinationPath;
    } catch (error) {
      monitoringInstance.logPerformance(
        'tempFileManager.moveFile',
        Date.now() - startTime,
        false,
        { fileId, destinationPath, error }
      );
      throw error;
    }
  }

  /**
   * 시스템 상태 조회
   */
  public getSystemStatus(): TempFileSystemStatus {
    const fileMetadataArray = Array.from(this.metadata.values());
    const totalFiles = fileMetadataArray.length;
    const totalSize = this.getTotalSize();
    
    // 가장 오래된/최신 파일 찾기
    let oldestFile: TempFileMetadata | null = null;
    let newestFile: TempFileMetadata | null = null;
    
    if (totalFiles > 0) {
      oldestFile = fileMetadataArray.reduce((oldest, current) => 
        current.createdAt < oldest.createdAt ? current : oldest, fileMetadataArray[0]);
      
      newestFile = fileMetadataArray.reduce((newest, current) => 
        current.createdAt > newest.createdAt ? current : newest, fileMetadataArray[0]);
    }
    
    // 디스크 공간 정보
    const diskInfo = this.getDiskSpaceInfo();
    
    return {
      totalFiles,
      totalSize,
      oldestFile: oldestFile ? { ...oldestFile } : null,
      newestFile: newestFile ? { ...newestFile } : null,
      diskSpaceAvailable: diskInfo.available,
      diskSpaceTotal: diskInfo.total,
      diskSpaceUsedPercent: diskInfo.usedPercent
    };
  }

  /**
   * 디스크 공간 정보 조회
   */
  private getDiskSpaceInfo(): { available: number; total: number; usedPercent: number } {
    try {
      // 기본 반환값
      const defaultInfo = {
        available: 0,
        total: 0,
        usedPercent: 0
      };
      
      // 윈도우에서는 별도 처리 필요
      if (process.platform === 'win32') {
        const tempDrive = this.options.baseDirectory.split(path.sep)[0] || 'C:';
        // 윈도우에서는 적절한 API 사용 필요 (현재는 더미 데이터 반환)
        return defaultInfo;
      }
      
      // 리눅스/맥OS에서는 fs.statfs 사용 가능
      // 참고: Node.js 기본 API에는 없으므로 더미 데이터 반환
      return defaultInfo;
    } catch (error) {
      monitoringInstance.log('error', '디스크 공간 정보 조회 실패', {
        error
      }, 'temp-files');
      
      return {
        available: 0,
        total: 0,
        usedPercent: 0
      };
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const tempFileManager = new TempFileManager();
export default tempFileManager; 