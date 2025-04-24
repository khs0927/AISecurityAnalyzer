import { logger } from '../config';
import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs';
import path from 'path';
import NeuralLearningSystem from './neuralLearning';
import QuantumAmplificationSystem from './quantumAmplification';

interface SelfLearningConfig {
  learningRate: number;
  reinforcementLearningRate: number;
  batchSize: number;
  epochs: number;
  memoryCapacity: number;
  miniBatchSize: number;
  gamma: number; // 할인 계수
  explorationRate: number; // 탐색률
  explorationDecay: number; // 탐색률 감소 계수
  targetUpdateFrequency: number; // 타겟 네트워크 업데이트 빈도
}

interface Experience {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  done: boolean;
}

interface ModelMetrics {
  accuracy: number;
  loss: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export class SelfLearningSystem {
  private config: SelfLearningConfig;
  private policyNetwork: tf.LayersModel | null = null;
  private targetNetwork: tf.LayersModel | null = null;
  private experienceMemory: Experience[] = [];
  private neuralLearning: NeuralLearningSystem;
  private quantumAmplification: QuantumAmplificationSystem;
  
  private currentExplorationRate: number;
  private learningSteps: number = 0;
  private modelMetricsHistory: ModelMetrics[] = [];
  private readonly modelSavePath: string;

  constructor(config: SelfLearningConfig) {
    this.config = config;
    this.currentExplorationRate = config.explorationRate;
    this.modelSavePath = path.join(__dirname, '../data/self_learning_models');
    
    // 모델 저장 디렉토리 생성
    if (!fs.existsSync(this.modelSavePath)) {
      fs.mkdirSync(this.modelSavePath, { recursive: true });
    }
    
    // 신경망 학습 시스템 초기화
    this.neuralLearning = new NeuralLearningSystem({
      inputDimension: 64, // 예시 값: 의료 데이터 벡터 크기
      hiddenLayerDimensions: [128, 64, 32],
      outputDimension: 10, // 예시 값: 진단 클래스 수
      learningRate: config.learningRate,
      batchSize: config.batchSize,
      epochs: config.epochs
    });
    
    // 양자 증폭 시스템 초기화
    this.quantumAmplification = new QuantumAmplificationSystem(6, 3); // 6큐비트, 3회 반복
    
    logger.info('Self Learning System initialized');
  }

  /**
   * 정책 네트워크와 타겟 네트워크 초기화
   * @param inputShape 입력 데이터 형태
   * @param actionSpace 행동 공간 크기
   */
  public initializeNetworks(inputShape: number[], actionSpace: number): void {
    try {
      // 정책 네트워크 생성
      this.policyNetwork = this.createNetwork(inputShape, actionSpace);
      
      // 타겟 네트워크 생성 (초기에는 정책 네트워크와 동일)
      this.targetNetwork = this.createNetwork(inputShape, actionSpace);
      this.updateTargetNetwork();
      
      logger.info('Policy and target networks initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize networks', error);
      throw new Error(`Network initialization failed: ${error}`);
    }
  }

  /**
   * 강화학습 네트워크 생성
   */
  private createNetwork(inputShape: number[], actionSpace: number): tf.LayersModel {
    const model = tf.sequential();
    
    // 입력층
    model.add(tf.layers.dense({
      units: 128,
      activation: 'relu',
      inputShape: inputShape
    }));
    
    // 은닉층
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));
    
    // 출력층 (각 행동의 Q-값)
    model.add(tf.layers.dense({
      units: actionSpace,
      activation: 'linear'
    }));
    
    // 모델 컴파일
    model.compile({
      optimizer: tf.train.adam(this.config.reinforcementLearningRate),
      loss: 'meanSquaredError'
    });
    
