import { logger } from '../config';
import fs from 'fs';
import path from 'path';
import * as tf from '@tensorflow/tfjs-node';
import NeuralLearningSystem from './neuralLearning';
import QuantumAmplificationSystem from './quantumAmplification';
import SelfLearningSystem from './selfLearning';
import { v4 as uuidv4 } from 'uuid';
import { HAIMModel } from './haim_model';
import { monitoringInstance } from '../monitoringInstance';
import modelCache from '../utils/modelCache';
import * as crypto from 'crypto';

interface IntegratedAiConfig {
  // 신경망 학습 관련 설정
  neuralLearning: {
    inputDimension: number;
    hiddenLayerDimensions: number[];
    outputDimension: number;
    learningRate: number;
    batchSize: number;
    epochs: number;
  };
  
  // 양자 증폭 관련 설정
  quantumAmplification: {
    qubits: number;
    iterations: number;
  };
  
  // 자가 학습 관련 설정
  selfLearning: {
    learningRate: number;
    reinforcementLearningRate: number;
    batchSize: number;
    epochs: number;
    memoryCapacity: number;
    miniBatchSize: number;
    gamma: number;
    explorationRate: number;
    explorationDecay: number;
    targetUpdateFrequency: number;
  };
  
  // 모델 경로 설정
  modelPaths: {
    baseDir: string;
    qwen25Path: string;
    mmedLlama3Path: string;
  };
  
  // API 설정
  api: {
    batchProcessSize: number;
    maxConcurrentRequests: number;
    timeout: number;
  };
}

interface TrainingStats {
  startTime: Date;
  endTime: Date | null;
  iterations: number;
  accuracy: number;
  loss: number;
  precision: number;
  recall: number;
  f1Score: number;
  sessionId: string;
}

interface PredictionResult {
  prediction: number[][];
  confidence: number[];
  processingTime: number;
  modelName: string;
  timestamp: Date;
}

export class IntegratedAiSystem {
  private config: IntegratedAiConfig;
  private neuralLearning: NeuralLearningSystem;
  private quantumAmplification: QuantumAmplificationSystem;
  private selfLearning: SelfLearningSystem;
  private haimModel: HAIMModel;
  
  private trainingHistory: TrainingStats[] = [];
  private isTraining: boolean = false;
  private readonly systemId: string;
  private readonly dataSavePath: string;

  constructor(config: IntegratedAiConfig) {
    this.config = config;
    this.systemId = uuidv4();
    this.dataSavePath = path.join(__dirname, '../data/integrated_system');
    
    // 데이터 저장 디렉토리 생성
    if (!fs.existsSync(this.dataSavePath)) {
      fs.mkdirSync(this.dataSavePath, { recursive: true });
    }
    
    // 신경망 학습 시스템 초기화
    this.neuralLearning = new NeuralLearningSystem({
      inputDimension: config.neuralLearning.inputDimension,
      hiddenLayerDimensions: config.neuralLearning.hiddenLayerDimensions,
      outputDimension: config.neuralLearning.outputDimension,
      learningRate: config.neuralLearning.learningRate,
      batchSize: config.neuralLearning.batchSize,
      epochs: config.neuralLearning.epochs
    });
    
    // 양자 증폭 시스템 초기화
    this.quantumAmplification = new QuantumAmplificationSystem(
      config.quantumAmplification.qubits,
      config.quantumAmplification.iterations
    );
    
    // 자가 학습 시스템 초기화
    this.selfLearning = new SelfLearningSystem({
      learningRate: config.selfLearning.learningRate,
      reinforcementLearningRate: config.selfLearning.reinforcementLearningRate,
      batchSize: config.selfLearning.batchSize,
      epochs: config.selfLearning.epochs,
      memoryCapacity: config.selfLearning.memoryCapacity,
      miniBatchSize: config.selfLearning.miniBatchSize,
      gamma: config.selfLearning.gamma,
      explorationRate: config.selfLearning.explorationRate,
      explorationDecay: config.selfLearning.explorationDecay,
      targetUpdateFrequency: config.selfLearning.targetUpdateFrequency
    });
    
    this.haimModel = new HAIMModel();
    
    logger.info(`Integrated AI System initialized with ID: ${this.systemId}`);
  }

