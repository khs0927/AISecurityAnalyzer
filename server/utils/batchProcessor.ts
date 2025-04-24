import { EventEmitter } from 'events';
import { monitoringInstance } from '../monitoringInstance';

type BatchTask<T, R> = {
  id: string;
  input: T;
  priority: number;
  startTime?: number;
  endTime?: number;
  result?: R;
  error?: Error;
  retryCount: number;
};

type BatchProcessorOptions<T, R> = {
  name: string;                      // 프로세서 이름 (로깅용)
  maxConcurrent: number;             // 최대 동시 처리 개수
  maxBatchSize: number;              // 최대 배치 크기
  processor: (inputs: T[]) => Promise<R[]>; // 배치 처리 함수
  batchTimeWindowMs: number;         // 배치 윈도우 시간 (밀리초)
  maxRetries: number;                // 최대 재시도 횟수
  retryDelayMs: number;              // 재시도 지연 시간 (밀리초)
  onTaskComplete?: (task: BatchTask<T, R>) => void; // 태스크 완료 콜백
  onBatchComplete?: (tasks: BatchTask<T, R>[]) => void; // 배치 완료 콜백
  onError?: (error: Error, tasks: BatchTask<T, R>[]) => void; // 오류 콜백
  priorityThreshold?: number;        // 우선 처리 임계값
  timeoutMs?: number;                // 태스크 타임아웃 (밀리초)
};

/**
 * 배치 처리기 클래스
 * 다수의 태스크를 효율적으로 배치 처리하는 유틸리티
 */
export class BatchProcessor<T, R> extends EventEmitter {
  private options: Required<BatchProcessorOptions<T, R>>;
  private queue: BatchTask<T, R>[] = [];
  private processing: Set<string> = new Set();
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private paused: boolean = false;
  private stats = {
    tasksSubmitted: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    batchesProcessed: 0,
    avgBatchSize: 0,
    avgProcessingTimeMs: 0,
    maxQueueLength: 0,
    totalRetries: 0,
  };

  constructor(options: BatchProcessorOptions<T, R>) {
    super();
    
    // 기본값과 사용자 옵션 병합
    this.options = {
      maxConcurrent: 3,
      maxBatchSize: 10,
      batchTimeWindowMs: 200,
      maxRetries: 3,
      retryDelayMs: 1000,
      priorityThreshold: 8,
      timeoutMs: 30000,
      onTaskComplete: () => {},
      onBatchComplete: () => {},
      onError: () => {},
      ...options,
    };
    
    monitoringInstance.log('info', `배치 프로세서 초기화: ${this.options.name}`, {
      maxConcurrent: this.options.maxConcurrent,
      maxBatchSize: this.options.maxBatchSize,
      batchTimeWindow: `${this.options.batchTimeWindowMs}ms`,
    }, 'batch-processor');
  }

  /**
   * 태스크 제출
   * @param input 처리할 입력 데이터
   * @param priority 우선순위 (0-10, 10이 가장 높음)
   * @returns 태스크 ID
   */
  public submit(input: T, priority: number = 5): string {
    const id = this.generateTaskId();
    
    const task: BatchTask<T, R> = {
      id,
      input,
      priority: Math.max(0, Math.min(10, priority)), // 0-10 사이로 제한
      retryCount: 0,
    };
    
    this.queue.push(task);
    this.stats.tasksSubmitted++;
    
    // 큐 길이 통계 업데이트
    this.stats.maxQueueLength = Math.max(this.stats.maxQueueLength, this.queue.length);
    
    // 첫 태스크가 제출되면 처리 시작
    if (this.queue.length === 1 && !this.isProcessing && !this.paused) {
      this.scheduleBatch();
    }
    
    // 우선순위가 높은 태스크가 제출되면 즉시 실행 고려
    if (priority >= this.options.priorityThreshold && !this.isProcessing && !this.paused) {
      this.processBatch();
    }
    
    return id;
  }

