import * as tf from '@tensorflow/tfjs-node';
import { logger } from '../config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 이미지 데이터를 AI 모델 입력에 적합한 형태로 전처리
 * @param imageBuffer 이미지 데이터 버퍼
 * @returns 전처리된 텐서플로우 이미지
 */
export async function preprocessImageForAi(imageBuffer: Buffer): Promise<tf.Tensor> {
  try {
    // 이미지 디코딩
    const decodedImage = tf.node.decodeImage(imageBuffer, 3);
    
    // 이미지 크기 조정 (224x224: 표준 이미지 크기)
    const resizedImage = tf.image.resizeBilinear(decodedImage, [224, 224]);
    
    // 이미지 정규화 (0-1 범위로)
    const normalizedImage = resizedImage.div(tf.scalar(255));
    
    // 배치 차원 추가 ([1, 224, 224, 3] 형태)
    const batchedImage = normalizedImage.expandDims(0);
    
    // 원본 이미지 메모리 정리
    decodedImage.dispose();
    resizedImage.dispose();
    normalizedImage.dispose();
    
    return batchedImage;
  } catch (error) {
    logger.error('이미지 전처리 중 오류 발생:', error);
    throw new Error(`이미지 전처리 실패: ${error}`);
  }
}

/**
 * 텍스트에서 특성 추출
 * @param text 처리할 텍스트
 * @returns 특성 벡터
 */
export async function extractTextFeatures(text: string): Promise<number[]> {
  try {
    // 텍스트 전처리
    const cleanedText = text.trim().toLowerCase();
    
    // 의료 관련 키워드 확인
    const medicalKeywords = [
      '통증', '열', '두통', '기침', '발열', '호흡곤란', '구토', '설사',
      '피로', '어지러움', '발진', '부종', '혈압', '당뇨', '알레르기',
      '심장', '폐', '간', '신장', '위', '장', '뇌', '관절', '근육'
    ];
    
    // 간단한 BoW(Bag of Words) 특성 생성
    const keywordFeatures = medicalKeywords.map(keyword => 
      cleanedText.includes(keyword) ? 1 : 0
    );
    
    // 특성 확장을 위한 추가 계산
    const wordCount = cleanedText.split(/\s+/).length;
    const charCount = cleanedText.length;
    const questionMark = cleanedText.includes('?') ? 1 : 0;
    const exclamationMark = cleanedText.includes('!') ? 1 : 0;
    
    // 증상 중증도 추정 (간단한 휴리스틱)
    const severeSymptoms = ['심한', '극심한', '극도의', '견딜 수 없는', '참을 수 없는'];
    const severityScore = severeSymptoms.some(s => cleanedText.includes(s)) ? 1 : 0;
    
    // 긴급성 추정
    const urgencyTerms = ['급격히', '갑자기', '즉시', '응급', '지금'];
    const urgencyScore = urgencyTerms.some(s => cleanedText.includes(s)) ? 1 : 0;
    
    // 추가 특성 결합
    const additionalFeatures = [
      wordCount / 50, // 정규화된 단어 수
      charCount / 500, // 정규화된 문자 수
      questionMark,
      exclamationMark,
      severityScore,
      urgencyScore
    ];
    
    // 모든 특성 결합
    const combinedFeatures = [...keywordFeatures, ...additionalFeatures];
    
    // 필요시 패딩 추가 (항상 64차원 벡터 반환)
    const paddedFeatures = [...combinedFeatures];
    if (paddedFeatures.length < 64) {
      paddedFeatures.push(...Array(64 - paddedFeatures.length).fill(0));
    } else if (paddedFeatures.length > 64) {
      return paddedFeatures.slice(0, 64);
    }
    
    return paddedFeatures;
  } catch (error) {
    logger.error('텍스트 특성 추출 중 오류 발생:', error);
    throw new Error(`텍스트 특성 추출 실패: ${error}`);
  }
}

/**
 * 의학 용어 추출
 * @param text 텍스트
 * @returns 추출된 의학 용어 목록
 */