  /**
   * 시스템 초기화 및 모델 준비
   */
  public async initialize(): Promise<void> {
    try {
      // 신경망 모델 초기화
      this.neuralLearning.initializeModel();
      
      // 강화학습 네트워크 초기화 (입력 차원과 행동 공간 크기 지정)
      this.selfLearning.initializeNetworks([this.config.neuralLearning.inputDimension], 10);
      
      logger.info('Integrated AI System fully initialized and ready');
    } catch (error) {
      logger.error('Failed to initialize Integrated AI System', error);
      throw new Error(`Integrated AI System initialization failed: ${error}`);
    }
  }

  /**
   * 통합 훈련 프로세스 실행
   * @param inputs 입력 데이터
   * @param targets 목표 데이터
   * @param iterations 훈련 반복 횟수
   */
  public async train(inputs: number[][], targets: number[][], iterations: number = 10): Promise<TrainingStats> {
    if (this.isTraining) {
      throw new Error('Training is already in progress. Please wait for it to complete or call stopTraining().');
    }
    
    this.isTraining = true;
    
    const sessionId = uuidv4();
    const trainingStats: TrainingStats = {
      startTime: new Date(),
      endTime: null,
      iterations: 0,
      accuracy: 0,
      loss: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      sessionId
    };
    
    try {
      logger.info(`Starting integrated training session ${sessionId} with ${iterations} iterations`);
      
      // 1. 자가학습을 통한 모델 개선
      const metricsHistory = await this.selfLearning.continuousSelfImprovement(iterations, inputs, targets);
      
      // 2. 최종 메트릭 기록
      const finalMetrics = metricsHistory[metricsHistory.length - 1];
      trainingStats.accuracy = finalMetrics.accuracy;
      trainingStats.loss = finalMetrics.loss;
      trainingStats.precision = finalMetrics.precision;
      trainingStats.recall = finalMetrics.recall;
      trainingStats.f1Score = finalMetrics.f1Score;
      trainingStats.iterations = iterations;
      trainingStats.endTime = new Date();
      
      // 3. 훈련 이력에 추가
      this.trainingHistory.push(trainingStats);
      
      // 4. 훈련 결과 저장
      await this.saveTrainingResults(sessionId, trainingStats, metricsHistory);
      
      logger.info(`Training session ${sessionId} completed successfully`);
      this.isTraining = false;
      
      return trainingStats;
    } catch (error) {
      this.isTraining = false;
      logger.error(`Training session ${sessionId} failed`, error);
      throw new Error(`Training failed: ${error}`);
    }
  }

  /**
   * 훈련 결과 저장
   */
  private async saveTrainingResults(sessionId: string, stats: TrainingStats, metricsHistory: any[]): Promise<void> {
    try {
      const sessionDir = path.join(this.dataSavePath, 'training_sessions', sessionId);
      
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      // 통계 저장
      fs.writeFileSync(
        path.join(sessionDir, 'training_stats.json'),
        JSON.stringify(stats, null, 2)
      );
      
      // 메트릭 이력 저장
      fs.writeFileSync(
        path.join(sessionDir, 'metrics_history.json'),
        JSON.stringify(metricsHistory, null, 2)
      );
      
      // 모델 저장
      await this.selfLearning.saveModels(`integrated_training_${sessionId}`);
      
      logger.info(`Training results saved for session ${sessionId}`);
    } catch (error) {
      logger.error('Failed to save training results', error);
    }
  }

  /**
   * 현재 진행 중인 훈련 중지
   */
  public stopTraining(): void {
    if (this.isTraining) {
      this.isTraining = false;
      logger.info('Training process stopped by user request');
    }
  }

