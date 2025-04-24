import fs from 'fs';
import path from 'path';
import { logger } from '../config';
import schedule from 'node-schedule';

/**
 * 임시 파일 관리 유틸리티 클래스
 * 업로드된 파일의 라이프사이클 관리 및 정기적인, 안전한 정리 담당
 */
export class FileManager {
  private static instance: FileManager;
  private uploadPath: string;
  private maxFileAge: number; // 밀리초 단위
  private cleanupJob: schedule.Job | null = null;
  
  private constructor(uploadPath: string = path.join(__dirname, '../uploads'), maxAgeHours: number = 1) {
    this.uploadPath = uploadPath;
    this.maxFileAge = maxAgeHours * 60 * 60 * 1000; // 시간 -> 밀리초 변환
    
    // 업로드 디렉토리가 없으면 생성
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
    
    // 정기적인 임시 파일 정리 스케줄 설정 (매 시간)
    this.cleanupJob = schedule.scheduleJob('0 * * * *', () => {
      this.cleanupTempFiles();
    });
    
    logger.info(`FileManager initialized with upload path: ${this.uploadPath}`);
  }
  
  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager();
    }
    return FileManager.instance;
  }
  
  /**
   * 임시 파일 정리
   * 지정된 시간(기본 1시간)보다 오래된 파일 삭제
   */
  public cleanupTempFiles(): void {
    try {
      logger.info('Running temporary file cleanup...');
      const now = Date.now();
      
      if (!fs.existsSync(this.uploadPath)) {
        return;
      }
      
      const files = fs.readdirSync(this.uploadPath);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.uploadPath, file);
        
        // 디렉토리는 건너뛰기
        if (fs.statSync(filePath).isDirectory()) {
          continue;
        }
        
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        // 지정된 시간보다 오래된 파일 삭제
        if (fileAge > this.maxFileAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      
      logger.info(`Temporary file cleanup completed: ${deletedCount} files deleted`);
    } catch (error) {
      logger.error('Error during temporary file cleanup:', error);
    }
  }
  
  /**
   * 특정 파일 안전하게 삭제
   * @param filePath 삭제할 파일 경로
   */
  public safeDeleteFile(filePath: string): boolean {
    try {
      // 업로드 디렉토리 내부의 파일인지 확인 (디렉토리 탈출 방지)
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith(this.uploadPath)) {
        logger.warn(`Attempted to delete file outside upload directory: ${filePath}`);
        return false;
      }
      
      // 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      // 파일 삭제
      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      logger.error(`Error deleting file ${filePath}:`, error);
      return false;
    }
  }
  
  /**
   * 모든 임시 파일 삭제
   */
  public clearAllTempFiles(): void {
    try {
      if (!fs.existsSync(this.uploadPath)) {
        return;
      }
      
      const files = fs.readdirSync(this.uploadPath);
      
      for (const file of files) {
        const filePath = path.join(this.uploadPath, file);
        
        // 디렉토리는 건너뛰기
        if (fs.statSync(filePath).isDirectory()) {
          continue;
        }
        
        fs.unlinkSync(filePath);
      }
      
      logger.info('All temporary files cleared');
    } catch (error) {
      logger.error('Error clearing all temporary files:', error);
    }
  }
  
  /**
   * 서버 종료 시 리소스 정리
   */
  public shutdown(): void {
    if (this.cleanupJob) {
      this.cleanupJob.cancel();
      this.cleanupJob = null;
    }
    
    // 서버 종료 시 모든 임시 파일 삭제
    this.clearAllTempFiles();
    logger.info('FileManager shutdown completed');
  }
}

export default FileManager.getInstance(); 