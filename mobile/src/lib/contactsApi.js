import apiClient from './queryClient';

/**
 * 보호자 목록 가져오기
 * @param {number} userId 사용자 ID
 * @returns {Promise<Array>} 보호자 정보 배열
 */
export const fetchGuardians = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/guardians`);
    return response.data;
  } catch (error) {
    console.error('보호자 목록 조회 실패:', error);
    throw error;
  }
};

/**
 * 보호자 추가하기
 * @param {number} userId 사용자 ID
 * @param {Object} guardianData 보호자 정보
 * @returns {Promise<Object>} 추가된 보호자 정보
 */
export const addGuardian = async (userId, guardianData) => {
  try {
    const response = await apiClient.post(`/users/${userId}/guardians`, guardianData);
    return response.data;
  } catch (error) {
    console.error('보호자 추가 실패:', error);
    throw error;
  }
};

/**
 * 보호자 정보 수정하기
 * @param {number} userId 사용자 ID
 * @param {number} guardianId 보호자 ID
 * @param {Object} guardianData 보호자 수정 정보
 * @returns {Promise<Object>} 수정된 보호자 정보
 */
export const updateGuardian = async (userId, guardianId, guardianData) => {
  try {
    const response = await apiClient.put(`/users/${userId}/guardians/${guardianId}`, guardianData);
    return response.data;
  } catch (error) {
    console.error('보호자 정보 수정 실패:', error);
    throw error;
  }
};

/**
 * 보호자 삭제하기
 * @param {number} userId 사용자 ID
 * @param {number} guardianId 보호자 ID
 * @returns {Promise<Object>} 삭제 결과
 */
export const deleteGuardian = async (userId, guardianId) => {
  try {
    const response = await apiClient.delete(`/users/${userId}/guardians/${guardianId}`);
    return response.data;
  } catch (error) {
    console.error('보호자 삭제 실패:', error);
    throw error;
  }
};

/**
 * 알림 기록 가져오기
 * @param {number} userId 사용자 ID
 * @returns {Promise<Array>} 알림 기록 배열
 */
export const fetchAlerts = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/alerts`);
    return response.data;
  } catch (error) {
    console.error('알림 기록 조회 실패:', error);
    throw error;
  }
};

/**
 * 긴급 알림 보내기
 * @param {number} userId 사용자 ID
 * @param {Object} alertData 알림 정보
 * @returns {Promise<Object>} 알림 결과
 */
export const sendEmergencyAlert = async (userId, alertData) => {
  try {
    const response = await apiClient.post(`/users/${userId}/alerts`, alertData);
    return response.data;
  } catch (error) {
    console.error('긴급 알림 전송 실패:', error);
    throw error;
  }
};

/**
 * 주변 병원 정보 가져오기
 * @param {Object} location 위치 정보 (latitude, longitude)
 * @param {number} radius 검색 반경 (미터)
 * @returns {Promise<Array>} 병원 정보 배열
 */
export const findNearbyHospitals = async (location, radius = 3000) => {
  try {
    const response = await apiClient.get('/hospitals/nearby', {
      params: { ...location, radius }
    });
    return response.data;
  } catch (error) {
    console.error('주변 병원 검색 실패:', error);
    throw error;
  }
};