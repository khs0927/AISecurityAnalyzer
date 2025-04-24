import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { Request } from 'express';
import { monitoring } from './monitoring';
import { config } from '../config';

/**
 * 파일 업로드 관련 타입
 */
export interface UploadOptions {
  directory?: string;
  maxSize?: number;
  allowedTypes?: string[];
  generateUniqueFilename?: boolean;
  metadata?: Record<string, any>;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  extension: string;
  uploadDate: Date;
  metadata?: Record<string, any>;
  url?: string;
}

/**
 * 파일 업로드 관리 클래스
 */
export class FileUploader {
  private static instance: FileUploader;
  private baseUploadDir: string;
  private defaultOptions: UploadOptions = {
    maxSize: 10 * 1024 * 1024, // 기본 10MB
    generateUniqueFilename: true,
    allowedTypes: []
  };
  
  private constructor() {
    this.baseUploadDir = config.upload.directory || path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectoryExists();
  }
  
  /**
   * FileUploader 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): FileUploader {
    if (!FileUploader.instance) {
      FileUploader.instance = new FileUploader();
    }
    return FileUploader.instance;
  }
  
  /**
   * 업로드 디렉토리가 존재하는지 확인하고, 없으면 생성합니다
   */
  private async ensureUploadDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.baseUploadDir);
    } catch (error) {
      await fs.mkdir(this.baseUploadDir, { recursive: true });
      monitoring.log('system', 'info', `업로드 디렉토리 생성: ${this.baseUploadDir}`);
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
   * Multer 미들웨어 인스턴스를 생성합니다
   * @param options 업로드 옵션
   */
  public createMulterMiddleware(options: UploadOptions = {}): multer.Multer {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const uploadDir = mergedOptions.directory
      ? path.join(this.baseUploadDir, mergedOptions.directory)
      : this.baseUploadDir;
    
    // 디렉토리 생성 (비동기로 처리)
    this.ensureDirectoryExists(uploadDir).catch(err => {
      monitoring.log('system', 'error', `업로드 디렉토리 생성 오류: ${err.message}`);
    });
    
    // 저장소 설정
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        if (mergedOptions.generateUniqueFilename) {
          const uniqueFilename = this.generateUniqueFilename(file.originalname);
          cb(null, uniqueFilename);
        } else {
          cb(null, file.originalname);
        }
      }
    });
    
    // 파일 필터 설정
    const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      if (mergedOptions.allowedTypes && mergedOptions.allowedTypes.length > 0) {
        const mimeType = file.mimetype.toLowerCase();
        if (!mergedOptions.allowedTypes.includes(mimeType)) {
          return cb(new Error(`허용되지 않는 파일 타입: ${mimeType}`));
        }
      }
      cb(null, true);
    };
    
    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: mergedOptions.maxSize
      }
    });
  }
  
  /**
   * 고유한 파일 이름을 생성합니다
   * @param originalFilename 원본 파일 이름
   */
  private generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilename);
    return `${timestamp}-${randomString}${extension}`;
  }
  
  /**
   * 파일을 저장하고 메타데이터를 반환합니다
   * @param file 업로드된 파일 정보
   * @param options 업로드 옵션
   */
  public async saveFile(file: Express.Multer.File, options: UploadOptions = {}): Promise<UploadedFile> {
    const { originalname, filename, path: filePath, size, mimetype } = file;
    const extension = path.extname(originalname).substring(1);
    
    const uploadedFile: UploadedFile = {
      id: uuidv4(),
      originalName: originalname,
      filename,
      path: filePath,
      size,
      mimeType: mimetype,
      extension,
      uploadDate: new Date(),
      metadata: options.metadata
    };
    
    // URL 생성 (설정에 baseUrl이 있는 경우)
    if (config.upload.baseUrl) {
      const relativePath = filePath.replace(this.baseUploadDir, '').replace(/\\/g, '/');
      uploadedFile.url = `${config.upload.baseUrl}${relativePath}`;
    }
    
    monitoring.log('system', 'info', `파일 업로드 완료: ${filename} (${size} bytes)`);
    return uploadedFile;
  }
  
  /**
   * 파일을 삭제합니다
   * @param filePath 파일 경로
   */
  public async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      monitoring.log('system', 'info', `파일 삭제 완료: ${filePath}`);
      return true;
    } catch (error) {
      monitoring.log('system', 'error', `파일 삭제 오류: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 업로드 디렉토리의 모든 파일 목록을 가져옵니다
   * @param directory 특정 디렉토리 (옵션)
   */
  public async listFiles(directory?: string): Promise<string[]> {
    const targetDir = directory
      ? path.join(this.baseUploadDir, directory)
      : this.baseUploadDir;
    
    try {
      await fs.access(targetDir);
      const files = await fs.readdir(targetDir);
      return files;
    } catch (error) {
      monitoring.log('system', 'error', `파일 목록 조회 오류: ${error.message}`);
      return [];
    }
  }
  
  /**
   * 파일 정보를 가져옵니다
   * @param filePath 파일 경로
   */
  public async getFileInfo(filePath: string): Promise<Omit<UploadedFile, 'id' | 'metadata' | 'url'> | null> {
    try {
      const stats = await fs.stat(filePath);
      const filename = path.basename(filePath);
      const extension = path.extname(filePath).substring(1);
      
      // MIME 타입 결정 (간단한 구현)
      let mimeType = 'application/octet-stream';
      const mimeTypeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'json': 'application/json',
        'xml': 'application/xml',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
      
      if (mimeTypeMap[extension.toLowerCase()]) {
        mimeType = mimeTypeMap[extension.toLowerCase()];
      }
      
      return {
        originalName: filename,
        filename,
        path: filePath,
        size: stats.size,
        mimeType,
        extension,
        uploadDate: stats.mtime
      };
    } catch (error) {
      monitoring.log('system', 'error', `파일 정보 조회 오류: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 파일이 특정 위치에 존재하는지 확인합니다
   * @param filePath 파일 경로
   */
  public async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 임시 파일을 정리합니다
   * @param olderThanDays 특정 일수보다 오래된 파일만 삭제
   * @param directory 특정 디렉토리 (옵션)
   */
  public async cleanupTempFiles(olderThanDays: number = 7, directory?: string): Promise<number> {
    const targetDir = directory
      ? path.join(this.baseUploadDir, directory)
      : path.join(this.baseUploadDir, 'temp');
    
    try {
      await fs.access(targetDir);
    } catch (error) {
      // 디렉토리가 없으면 생성하고 종료
      await fs.mkdir(targetDir, { recursive: true });
      return 0;
    }
    
    try {
      const now = Date.now();
      const maxAge = olderThanDays * 24 * 60 * 60 * 1000; // 일 -> 밀리초
      const files = await fs.readdir(targetDir);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(targetDir, file);
        const stats = await fs.stat(filePath);
        
        // 파일 생성 시간 확인
        const age = now - stats.mtime.getTime();
        
        if (age > maxAge) {
          await fs.unlink(filePath);
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
  
  /**
   * 파일을 스트림으로 읽습니다
   * @param filePath 파일 경로
   */
  public createReadStream(filePath: string): fs.FileHandle {
    return fs.open(filePath, 'r');
  }
  
  /**
   * 여러 파일을 일괄 삭제합니다
   * @param filePaths 파일 경로 배열
   */
  public async deleteMultipleFiles(filePaths: string[]): Promise<{ success: string[], failed: string[] }> {
    const result = {
      success: [],
      failed: []
    };
    
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        result.success.push(filePath);
      } catch (error) {
        result.failed.push(filePath);
        monitoring.log('system', 'error', `파일 삭제 오류: ${error.message}, 파일: ${filePath}`);
      }
    }
    
    monitoring.log('system', 'info', `일괄 파일 삭제 완료: ${result.success.length}개 성공, ${result.failed.length}개 실패`);
    return result;
  }
}

// 싱글톤 인스턴스 생성
export const fileUploader = FileUploader.getInstance(); 