export function extractMedicalTerms(text: string): string[] {
  try {
    // 의학 용어 사전 (실제로는 더 포괄적인 사전 사용)
    const medicalTerms = [
      '통증', '열', '두통', '기침', '발열', '호흡곤란', '구토', '설사',
      '피로', '어지러움', '발진', '부종', '혈압', '당뇨', '알레르기',
      '심장', '폐', '간', '신장', '위', '장', '뇌', '관절', '근육',
      '위염', '고혈압', '저혈압', '당뇨병', '골절', '염좌', '타박상',
      '천식', '알러지', '편두통', '요통', '협심증', '심근경색', '뇌졸중',
      '폐렴', '기관지염', '결막염', '구내염', '방광염', '신우신염',
      '관절염', '류마티스', '골다공증', '빈혈', '갑상선', '췌장염'
    ];
    
    // 입력 텍스트에서 의학 용어 찾기
    const foundTerms: string[] = [];
    const lowerText = text.toLowerCase();
    
    medicalTerms.forEach(term => {
      if (lowerText.includes(term.toLowerCase())) {
        foundTerms.push(term);
      }
    });
    
    return foundTerms;
  } catch (error) {
    logger.error('의학 용어 추출 중 오류 발생:', error);
    return [];
  }
}

/**
 * 이미지에서 주요 색상 추출 (의료 이미지 분석용)
 * @param imageBuffer 이미지 버퍼
 * @returns RGB 색상 히스토그램
 */
export async function extractImageColorFeatures(imageBuffer: Buffer): Promise<number[]> {
  try {
    // 이미지 디코딩
    const decodedImage = tf.node.decodeImage(imageBuffer, 3);
    
    // 이미지 크기 조정 (처리 속도 향상을 위해)
    const resizedImage = tf.image.resizeBilinear(decodedImage, [64, 64]);
    
    // RGB 채널 분리
    const rgbChannels = tf.split(resizedImage, 3, 2);
    
    // 각 채널별 평균 계산
    const redMean = rgbChannels[0].mean().dataSync()[0];
    const greenMean = rgbChannels[1].mean().dataSync()[0];
    const blueMean = rgbChannels[2].mean().dataSync()[0];
    
    // 각 채널별 표준편차 계산
    const redStd = tf.moments(rgbChannels[0]).variance.sqrt().dataSync()[0];
    const greenStd = tf.moments(rgbChannels[1]).variance.sqrt().dataSync()[0];
    const blueStd = tf.moments(rgbChannels[2]).variance.sqrt().dataSync()[0];
    
    // 메모리 정리
    decodedImage.dispose();
    resizedImage.dispose();
    rgbChannels.forEach(channel => channel.dispose());
    
    // 6개 특성 반환: [R평균, G평균, B평균, R표준편차, G표준편차, B표준편차]
    return [redMean, greenMean, blueMean, redStd, greenStd, blueStd];
  } catch (error) {
    logger.error('이미지 색상 특성 추출 중 오류 발생:', error);
    return [0, 0, 0, 0, 0, 0]; // 오류 시 기본값 반환
  }
}

/**
 * 텍스트 감정 분석
 * @param text 텍스트
 * @returns 감정 점수 (불안, 우울, 긴급)
 */
export function analyzeTextEmotion(text: string): { anxiety: number, depression: number, urgency: number } {
  try {
    const lowerText = text.toLowerCase();
    
    // 불안 관련 단어
    const anxietyWords = ['불안', '걱정', '공포', '긴장', '두려움', '초조'];
    let anxietyScore = 0;
    anxietyWords.forEach(word => {
      if (lowerText.includes(word)) anxietyScore += 0.2;
    });
    anxietyScore = Math.min(anxietyScore, 1);
    
    // 우울 관련 단어
    const depressionWords = ['우울', '슬픔', '무기력', '의욕 없', '무감각', '절망'];
    let depressionScore = 0;
    depressionWords.forEach(word => {
      if (lowerText.includes(word)) depressionScore += 0.2;
    });
    depressionScore = Math.min(depressionScore, 1);
    
    // 긴급성 관련 단어
    const urgencyWords = ['급격히', '갑자기', '즉시', '응급', '지금', '당장'];
    let urgencyScore = 0;
    urgencyWords.forEach(word => {
      if (lowerText.includes(word)) urgencyScore += 0.2;
    });
    urgencyScore = Math.min(urgencyScore, 1);
    
    return {
      anxiety: anxietyScore,
      depression: depressionScore,
      urgency: urgencyScore
    };
  } catch (error) {
    logger.error('텍스트 감정 분석 중 오류 발생:', error);
    return { anxiety: 0, depression: 0, urgency: 0 };
  }
}

