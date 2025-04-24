// selfLearning.js
// AI 모델의 자가 학습 시스템 유틸리티

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 자가 학습 모듈
 * 사용자 상호작용을 기록하고 AI 모델의 자가 학습을 지원합니다.
 */
export default {
  // 스토리지 키 정의
  STORAGE_KEYS: {
    INTERACTIONS: 'ai_interactions',
    LEARNING_DATA: 'ai_learning_data',
    LAST_SYNC: 'ai_last_sync'
  },
  
  /**
   * 사용자 상호작용 기록
   * @param {Object} interaction 상호작용 데이터
   * @param {string} interaction.query 사용자 쿼리
   * @param {string} interaction.response AI 응답
   * @param {Object} interaction.healthData 건강 데이터
   * @param {boolean} interaction.wasHelpful 사용자 피드백
   * @returns {Promise<boolean>} 성공 여부
   */
  async recordInteraction(interaction) {
    try {
      if (!interaction) return false;
      
      // 타임스탬프 추가
      const record = {
        ...interaction,
        timestamp: new Date().toISOString()
      };
      
      // 기존 상호작용 가져오기
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEYS.INTERACTIONS);
      const interactions = storedData ? JSON.parse(storedData) : [];
      
      // 새 상호작용 추가
      interactions.push(record);
      
      // 최대 100개만 보관
      if (interactions.length > 100) {
        interactions.shift(); // 가장 오래된 항목 제거
      }
      
      // 저장
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.INTERACTIONS, 
        JSON.stringify(interactions)
      );
      
      // 자가 학습 데이터로 처리
      await this.processForLearning(record);
      
      return true;
    } catch (error) {
      console.error('상호작용 기록 오류:', error);
      return false;
    }
  },
  
  /**
   * 자가 학습을 위한 데이터 처리
   * @param {Object} interaction 상호작용 데이터
   * @returns {Promise<void>}
   */
  async processForLearning(interaction) {
    try {
      // 관련성 있는 상호작용만 학습 데이터로 사용
      // 사용자가 "도움이 됨"으로 피드백한 항목만 사용
      if (!interaction.wasHelpful) return;
      
      // 학습 데이터 가져오기
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEYS.LEARNING_DATA);
      const learningData = storedData ? JSON.parse(storedData) : [];
      
      // 새 학습 데이터 추가
      learningData.push({
        input: interaction.query,
        output: interaction.response,
        healthContext: interaction.healthData,
        timestamp: interaction.timestamp
      });
      
      // 저장
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.LEARNING_DATA, 
        JSON.stringify(learningData)
      );
      
      // 서버 동기화 확인
      await this.checkAndSyncLearningData();
    } catch (error) {
      console.error('학습 데이터 처리 오류:', error);
    }
  },
  
  /**
   * 학습 데이터 서버 동기화 확인
   * @returns {Promise<void>}
   */
  async checkAndSyncLearningData() {
    try {
      // 마지막 동기화 시간 확인
      const lastSyncStr = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
      const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;
      const now = new Date();
      
      // 24시간마다 동기화 (또는 마지막 동기화가 없는 경우)
      const shouldSync = !lastSync || 
        (now.getTime() - lastSync.getTime() > 24 * 60 * 60 * 1000);
      
      if (shouldSync) {
        await this.syncLearningData();
        
        // 동기화 시간 업데이트
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.LAST_SYNC, 
          now.toISOString()
        );
      }
    } catch (error) {
      console.error('동기화 확인 오류:', error);
    }
  },
  
  /**
   * 학습 데이터 서버 동기화
   * @returns {Promise<boolean>} 성공 여부
   */
  async syncLearningData() {
    try {
      // 학습 데이터 가져오기
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEYS.LEARNING_DATA);
      const learningData = storedData ? JSON.parse(storedData) : [];
      
      // 동기화할 데이터가 없으면 종료
      if (learningData.length === 0) return true;
      
      // 서버 학습 API 호출 (실제 구현에서는 적절한 엔드포인트로 변경)
      // const response = await fetch('/api/ai/self-learning', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ learningData })
      // });
      
      // 동기화 후 로컬 데이터 초기화
      // if (response.ok) {
      //   await AsyncStorage.setItem(this.STORAGE_KEYS.LEARNING_DATA, JSON.stringify([]));
      //   return true;
      // }
      
      // 실제 API 호출 대신 콘솔에 기록 (데모용)
      console.log('자가 학습 데이터 동기화:', learningData.length, '개 항목');
      await AsyncStorage.setItem(this.STORAGE_KEYS.LEARNING_DATA, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('학습 데이터 동기화 오류:', error);
      return false;
    }
  },
  
  /**
   * 모든 학습 데이터 가져오기
   * @returns {Promise<Array>} 학습 데이터 배열
   */
  async getAllLearningData() {
    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEYS.LEARNING_DATA);
      return storedData ? JSON.parse(storedData) : [];
    } catch (error) {
      console.error('학습 데이터 조회 오류:', error);
      return [];
    }
  },
  
  /**
   * 모든 상호작용 기록 가져오기
   * @returns {Promise<Array>} 상호작용 기록 배열
   */
  async getAllInteractions() {
    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEYS.INTERACTIONS);
      return storedData ? JSON.parse(storedData) : [];
    } catch (error) {
      console.error('상호작용 기록 조회 오류:', error);
      return [];
    }
  },
  
  /**
   * 모든 데이터 초기화
   * @returns {Promise<boolean>} 성공 여부
   */
  async clearAllData() {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.INTERACTIONS,
        this.STORAGE_KEYS.LEARNING_DATA,
        this.STORAGE_KEYS.LAST_SYNC
      ]);
      return true;
    } catch (error) {
      console.error('데이터 초기화 오류:', error);
      return false;
    }
  }
}; 