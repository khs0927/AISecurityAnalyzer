/**
 * 의료 멀티모달 AI 시스템 - 데이터 파이프라인
 * 실시간으로 들어오는 웨어러블 장치 및 건강 데이터를 처리하는 파이프라인
 */

interface HealthDataStream {
  userId: string;
  timestamp: number;
  heartRate?: number;
  bloodOxygen?: number;
  ecg?: number[];
  symptoms?: string[];
  temperature?: number;
  bloodPressure?: { systolic: number; diastolic: number };
}

/**
 * 의료 데이터 파이프라인 클래스
 * 실시간 건강 데이터를 수집하고 처리합니다.
 */
export class MedicalDataPipeline {
  private static instance: MedicalDataPipeline;
  private buffer: HealthDataStream[] = [];
  private processing = false;
  private anomalyCallbacks: Array<(data: HealthDataStream[]) => Promise<void>> = [];

  private constructor() {
    console.log('의료 데이터 파이프라인 초기화...');
    // 정기적으로 큐 처리
    setInterval(() => this.processQueue(), 5000);
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): MedicalDataPipeline {
    if (!MedicalDataPipeline.instance) {
      MedicalDataPipeline.instance = new MedicalDataPipeline();
    }
    return MedicalDataPipeline.instance;
  }

  /**
   * 건강 데이터 수집
   * @param data 건강 데이터 스트림
   */
  public async ingest(data: HealthDataStream): Promise<void> {
    console.log(`데이터 수신: 사용자 ${data.userId}, 심박수 ${data.heartRate || 'N/A'}`);
    this.buffer.push(data);
    
    // 버퍼가 50개를 초과하면 즉시 처리 시작
    if (this.buffer.length > 50 && !this.processing) {
      this.processQueue();
    }
  }

  /**
   * 큐에 쌓인 데이터 처리
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.buffer.length === 0) return;
    
    this.processing = true;
    console.log(`큐 처리 시작: ${this.buffer.length}개 데이터`);
    
    try {
      // 최대 100개씩 배치 처리
      while (this.buffer.length > 0) {
        const batch = this.buffer.splice(0, Math.min(100, this.buffer.length));
        await this.analyzeBatch(batch);
      }
    } catch (error) {
      console.error('데이터 처리 중 오류:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * 데이터 배치 분석
   * @param batch 건강 데이터 배치
   */
  private async analyzeBatch(batch: HealthDataStream[]): Promise<void> {
    // 이상 징후 데이터 필터링
    const anomalies = batch.filter(data => this.detectAnomalies(data));
    
    if (anomalies.length > 0) {
      console.log(`이상 징후 감지: ${anomalies.length}건`);
      
      // 등록된 콜백 함수 호출
      for (const callback of this.anomalyCallbacks) {
        await callback(anomalies);
      }
    }
  }

  /**
   * 이상 징후 감지
   * @param data 건강 데이터
   */
  private detectAnomalies(data: HealthDataStream): boolean {
    // 심박수 이상 (너무 높거나 낮음)
    if (data.heartRate && (data.heartRate > 120 || data.heartRate < 40)) {
      return true;
    }
    
    // 산소포화도 이상 (92% 미만)
    if (data.bloodOxygen && data.bloodOxygen < 92) {
      return true;
    }
    
    // 체온 이상 (38도 초과 또는 35도 미만)
    if (data.temperature && (data.temperature > 38 || data.temperature < 35)) {
      return true;
    }
    
    // 혈압 이상 (수축기 160 초과 또는 이완기 100 초과)
    if (data.bloodPressure && 
        (data.bloodPressure.systolic > 160 || data.bloodPressure.diastolic > 100)) {
      return true;
    }
    
    // ECG 이상 (단순 분석 - 실제로는 더 복잡한 알고리즘 필요)
    if (data.ecg && data.ecg.length > 0) {
      const maxAmplitude = Math.max(...data.ecg.map(v => Math.abs(v)));
      if (maxAmplitude > 1.0) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 이상 징후 감지 시 호출될 콜백 등록
   * @param callback 콜백 함수
   */
  public onAnomalyDetected(callback: (data: HealthDataStream[]) => Promise<void>): void {
    this.anomalyCallbacks.push(callback);
  }
}

// 기본 인스턴스 내보내기
export default MedicalDataPipeline.getInstance(); 