/**
 * 이미지 해상도 확인 및 품질 평가
 * @param imageBuffer 이미지 버퍼
 * @returns 이미지 품질 정보
 */
export function checkImageQuality(imageBuffer: Buffer): { 
  width: number, 
  height: number, 
  aspectRatio: number, 
  isGoodQuality: boolean 
} {
  try {
    // 이미지 디코딩
    const decodedImage = tf.node.decodeImage(imageBuffer);
    
    // 이미지 크기 추출
    const shape = decodedImage.shape;
    const width = shape[1];
    const height = shape[0];
    const aspectRatio = width / height;
    
    // 이미지 품질 평가 (간단한 기준)
    const isGoodQuality = width >= 300 && height >= 300;
    
    // 메모리 정리
    decodedImage.dispose();
    
    return {
      width,
      height,
      aspectRatio,
      isGoodQuality
    };
  } catch (error) {
    logger.error('이미지 품질 확인 중 오류 발생:', error);
    return { width: 0, height: 0, aspectRatio: 0, isGoodQuality: false };
  }
}

/**
 * AI 모델 성능 측정을 위한 유틸리티 함수
 * @param predictedValues 예측값
 * @param actualValues 실제값
 * @returns 성능 지표
 */
export function calculateModelMetrics(predictedValues: number[][], actualValues: number[][]): {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
} {
  try {
    if (predictedValues.length !== actualValues.length) {
      throw new Error('예측값과 실제값의 수가 일치하지 않습니다.');
    }
    
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let correctPredictions = 0;
    
    for (let i = 0; i < predictedValues.length; i++) {
      const predictedClass = predictedValues[i].indexOf(Math.max(...predictedValues[i]));
      const actualClass = actualValues[i].indexOf(Math.max(...actualValues[i]));
      
      if (predictedClass === actualClass) {
        correctPredictions++;
      }
      
      if (predictedClass === 1 && actualClass === 1) {
        truePositives++;
      } else if (predictedClass === 1 && actualClass === 0) {
        falsePositives++;
      } else if (predictedClass === 0 && actualClass === 1) {
        falseNegatives++;
      }
    }
    
    const accuracy = correctPredictions / predictedValues.length;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    return {
      accuracy,
      precision,
      recall,
      f1Score
    };
  } catch (error) {
    logger.error('모델 성능 계산 중 오류 발생:', error);
    return { accuracy: 0, precision: 0, recall: 0, f1Score: 0 };
  }
}

/**
 * AI 모델의 확률 결과를 보정 (캘리브레이션)
 * @param rawProbabilities 원시 확률값
 * @returns 보정된 확률값
 */
export function calibrateProbabilities(rawProbabilities: number[]): number[] {
  try {
    // 간단한 Platt 스케일링 적용 (예시)
    // 실제로는 검증 데이터로 계산된 A, B 계수를 사용해야 함
    const A = 1.5;  // 예시 계수
    const B = -0.5; // 예시 계수
    
    return rawProbabilities.map(prob => {
      // 로짓 변환 및 보정
      const logit = Math.log(prob / (1 - prob));
      const calibratedLogit = A * logit + B;
      const calibratedProb = 1 / (1 + Math.exp(-calibratedLogit));
      
      // 0-1 범위로 클리핑
      return Math.max(0, Math.min(1, calibratedProb));
    });
  } catch (error) {
    logger.error('확률 보정 중 오류 발생:', error);
    return rawProbabilities; // 오류 시 원본 확률 반환
  }
} 