  /**
   * 다수의 태스크 일괄 제출
   * @param inputs 입력 데이터 배열
   * @param priority 우선순위 (0-10, 10이 가장 높음)
   * @returns 태스크 ID 배열
   */
  public submitMany(inputs: T[], priority: number = 5): string[] {
    return inputs.map(input => this.submit(input, priority));
  }

  /**
   * 태스크 ID로 결과 조회
   * @param id 태스크 ID
   * @returns 태스크 정보 또는 null
   */
  public getTask(id: string): BatchTask<T, R> | null {
    // 큐에서 검색
    const queueTask = this.queue.find(task => task.id === id);
    if (queueTask) return { ...queueTask };
    
    // 처리 중인 태스크
    if (this.processing.has(id)) {
      const processingTask = this.queue.find(task => task.id === id);
      if (processingTask) return { ...processingTask };
    }
    
    return null;
  }

  /**
   * 현재 상태 조회
   */
  public getStatus(): {
    queueLength: number;
    processing: number;
    paused: boolean;
    stats: typeof this.stats;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      paused: this.paused,
      stats: { ...this.stats },
    };
  }

  /**
   * 처리 일시 중지
   */
  public pause(): void {
    if (!this.paused) {
      this.paused = true;
      
      // 예약된 배치 처리 취소
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
      
      monitoringInstance.log('info', `배치 프로세서 일시 중지: ${this.options.name}`, {}, 'batch-processor');
    }
  }

  /**
   * 처리 재개
   */
  public resume(): void {
    if (this.paused) {
      this.paused = false;
      
      // 큐에 항목이 있으면 처리 재개
      if (this.queue.length > 0 && !this.isProcessing) {
        this.scheduleBatch();
      }
      
      monitoringInstance.log('info', `배치 프로세서 재개: ${this.options.name}`, {}, 'batch-processor');
    }
  }

  /**
   * 특정 태스크 취소
   * @param id 태스크 ID
   * @returns 취소 성공 여부
   */
  public cancel(id: string): boolean {
    // 이미 처리 중인 태스크는 취소 불가
    if (this.processing.has(id)) {
      return false;
    }
    
    const index = this.queue.findIndex(task => task.id === id);
    if (index === -1) {
      return false;
    }
    
    this.queue.splice(index, 1);
    return true;
  }

  /**
   * 모든 태스크 취소 및 처리 중지
   */
  public clear(): void {
    // 처리 중이 아닌 태스크만 제거
    this.queue = this.queue.filter(task => this.processing.has(task.id));
    
    // 예약된 배치 처리 취소
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    monitoringInstance.log('info', `배치 프로세서 큐 초기화: ${this.options.name}`, {
      remainingTasks: this.queue.length,
    }, 'batch-processor');
  }

  /**
   * 태스크 ID 생성
   */
  private generateTaskId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * 배치 처리 예약
   */
  private scheduleBatch(): void {
    if (this.batchTimer || this.paused || this.isProcessing) {
      return;
    }
    
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processBatch();
    }, this.options.batchTimeWindowMs);
  }

  /**
   * 배치 처리 실행
   */
  private async processBatch(): Promise<void> {
    if (this.paused || this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // 우선순위에 따라 큐 정렬
      this.queue.sort((a, b) => b.priority - a.priority);
      
      // 동시 처리 가능한 양 계산
      const availableSlots = this.options.maxConcurrent - this.processing.size;
      if (availableSlots <= 0) {
        this.isProcessing = false;
        return;
      }
      
      // 처리할 배치 크기 결정 (최대 배치 크기와 가용 슬롯 중 작은 값)
      const batchSize = Math.min(
        this.options.maxBatchSize,
        availableSlots,
        this.queue.length
      );
      
      // 배치 선택
      const batch = this.queue.slice(0, batchSize);
      
      // 배치 처리 시작 시간 기록 및 처리 중 상태로 표시
      const batchStartTime = Date.now();
      batch.forEach(task => {
        task.startTime = batchStartTime;
        this.processing.add(task.id);
      });
      
      const inputs = batch.map(task => task.input);
      monitoringInstance.log('debug', `배치 처리 시작: ${this.options.name}`, {
        batchSize,
        queueLength: this.queue.length,
      }, 'batch-processor');
      
      // 배치 처리 타임아웃 설정
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          clearTimeout(timeoutId);
          reject(new Error(`배치 처리 타임아웃: ${this.options.timeoutMs}ms 초과`));
        }, this.options.timeoutMs);
      });
      
      // 배치 처리 실행 (타임아웃 처리 포함)
      const results = await Promise.race([
        this.options.processor(inputs),
        timeoutPromise,
      ]);
      
      // 배치 처리 완료 시간 기록
      const batchEndTime = Date.now();
      const batchProcessingTime = batchEndTime - batchStartTime;
      
      // 결과 매핑 및 상태 업데이트
      batch.forEach((task, index) => {
        task.result = results[index];
        task.endTime = batchEndTime;
        this.processing.delete(task.id);
        
        // 개별 태스크 완료 이벤트 발생
        this.options.onTaskComplete(task);
        this.emit('taskComplete', task);
      });
      
      // 처리 완료된 태스크 큐에서 제거
      this.queue = this.queue.filter(task => !batch.includes(task));
      
      // 통계 업데이트
      this.stats.tasksCompleted += batch.length;
      this.stats.batchesProcessed++;
      this.stats.avgBatchSize = (this.stats.avgBatchSize * (this.stats.batchesProcessed - 1) + batch.length) / this.stats.batchesProcessed;
      this.stats.avgProcessingTimeMs = (this.stats.avgProcessingTimeMs * (this.stats.batchesProcessed - 1) + batchProcessingTime) / this.stats.batchesProcessed;
      
      // 배치 완료 이벤트 발생
      this.options.onBatchComplete(batch);
      this.emit('batchComplete', batch);
      
      monitoringInstance.log('debug', `배치 처리 완료: ${this.options.name}`, {
        batchSize: batch.length,
        processingTime: `${batchProcessingTime}ms`,
        remainingQueue: this.queue.length,
      }, 'batch-processor');
    } catch (error) {
      // 오류 발생시 처리
      const failedTasks = this.queue.filter(task => this.processing.has(task.id));
      
      // 재시도 처리
      for (const task of failedTasks) {
        this.processing.delete(task.id);
        task.retryCount++;
        
        if (task.retryCount <= this.options.maxRetries) {
          // 재시도 큐에 추가 (우선순위 약간 상향)
          task.priority = Math.min(10, task.priority + 1);
          this.stats.totalRetries++;
          
          // 재시도 지연 설정 (지수 백오프)
          const retryDelay = this.options.retryDelayMs * Math.pow(2, task.retryCount - 1);
          setTimeout(() => {
            // 아직 큐에 있는지 확인 후 처리
            if (this.queue.includes(task) && !this.paused) {
              this.scheduleBatch();
            }
          }, retryDelay);
        } else {
          // 최대 재시도 횟수 초과
          task.error = error as Error;
          this.stats.tasksFailed++;
          
          // 실패한 태스크 큐에서 제거
          this.queue = this.queue.filter(t => t.id !== task.id);
          
          // 개별 태스크 실패 이벤트 발생
          this.emit('taskFailed', task);
        }
      }
      
      // 오류 콜백 및 이벤트 발생
      this.options.onError(error as Error, failedTasks);
      this.emit('error', error, failedTasks);
      
      monitoringInstance.log('error', `배치 처리 오류: ${this.options.name}`, {
        error: (error as Error).message,
        failedTasks: failedTasks.length,
      }, 'batch-processor');
    } finally {
      this.isProcessing = false;
      
      // 큐에 아이템이 남아있으면 다음 배치 예약
      if (this.queue.length > 0 && !this.paused) {
        this.scheduleBatch();
      }
    }
  }
}

export default BatchProcessor; 