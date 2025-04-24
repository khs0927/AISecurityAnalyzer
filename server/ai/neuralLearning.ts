import { logger } from '../config';
import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs';
import path from 'path';

interface NeuralNetworkConfig {
  inputDimension: number;
  hiddenLayerDimensions: number[];
  outputDimension: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
}

export class NeuralLearningSystem {
  private model: tf.LayersModel | null = null;
  private config: NeuralNetworkConfig;
  private trainingHistory: any[] = [];
  private readonly modelSavePath: string;

  constructor(config: NeuralNetworkConfig) {
    this.config = config;
    this.modelSavePath = path.join(__dirname, '../data/neural_models');
    
    // 모델 저장 디렉토리 생성
    if (!fs.existsSync(this.modelSavePath)) {
      fs.mkdirSync(this.modelSavePath, { recursive: true });
    }
  }

  /**
   * 신경망 모델 초기화
   */
  public initializeModel(): void {
    try {
      const { inputDimension, hiddenLayerDimensions, outputDimension } = this.config;
      
      const model = tf.sequential();
      
      // 입력층 추가
      model.add(tf.layers.dense({
        units: hiddenLayerDimensions[0],
        inputShape: [inputDimension],
        activation: 'relu',
        kernelInitializer: 'heNormal'
      }));
      
      // 은닉층 추가
      for (let i = 1; i < hiddenLayerDimensions.length; i++) {
        model.add(tf.layers.dense({
          units: hiddenLayerDimensions[i],
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }));
        
        // 드롭아웃 레이어 추가 (과적합 방지)
        model.add(tf.layers.dropout({ rate: 0.3 }));
      }
      
      // 출력층 추가
      model.add(tf.layers.dense({
        units: outputDimension,
        activation: 'softmax'
      }));
      
      // 모델 컴파일
      model.compile({
        optimizer: tf.train.adam(this.config.learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
      
      this.model = model;
      logger.info('Neural learning model initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize neural learning model', error);
      throw new Error(`Neural model initialization failed: ${error}`);
    }
  }

  /**
   * 모델 학습
   * @param inputs 입력 데이터
   * @param targets 목표 데이터
   */
  public async train(inputs: number[][], targets: number[][]): Promise<any> {
    if (!this.model) {
      this.initializeModel();
    }
    
    try {
      const xs = tf.tensor2d(inputs);
      const ys = tf.tensor2d(targets);
      
      const history = await this.model!.fit(xs, ys, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            logger.info(`Epoch ${epoch + 1}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.acc.toFixed(4)}`);
          }
        }
      });
      
      this.trainingHistory.push(history);
      
      // 메모리 정리
      xs.dispose();
      ys.dispose();
      
      return history;
    } catch (error) {
      logger.error('Neural model training failed', error);
      throw new Error(`Neural model training failed: ${error}`);
    }
  }

  /**
   * 모델로 예측 수행
   * @param inputs 입력 데이터
   */
  public predict(inputs: number[][]): number[][] {
    if (!this.model) {
      throw new Error('Model not initialized. Call initializeModel() or train() first.');
    }
    
    try {
      const xs = tf.tensor2d(inputs);
      const prediction = this.model.predict(xs) as tf.Tensor;
      const result = prediction.arraySync() as number[][];
      
      // 메모리 정리
      xs.dispose();
      prediction.dispose();
      
      return result;
    } catch (error) {
      logger.error('Neural model prediction failed', error);
      throw new Error(`Neural model prediction failed: ${error}`);
    }
  }

  /**
   * 모델 저장
   * @param modelName 저장할 모델명
   */
  public async saveModel(modelName: string): Promise<void> {
    if (!this.model) {
      throw new Error('Model not initialized. Cannot save.');
    }
    
    try {
      const savePath = `file://${path.join(this.modelSavePath, modelName)}`;
      await this.model.save(savePath);
      logger.info(`Model saved successfully to ${savePath}`);
    } catch (error) {
      logger.error('Failed to save neural model', error);
      throw new Error(`Model saving failed: ${error}`);
    }
  }

  /**
   * 모델 로드
   * @param modelName 로드할 모델명
   */
  public async loadModel(modelName: string): Promise<void> {
    try {
      const loadPath = `file://${path.join(this.modelSavePath, modelName)}`;
      this.model = await tf.loadLayersModel(loadPath);
      logger.info(`Model loaded successfully from ${loadPath}`);
      
      // 모델 컴파일
      this.model.compile({
        optimizer: tf.train.adam(this.config.learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
    } catch (error) {
      logger.error('Failed to load neural model', error);
      throw new Error(`Model loading failed: ${error}`);
    }
  }

  /**
   * 학습 이력 가져오기
   */
  public getTrainingHistory(): any[] {
    return this.trainingHistory;
  }

  /**
   * 모델 성능 평가
   * @param testInputs 테스트 입력 데이터
   * @param testTargets 테스트 목표 데이터
   */
  public async evaluateModel(testInputs: number[][], testTargets: number[][]): Promise<tf.Scalar[]> {
    if (!this.model) {
      throw new Error('Model not initialized. Call initializeModel() or train() first.');
    }
    
    try {
      const xs = tf.tensor2d(testInputs);
      const ys = tf.tensor2d(testTargets);
      
      const evaluation = await this.model.evaluate(xs, ys) as tf.Scalar[];
      
      // 메모리 정리
      xs.dispose();
      ys.dispose();
      
      return evaluation;
    } catch (error) {
      logger.error('Neural model evaluation failed', error);
      throw new Error(`Neural model evaluation failed: ${error}`);
    }
  }
}

export default NeuralLearningSystem; 