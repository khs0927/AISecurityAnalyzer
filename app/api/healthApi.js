import apiClient from './client';

// 사용자의 건강 데이터 가져오기
export const fetchHealthData = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/health-data`);
    return response;
  } catch (error) {
    console.error('건강 데이터 가져오기 실패:', error);
    throw error;
  }
};

// 사용자의 최신 건강 데이터 가져오기
export const fetchLatestHealthData = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/health-data/latest`);
    return response;
  } catch (error) {
    console.error('최신 건강 데이터 가져오기 실패:', error);
    // 실패 시 기본 데이터 반환 (실제 앱에서는 오류 처리 방식 변경 필요)
    return {
      heartRate: 72,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      oxygenSaturation: 98,
      temperature: 36.5,
      recordedAt: new Date().toISOString(),
    };
  }
};

// ECG 기록 가져오기
export const fetchEcgRecordings = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/ecg-recordings`);
    return response;
  } catch (error) {
    console.error('ECG 기록 가져오기 실패:', error);
    throw error;
  }
};

// ECG 측정 데이터 전송
export const submitEcgRecording = async (userId, ecgData) => {
  try {
    const response = await apiClient.post(`/users/${userId}/ecg-recordings`, {
      userId,
      data: ecgData,
      deviceType: 'mobile',
    });
    return response;
  } catch (error) {
    console.error('ECG 데이터 전송 실패:', error);
    throw error;
  }
};

// 건강 위험도 분석 가져오기
export const fetchHealthRiskAnalysis = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/health-risk`);
    return response;
  } catch (error) {
    console.error('건강 위험도 분석 가져오기 실패:', error);
    throw error;
  }
};

// 건강 데이터 통계 가져오기
export const fetchHealthStats = async (userId, period = 'week') => {
  try {
    const response = await apiClient.get(`/users/${userId}/health-stats`, {
      params: { period }
    });
    return response;
  } catch (error) {
    console.error('건강 통계 가져오기 실패:', error);
    throw error;
  }
};