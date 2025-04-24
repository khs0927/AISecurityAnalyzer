import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logger } from '../config';
import IntegratedAiSystem from '../ai/integratedAiSystem';
import * as tf from '@tensorflow/tfjs-node';
import fileManager from '../utils/fileManager';

// 유틸리티 함수들
import { preprocessImageForAi, extractTextFeatures } from '../utils/aiUtils';

const router = express.Router();

// 멀터 스토리지 설정 (임시 파일 저장)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'upload-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.') as any, false);
    }
  }
});

// 통합 AI 시스템 초기화
const aiSystem = new IntegratedAiSystem({
  neuralLearning: {
    inputDimension: 64,
    hiddenLayerDimensions: [128, 64, 32],
    outputDimension: 10,
    learningRate: 0.001,
    batchSize: 32,
    epochs: 10
  },
  quantumAmplification: {
    qubits: 6,
    iterations: 3
  },
  selfLearning: {
    learningRate: 0.001,
    reinforcementLearningRate: 0.0005,
    batchSize: 32,
    epochs: 10,
    memoryCapacity: 10000,
    miniBatchSize: 64,
    gamma: 0.99,
    explorationRate: 0.1,
    explorationDecay: 0.995,
    targetUpdateFrequency: 10
  },
  modelPaths: {
    baseDir: path.join(__dirname, '../data/models'),
    qwen25Path: path.join(__dirname, '../data/models/qwen'),
    mmedLlama3Path: path.join(__dirname, '../data/models/mmedllama')
  },
  api: {
    batchProcessSize: 8,
    maxConcurrentRequests: 4,
    timeout: 60000
  }
});

// AI 시스템 초기화
(async () => {
  try {
    await aiSystem.initialize();
    logger.info('통합 AI 시스템이 성공적으로 초기화되었습니다.');
  } catch (error) {
    logger.error('통합 AI 시스템 초기화 실패:', error);
  }
})();

/**
 * 통합 AI 분석 엔드포인트
 * 텍스트와 이미지(선택) 분석
 */
router.post('/integrated-analyze', upload.single('image'), async (req, res) => {
  let imagePath = '';
  
  try {
    const message = req.body.message || '';
    const modelType = req.body.modelType || 'hybrid';
    
    // 응답 초기화
    let analysisResult: any = null;
    
    // 텍스트만 전송된 경우
    if (message && !req.file) {
      const textFeatures = await extractTextFeatures(message);
      analysisResult = await aiSystem.analyzeMedicalText(message);
    }
    // 이미지만 전송된 경우
    else if (req.file && !message) {
      // 이미지 파일 읽기
      imagePath = req.file.path;
      const imageBuffer = fs.readFileSync(imagePath);
      const tfImage = await preprocessImageForAi(imageBuffer);
      
      // 이미지 분석
      analysisResult = await aiSystem.analyzeMedicalImage(tfImage);
      
      // 텐서 리소스 해제
      tfImage.dispose();
    }
    // 이미지와 텍스트 모두 전송된 경우
    else if (req.file && message) {
      // 이미지 파일 읽기
      imagePath = req.file.path;
      const imageBuffer = fs.readFileSync(imagePath);
      const tfImage = await preprocessImageForAi(imageBuffer);
      
      // 멀티모달 분석
      analysisResult = await aiSystem.multimodalAnalysis(tfImage, message);
      
      // 텐서 리소스 해제
      tfImage.dispose();
    }
    else {
      return res.status(400).json({
        success: false,
        error: '텍스트 메시지 또는 이미지가 필요합니다.'
      });
    }
    
    // 진단 설명 생성
    const diagnosisExplanation = await aiSystem.generateDiagnosisExplanation(analysisResult);
    
    // 응답 반환
    res.json({
      success: true,
      text: diagnosisExplanation,
      analysis: analysisResult
    });
    
  } catch (error) {
    logger.error('통합 AI 분석 오류:', error);
    res.status(500).json({
      success: false,
      error: '분석 중 오류가 발생했습니다.'
    });
  } finally {
    // 요청 처리 후 임시 파일 안전하게 삭제
    if (imagePath && fs.existsSync(imagePath)) {
      fileManager.safeDeleteFile(imagePath);
    }
  }
});

/**
 * AI 시스템 상태 확인 엔드포인트
 */
router.get('/system-status', (req, res) => {
  try {
    const status = aiSystem.getSystemStatus();
    res.json({
      success: true,
      status
    });
      } catch (error) {
    logger.error('AI 시스템 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 상태 확인 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 모델 훈련 시작 엔드포인트
 */
router.post('/train', async (req, res) => {
  try {
    const { inputs, targets, iterations } = req.body;
    
    if (!inputs || !targets) {
      return res.status(400).json({
        success: false,
        error: '훈련 데이터가 필요합니다.'
      });
    }
    
    // 비동기로 훈련 시작
    const trainingPromise = aiSystem.train(inputs, targets, iterations || 10);
    
    // 즉시 응답
    res.json({
      success: true,
      message: '훈련이 시작되었습니다.',
      trainingSessionId: trainingPromise.then(stats => stats.sessionId)
    });
    
    // 훈련은 백그라운드에서 계속 진행
    
  } catch (error) {
    logger.error('AI 모델 훈련 오류:', error);
    res.status(500).json({
      success: false,
      error: '훈련 시작 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 훈련 중지 엔드포인트
 */
router.post('/stop-training', (req, res) => {
  try {
    aiSystem.stopTraining();
    res.json({
      success: true,
      message: '훈련이 중지되었습니다.'
    });
  } catch (error) {
    logger.error('AI 모델 훈련 중지 오류:', error);
    res.status(500).json({
      success: false,
      error: '훈련 중지 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 훈련 이력 조회 엔드포인트
 */
router.get('/training-history', (req, res) => {
  try {
    const history = aiSystem.getTrainingHistory();
    res.json({
      success: true,
      history
    });
  } catch (error) {
    logger.error('AI 모델 훈련 이력 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '훈련 이력 조회 중 오류가 발생했습니다.'
    });
  }
});

export default router; 