    return model;
  }

  /**
   * 경험 메모리에 경험 추가
   */
  public addExperience(state: number[], action: number, reward: number, nextState: number[], done: boolean): void {
    const experience: Experience = {
      state,
      action,
      reward,
      nextState,
      done
    };
    
    // 메모리 용량 초과 시 가장 오래된 경험 제거
    if (this.experienceMemory.length >= this.config.memoryCapacity) {
      this.experienceMemory.shift();
    }
    
    this.experienceMemory.push(experience);
  }

  /**
   * 현재 상태에서 ε-greedy 정책으로 행동 선택
   */
  public selectAction(state: number[]): number {
    // 탐색: 무작위 행동 선택
    if (Math.random() < this.currentExplorationRate) {
      const actionSpace = this.policyNetwork!.outputs[0].shape![1] as number;
      return Math.floor(Math.random() * actionSpace);
    }
    
    // 활용: 최적 행동 선택
    const stateTensor = tf.tensor2d([state]);
    const qValues = this.policyNetwork!.predict(stateTensor) as tf.Tensor;
    const action = tf.argMax(qValues, 1).dataSync()[0];
    
    // 메모리 정리
    stateTensor.dispose();
    qValues.dispose();
    
    return action;
  }

  /**
   * 경험 리플레이를 사용한 네트워크 학습
   */
  public async learn(): Promise<void> {
    if (this.experienceMemory.length < this.config.miniBatchSize) {
      return; // 충분한 경험이 쌓이지 않았음
    }
    
    try {
      // 미니배치 샘플링
      const miniBatch = this.sampleExperiences();
      
      // 학습 데이터 준비
      const states = tf.tensor2d(miniBatch.map(exp => exp.state));
      const nextStates = tf.tensor2d(miniBatch.map(exp => exp.nextState));
      
      // 현재 Q 값 계산
      const currentQValues = this.policyNetwork!.predict(states) as tf.Tensor;
      
      // 타겟 Q 값 계산
      const targetQValues = this.targetNetwork!.predict(nextStates) as tf.Tensor;
      const maxTargetQValues = tf.max(targetQValues, 1);
      
      // 업데이트된 Q 값 계산
      const newQValues = currentQValues.clone();
      const batchSize = miniBatch.length;
      
      for (let i = 0; i < batchSize; i++) {
        const experience = miniBatch[i];
        const targetQ = experience.done
          ? experience.reward
          : experience.reward + this.config.gamma * maxTargetQValues.dataSync()[i];
        
        const currentQ = newQValues.bufferSync();
        currentQ.set(targetQ, i, experience.action);
      }
      
      // 정책 네트워크 학습
      await this.policyNetwork!.fit(states, newQValues, {
        epochs: 1,
        verbose: 0
      });
      
      // 탐색률 감소
      this.currentExplorationRate *= this.config.explorationDecay;
      this.currentExplorationRate = Math.max(this.currentExplorationRate, 0.01);
      
      // 타겟 네트워크 업데이트 (주기적)
      this.learningSteps++;
      if (this.learningSteps % this.config.targetUpdateFrequency === 0) {
        this.updateTargetNetwork();
      }
      
      // 메모리 정리
      states.dispose();
      nextStates.dispose();
      currentQValues.dispose();
      targetQValues.dispose();
      maxTargetQValues.dispose();
      newQValues.dispose();
      
      logger.info(`Learning step completed. Current exploration rate: ${this.currentExplorationRate.toFixed(4)}`);
    } catch (error) {
      logger.error('Learning process failed', error);
      throw new Error(`Learning failed: ${error}`);
    }
  }

  /**
   * 경험 메모리에서 미니배치 샘플링
   */
  private sampleExperiences(): Experience[] {
    const batchSize = Math.min(this.config.miniBatchSize, this.experienceMemory.length);
    const batch: Experience[] = [];
    
    const indices = new Set<number>();
    while (indices.size < batchSize) {
      const index = Math.floor(Math.random() * this.experienceMemory.length);
      indices.add(index);
    }
    
    indices.forEach(index => {
      batch.push(this.experienceMemory[index]);
    });
    
    return batch;
  }

  /**
   * 타겟 네트워크 업데이트 (정책 네트워크의 가중치로)
   */
  private updateTargetNetwork(): void {
    const policyWeights = this.policyNetwork!.getWeights();
    this.targetNetwork!.setWeights(policyWeights);
    logger.info('Target network updated with policy network weights');
  }

  /**
   * 현재 데이터로 자가 학습 수행
   * @param inputs 입력 데이터
   * @param targets 목표 데이터
   */
  public async performSelfLearning(inputs: number[][], targets: number[][]): Promise<any> {
    try {
      // 1. 신경망 학습
      const history = await this.neuralLearning.train(inputs, targets);
      
      // 2. 양자 증폭을 이용한 중요 샘플 식별
      const amplifiedProbabilities = this.quantumAmplification.simulateWithTensorflow(0, inputs);
      
      // 3. 중요도가 높은 샘플만 선택
      const threshold = 0.7; // 임계값 (조정 가능)
      const importantIndices: number[] = [];
      
      amplifiedProbabilities.forEach((prob, index) => {
        if (prob > threshold) {
          importantIndices.push(index);
        }
      });
      
      // 4. 중요 샘플만 추출
      const importantInputs = importantIndices.map(idx => inputs[idx]);
      const importantTargets = importantIndices.map(idx => targets[idx]);
      
      // 5. 중요 샘플로 보강 학습
      if (importantInputs.length > 0) {
        const reinforcementHistory = await this.neuralLearning.train(importantInputs, importantTargets);
        logger.info(`Reinforcement learning completed with ${importantInputs.length} important samples`);
      }
      
      // 6. 모델 평가 및 메트릭 기록
      const metrics = await this.evaluateModel(inputs, targets);
      this.modelMetricsHistory.push(metrics);
      
      return {
        history,
        metrics,
        importantSamplesCount: importantIndices.length
      };
    } catch (error) {
      logger.error('Self-learning process failed', error);
      throw new Error(`Self-learning failed: ${error}`);
    }
  }

  /**
   * 모델 성능 평가
   */
  private async evaluateModel(inputs: number[][], targets: number[][]): Promise<ModelMetrics> {
    // 신경망 모델 평가
    const evaluation = await this.neuralLearning.evaluateModel(inputs, targets);
    const loss = evaluation[0].dataSync()[0];
    const accuracy = evaluation[1].dataSync()[0];
    
    // 예측 수행
    const predictions = this.neuralLearning.predict(inputs);
    
    // 클래스별 예측 성능 계산 (이진 분류 가정)
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      const predictedClass = predictions[i].indexOf(Math.max(...predictions[i]));
      const actualClass = targets[i].indexOf(Math.max(...targets[i]));
      
      if (predictedClass === 1 && actualClass === 1) {
        truePositives++;
      } else if (predictedClass === 1 && actualClass === 0) {
        falsePositives++;
      } else if (predictedClass === 0 && actualClass === 1) {
        falseNegatives++;
      }
    }
    
    // 정밀도, 재현율, F1 스코어 계산
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    return {
      accuracy,
      loss,
      precision,
      recall,
      f1Score
    };
  }

  /**
   * 지속적인 자가 개선 수행
   * @param iterations 반복 횟수
   * @param inputs 학습 데이터
   * @param targets 목표 데이터
   */
  public async continuousSelfImprovement(iterations: number, inputs: number[][], targets: number[][]): Promise<ModelMetrics[]> {
    const metricsHistory: ModelMetrics[] = [];
    
    for (let i = 0; i < iterations; i++) {
      logger.info(`Starting self-improvement iteration ${i + 1}/${iterations}`);
      
      // 자가학습 수행
      const result = await this.performSelfLearning(inputs, targets);
      metricsHistory.push(result.metrics);
      
      // 데이터 증강 (선택적으로 수행)
      if (i % 2 === 0) {
        const augmentedData = this.augmentData(inputs, targets);
        await this.performSelfLearning(augmentedData.inputs, augmentedData.targets);
      }
      
      // 모델 저장 (주기적으로)
      if (i % 5 === 0 || i === iterations - 1) {
        await this.saveModels(`self_improved_model_iteration_${i + 1}`);
      }
      
      logger.info(`Completed self-improvement iteration ${i + 1}/${iterations}`);
    }
    
    return metricsHistory;
  }

  /**
   * 데이터 증강 (노이즈 추가)
   */
  private augmentData(inputs: number[][], targets: number[][]): { inputs: number[][], targets: number[][] } {
    const augmentedInputs: number[][] = [];
    const augmentedTargets: number[][] = [];
    
    // 기존 데이터 복사
    inputs.forEach((input, idx) => {
      augmentedInputs.push([...input]);
      augmentedTargets.push([...targets[idx]]);
      
      // 노이즈가 추가된 복사본 생성
      const noisyInput = input.map(val => val + (Math.random() * 0.1 - 0.05));
      augmentedInputs.push(noisyInput);
      augmentedTargets.push([...targets[idx]]);
    });
    
    return {
      inputs: augmentedInputs,
      targets: augmentedTargets
    };
  }

  /**
   * 학습된 모델 저장
   */
  public async saveModels(modelName: string): Promise<void> {
    try {
      // 신경망 모델 저장
      await this.neuralLearning.saveModel(`${modelName}_neural`);
      
      // 정책 네트워크 저장
      if (this.policyNetwork) {
        const policyPath = `file://${path.join(this.modelSavePath, `${modelName}_policy`)}`;
        await this.policyNetwork.save(policyPath);
      }
      
      // 타겟 네트워크 저장
      if (this.targetNetwork) {
        const targetPath = `file://${path.join(this.modelSavePath, `${modelName}_target`)}`;
        await this.targetNetwork.save(targetPath);
      }
      
      // 메트릭 기록 저장
      const metricsPath = path.join(this.modelSavePath, `${modelName}_metrics.json`);
      fs.writeFileSync(metricsPath, JSON.stringify(this.modelMetricsHistory));
      
      logger.info(`Models saved successfully with name: ${modelName}`);
    } catch (error) {
      logger.error('Failed to save models', error);
      throw new Error(`Model saving failed: ${error}`);
    }
  }

  /**
   * 학습된 모델 로드
   */
  public async loadModels(modelName: string): Promise<void> {
    try {
      // 신경망 모델 로드
      await this.neuralLearning.loadModel(`${modelName}_neural`);
      
      // 정책 네트워크 로드
      const policyPath = `file://${path.join(this.modelSavePath, `${modelName}_policy`)}`;
      this.policyNetwork = await tf.loadLayersModel(policyPath);
      this.policyNetwork.compile({
        optimizer: tf.train.adam(this.config.reinforcementLearningRate),
        loss: 'meanSquaredError'
      });
      
      // 타겟 네트워크 로드
      const targetPath = `file://${path.join(this.modelSavePath, `${modelName}_target`)}`;
      this.targetNetwork = await tf.loadLayersModel(targetPath);
      this.targetNetwork.compile({
        optimizer: tf.train.adam(this.config.reinforcementLearningRate),
        loss: 'meanSquaredError'
      });
      
      // 메트릭 기록 로드
      const metricsPath = path.join(this.modelSavePath, `${modelName}_metrics.json`);
      if (fs.existsSync(metricsPath)) {
        const metricsData = fs.readFileSync(metricsPath, 'utf8');
        this.modelMetricsHistory = JSON.parse(metricsData);
      }
      
      logger.info(`Models loaded successfully with name: ${modelName}`);
    } catch (error) {
      logger.error('Failed to load models', error);
      throw new Error(`Model loading failed: ${error}`);
    }
  }

  /**
   * 예측 수행
   */
  public predict(inputs: number[][]): number[][] {
    return this.neuralLearning.predict(inputs);
  }

  /**
   * 메트릭 이력 가져오기
   */
  public getMetricsHistory(): ModelMetrics[] {
    return this.modelMetricsHistory;
  }
}

export default SelfLearningSystem; 