  /**
   * 통합 예측 수행
   * @param inputs 입력 데이터
   */
  public async predict(inputs: number[][]): Promise<PredictionResult> {
    monitoringInstance.log('info', '통합 AI 예측 시작', { inputType: 'image' });
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(inputs);

    // 캐시 확인
    const cachedResult = await modelCache.get<PredictionResult>(cacheKey);
    if (cachedResult) {
      monitoringInstance.log('info', '캐시된 예측 결과 사용', { inputType: 'image' });
      monitoringInstance.logPerformance('integratedAi.predict', Date.now() - startTime, true, { cached: true });
      return cachedResult;
    }

    const predictions: Record<string, any> = {};

    // 1. 신경망 기반 예측
    const neuralPredictions = this.neuralLearning.predict(inputs);
    predictions.neural = neuralPredictions;
    
    // 2. 양자 증폭을 사용한 신뢰도 강화
    const quantumConfidences: number[] = [];
    
    for (let i = 0; i < inputs.length; i++) {
      // 각 입력에 대해 최대 확률을 가진 클래스 인덱스 찾기
      const predictedClass = neuralPredictions[i].indexOf(Math.max(...neuralPredictions[i]));
      
      // 양자 증폭으로 신뢰도 계산
      const qConfidence = this.quantumAmplification.classifyMedicalData([inputs[i]], predictedClass);
      quantumConfidences.push(qConfidence[0]);
    }
    
    predictions.quantum = quantumConfidences;
    
    // 3. 자가학습 시스템으로 최종 예측
    const selfLearningPredictions = this.selfLearning.predict(inputs);
    predictions.selfLearning = selfLearningPredictions;
    
    // 4. 앙상블 방식으로 최종 결과 계산 (가중 평균)
    const finalPredictions: number[][] = [];
    
    for (let i = 0; i < inputs.length; i++) {
      const combined: number[] = [];
      
      for (let j = 0; j < neuralPredictions[i].length; j++) {
        // 신경망과 자가학습 결과의 가중 평균 (70:30)
        combined.push(
          neuralPredictions[i][j] * 0.7 + selfLearningPredictions[i][j] * 0.3
        );
      }
      
      finalPredictions.push(combined);
    }
    
    predictions.final = finalPredictions;
    
    const processingTime = Date.now() - startTime;
    
    const result: PredictionResult = {
      prediction: finalPredictions,
      confidence: quantumConfidences,
      processingTime,
      modelName: 'IntegratedSystem (HAIM+Neural+Quantum+SelfLearning)',
      timestamp: new Date()
    };

    // 결과 캐싱
    await modelCache.set(cacheKey, result);

    monitoringInstance.logPerformance('integratedAi.predict', Date.now() - startTime, true, { inputType: 'image' });
    return result;
  } catch (error) {
    monitoringInstance.log('error', '통합 AI 예측 실패', { error });
    monitoringInstance.logPerformance('integratedAi.predict', Date.now() - startTime, false, { error });
    throw new Error(`Prediction failed: ${error}`);
  }
}

  /**
   * 의료 이미지 분석
   * @param imageData 이미지 데이터 (텐서플로우 호환 형식)
   */
  public async analyzeMedicalImage(imageData: tf.Tensor): Promise<any> {
    try {
      // 1. 이미지 데이터 전처리
      const processedData = await this.preprocessImageData(imageData);
      
      // 2. 특성 추출
      const features = await this.extractFeatures(processedData);
      
      // 3. 예측 수행
      const predictionResult = await this.predict([features]);
      
      // 4. 결과 후처리 및 해석
      const analysis = this.interpretResults(predictionResult);
      
      return analysis;
    } catch (error) {
      logger.error('Medical image analysis failed', error);
      throw new Error(`Medical image analysis failed: ${error}`);
    }
  }

  /**
   * 이미지 데이터 전처리
   */
  private async preprocessImageData(imageData: tf.Tensor): Promise<tf.Tensor> {
    // 이미지 크기 조정
    const resized = tf.image.resizeBilinear(imageData as tf.Tensor3D | tf.Tensor4D, [224, 224]);
    
    // 정규화
    const normalized = resized.div(255);
    
    // 이미지가 3D인 경우 배치 차원 추가
    const batched = normalized.rank === 3 ? normalized.expandDims(0) : normalized;
    
    return batched;
  }

  /**
   * 이미지 특성 추출
   */
  private async extractFeatures(processedImage: tf.Tensor): Promise<number[]> {
    // 사전 훈련된 MobileNet 모델 사용 예시
    const mobilenet = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
    
    // 특성 추출 (마지막 전 레이어 출력)
    const activation = mobilenet.predict(processedImage) as tf.Tensor;
    
    // 결과를 1D 배열로 변환
    const features = Array.from(activation.dataSync());
    
    // 메모리 정리
    mobilenet.dispose();
    activation.dispose();
    
    return features;
  }

  /**
   * 예측 결과 해석
   */
  private interpretResults(predictionResult: PredictionResult): any {
    const predictions = predictionResult.prediction[0];
    const maxProbIndex = predictions.indexOf(Math.max(...predictions));
    
    // 의학적 조건을 정의한 클래스 매핑 (예시)
    const medicalConditions = [
      '정상',
      '폐렴',
      '결핵',
      '폐암',
      '심장비대',
      '무기폐',
      '폐수종',
      '기흉',
      '늑막삼출액',
      '기타 이상'
    ];
    
    // 상위 3개 예측 찾기
    const topPredictions = predictions
      .map((prob, index) => ({ condition: medicalConditions[index], probability: prob }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3);
    
    return {
      mainDiagnosis: {
        condition: medicalConditions[maxProbIndex],
        probability: predictions[maxProbIndex]
      },
      differentialDiagnosis: topPredictions,
      confidence: predictionResult.confidence[0],
      processingTime: predictionResult.processingTime,
      timestamp: predictionResult.timestamp
    };
  }

  /**
   * 의료 텍스트 분석
   * @param textData 분석할 텍스트 (환자 증상 설명 등)
   */
  public async analyzeMedicalText(textData: string): Promise<any> {
    try {
      // 텍스트 전처리 및 특성 추출
      const features = await this.extractTextFeatures(textData);
      
      // 예측 수행
      const predictionResult = await this.predict([features]);
      
      // 결과 해석
      const analysis = this.interpretTextResults(predictionResult, textData);
      
      return analysis;
    } catch (error) {
      logger.error('Medical text analysis failed', error);
      throw new Error(`Medical text analysis failed: ${error}`);
    }
  }

  /**
   * 텍스트 특성 추출 (간단한 임베딩 기반)
   */
  private async extractTextFeatures(text: string): Promise<number[]> {
    // 텍스트를 임베딩 벡터로 변환 (실제로는 더 복잡한 임베딩 사용)
    const universalSentenceEncoder = await tf.loadGraphModel(
      'https://tfhub.dev/tensorflow/tfjs-model/universal-sentence-encoder-lite/1/default/1',
      { fromTFHub: true }
    );
    
    const textEmbedding = universalSentenceEncoder.predict([text]) as tf.Tensor;
    const features = Array.from(textEmbedding.dataSync());
    
    // 메모리 정리
    universalSentenceEncoder.dispose();
    textEmbedding.dispose();
    
    // 지정된 입력 차원에 맞게 조정
    if (features.length < this.config.neuralLearning.inputDimension) {
      // 부족한 차원 0으로 채우기
      return [...features, ...Array(this.config.neuralLearning.inputDimension - features.length).fill(0)];
    } else if (features.length > this.config.neuralLearning.inputDimension) {
      // 초과 차원 자르기
      return features.slice(0, this.config.neuralLearning.inputDimension);
    }
    
    return features;
  }

  /**
   * 텍스트 분석 결과 해석
   */
  private interpretTextResults(predictionResult: PredictionResult, originalText: string): any {
    const predictions = predictionResult.prediction[0];
    const maxProbIndex = predictions.indexOf(Math.max(...predictions));
    
    // 의학적 조건 클래스 매핑 (예시)
    const medicalConditions = [
      '정상',
      '감기/독감',
      '알레르기',
      '소화기 질환',
      '심혈관 질환',
      '호흡기 질환',
      '신경학적 질환',
      '피부 질환',
      '내분비 질환',
      '기타 질환'
    ];
    
    // 상위 3개 예측 찾기
    const topPredictions = predictions
      .map((prob, index) => ({ condition: medicalConditions[index], probability: prob }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3);
    
    // 핵심 키워드 추출 (간단한 구현)
    const keywords = this.extractKeywords(originalText);
    
    return {
      mainDiagnosis: {
        condition: medicalConditions[maxProbIndex],
        probability: predictions[maxProbIndex]
      },
      differentialDiagnosis: topPredictions,
      confidence: predictionResult.confidence[0],
      relevantKeywords: keywords,
      processingTime: predictionResult.processingTime,
      timestamp: predictionResult.timestamp
    };
  }

  /**
   * 텍스트에서 의학 관련 키워드 추출
   */
  private extractKeywords(text: string): string[] {
    // 의학 관련 키워드 사전 (실제로는 더 포괄적인 사전 사용)
    const medicalKeywords = [
      '통증', '열', '두통', '기침', '발열', '호흡곤란', '구토', '설사',
      '피로', '어지러움', '발진', '부종', '혈압', '당뇨', '알레르기',
      '심장', '폐', '간', '신장', '위', '장', '뇌', '관절', '근육'
    ];
    
    // 텍스트에서 찾은 키워드 목록
    const foundKeywords: string[] = [];
    
    // 각 키워드에 대해 텍스트 검색
    medicalKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    });
    
    return foundKeywords;
  }

  /**
   * 멀티모달 분석 (이미지 + 텍스트)
   * @param imageData 이미지 데이터
   * @param textData 텍스트 데이터
   */
  public async multimodalAnalysis(imageData: tf.Tensor, textData: string): Promise<any> {
    try {
      // 이미지 분석과 텍스트 분석 병렬로 수행
      const [imageAnalysis, textAnalysis] = await Promise.all([
        this.analyzeMedicalImage(imageData),
        this.analyzeMedicalText(textData)
      ]);
      
      // 결과 통합
      const integratedAnalysis = this.integrateAnalysisResults(imageAnalysis, textAnalysis);
      
      return integratedAnalysis;
    } catch (error) {
      logger.error('Multimodal analysis failed', error);
      throw new Error(`Multimodal analysis failed: ${error}`);
    }
  }

  /**
   * 이미지와 텍스트 분석 결과 통합
   */
  private integrateAnalysisResults(imageAnalysis: any, textAnalysis: any): any {
    // 신뢰도 가중치에 따라 최종 진단 결정
    const imageWeight = imageAnalysis.confidence;
    const textWeight = textAnalysis.confidence;
    const totalWeight = imageWeight + textWeight;
    
    const weightedImageProb = imageAnalysis.mainDiagnosis.probability * (imageWeight / totalWeight);
    const weightedTextProb = textAnalysis.mainDiagnosis.probability * (textWeight / totalWeight);
    
    // 최종 진단은 가중치가 높은 쪽 선택
    const finalDiagnosis = weightedImageProb > weightedTextProb
      ? {
        condition: imageAnalysis.mainDiagnosis.condition,
        probability: weightedImageProb,
        source: 'image'
      }
      : {
        condition: textAnalysis.mainDiagnosis.condition,
        probability: weightedTextProb,
        source: 'text'
      };
    
    // 두 분석의 감별진단 통합
    const combinedDifferentialDiagnosis: any[] = [
      ...imageAnalysis.differentialDiagnosis,
      ...textAnalysis.differentialDiagnosis
    ]
    .reduce((acc: any[], current) => {
      // 이미 존재하는 진단인지 확인
      const existingDiagnosis = acc.find(item => item.condition === current.condition);
      
      if (existingDiagnosis) {
        // 이미 있으면 확률 업데이트 (높은 쪽 선택)
        existingDiagnosis.probability = Math.max(existingDiagnosis.probability, current.probability);
      } else {
        // 없으면 추가
        acc.push({ ...current });
      }
      
      return acc;
    }, [])
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5); // 상위 5개만 유지
    
    return {
      finalDiagnosis,
      differentialDiagnosis: combinedDifferentialDiagnosis,
      imageAnalysis,
      textAnalysis,
      integratedConfidence: (imageAnalysis.confidence + textAnalysis.confidence) / 2,
      processingTime: imageAnalysis.processingTime + textAnalysis.processingTime,
      timestamp: new Date()
    };
  }

  /**
   * 훈련 이력 가져오기
   */
  public getTrainingHistory(): TrainingStats[] {
    return this.trainingHistory;
  }

  /**
   * 진단 설명 생성
   * @param analysis 분석 결과
   */
  public async generateDiagnosisExplanation(analysis: any): Promise<string> {
    try {
      // 분석 결과를 기반으로 설명 텍스트 생성
      const condition = analysis.finalDiagnosis.condition;
      const probability = analysis.finalDiagnosis.probability;
      const confidence = analysis.integratedConfidence;
      
      // 간단한 설명 템플릿
      let explanation = `진단 결과: ${condition} (확률: ${(probability * 100).toFixed(2)}%, 신뢰도: ${(confidence * 100).toFixed(2)}%)\n\n`;
      
      // 감별진단 추가
      explanation += "감별진단:\n";
      analysis.differentialDiagnosis.forEach((diagnosis: any, index: number) => {
        explanation += `${index + 1}. ${diagnosis.condition} (확률: ${(diagnosis.probability * 100).toFixed(2)}%)\n`;
      });
      
      // 관련 키워드가 있으면 추가
      if (analysis.textAnalysis && analysis.textAnalysis.relevantKeywords) {
        explanation += "\n관련 증상 키워드: ";
        explanation += analysis.textAnalysis.relevantKeywords.join(", ");
      }
      
      return explanation;
    } catch (error) {
      logger.error('Failed to generate diagnosis explanation', error);
      return "진단 설명을 생성하는 중 오류가 발생했습니다.";
    }
  }

  /**
   * 시스템 상태 확인
   */
  public getSystemStatus(): any {
    return {
      systemId: this.systemId,
      isTraining: this.isTraining,
      lastTrainingSession: this.trainingHistory.length > 0
        ? this.trainingHistory[this.trainingHistory.length - 1]
        : null,
      trainingSessionsCount: this.trainingHistory.length,
      neuralLearningInitialized: !!this.neuralLearning,
      quantumAmplificationInitialized: !!this.quantumAmplification,
      selfLearningInitialized: !!this.selfLearning,
      timestamp: new Date()
    };
  }

  /**
   * 심장 질환 위험도 평가
   */
  public async evaluateCardiacRisk(ecgData: number[], patientInfo: PatientInfo): Promise<CardiacRiskResult> {
    monitoringInstance.log('info', '심장 질환 위험도 평가 시작', { dataPoints: ecgData.length });
    const startTime = Date.now();
    const cacheKey = `cardiacRisk_${patientInfo.id}_${this.hashData(ecgData)}`;

    // 캐시 확인
    const cachedResult = await modelCache.get<CardiacRiskResult>(cacheKey);
    if (cachedResult) {
      monitoringInstance.log('info', '캐시된 심장 위험도 평가 결과 사용', { patientId: patientInfo.id });
      monitoringInstance.logPerformance('evaluateCardiacRisk', Date.now() - startTime, true, { cached: true });
      return cachedResult;
    }

    // HAIM 모델로 위험도 평가
    const riskResult = await this.haimModel.evaluateRisk(ecgData, patientInfo);
    
    // 캐시에 결과 저장 (24시간 유효)
    await modelCache.set(cacheKey, riskResult, 24 * 60 * 60);
    
    // 성능 로깅
    monitoringInstance.logPerformance('evaluateCardiacRisk', Date.now() - startTime, true, { 
      patientId: patientInfo.id 
    });
    
    return riskResult;
  }
}

export default IntegratedAiSystem; 