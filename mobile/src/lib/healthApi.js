import apiClient from './queryClient';

/**
 * 사용자의 최신 건강 데이터 가져오기
 * @param {number} userId 사용자 ID
 * @returns {Promise<Object>} 최신 건강 데이터
 */
export const fetchLatestHealthData = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/health-data/latest`);
    return response.data;
  } catch (error) {
    console.error('최신 건강 데이터 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자의 건강 데이터 히스토리 가져오기
 * @param {number} userId 사용자 ID
 * @param {Object} params 쿼리 파라미터 (기간, 정렬 등)
 * @returns {Promise<Array>} 건강 데이터 배열
 */
export const fetchHealthDataHistory = async (userId, params = {}) => {
  try {
    const response = await apiClient.get(`/users/${userId}/health-data`, { params });
    return response.data;
  } catch (error) {
    console.error('건강 데이터 히스토리 조회 실패:', error);
    throw error;
  }
};

/**
 * ECG 데이터 기록 가져오기
 * @param {number} userId 사용자 ID
 * @returns {Promise<Array>} ECG 기록 배열
 */
export const fetchECGRecordings = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/ecg-recordings`);
    return response.data;
  } catch (error) {
    console.error('ECG 기록 조회 실패:', error);
    throw error;
  }
};

/**
 * 새로운 ECG 데이터 저장하기
 * @param {number} userId 사용자 ID
 * @param {Object} ecgData ECG 데이터 객체
 * @returns {Promise<Object>} 저장된 ECG 데이터
 */
export const saveECGRecording = async (userId, ecgData) => {
  try {
    const response = await apiClient.post(`/users/${userId}/ecg-recordings`, ecgData);
    return response.data;
  } catch (error) {
    console.error('ECG 데이터 저장 실패:', error);
    throw error;
  }
};

/**
 * 스마트워치 연결 상태 조회
 * @param {number} userId 사용자 ID
 * @returns {Promise<Array>} 연결된 스마트워치 정보
 */
export const fetchSmartWatchConnections = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/smartwatch-connections`);
    return response.data;
  } catch (error) {
    console.error('스마트워치 연결 상태 조회 실패:', error);
    throw error;
  }
};

/**
 * 위험도 분석 요청
 * @param {number} userId 사용자 ID
 * @param {Object} healthData 건강 데이터
 * @returns {Promise<Object>} 위험도 분석 결과
 */
export const analyzeRiskLevel = async (userId, healthData) => {
  try {
    const response = await apiClient.post(`/api/analyze-risk`, { userId, ...healthData });
    return response.data;
  } catch (error) {
    console.error('위험도 분석 실패:', error);
    throw error;
  }
};

/**
 * 측정 시작 요청 (스마트워치에 명령)
 * @param {number} userId 사용자 ID
 * @param {string} measurementType 측정 유형 (ecg, bloodPressure, etc)
 * @returns {Promise<Object>} 측정 세션 정보
 */
export const startMeasurement = async (userId, measurementType) => {
  try {
    const response = await apiClient.post(`/users/${userId}/measurements`, { type: measurementType });
    return response.data;
  } catch (error) {
    console.error('측정 시작 요청 실패:', error);
    throw error;
  }
};