import apiClient from './client';

// 보호자 연락처 가져오기
export const fetchGuardians = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/guardians`);
    return response;
  } catch (error) {
    console.error('보호자 연락처 가져오기 실패:', error);
    // 기본 데이터 반환 (실제 앱에서는 오류 처리 방식 변경 필요)
    return [
      {
        id: 1,
        name: '김철수',
        relation: '배우자',
        phone: '010-1234-5678',
        priority: 1,
      },
      {
        id: 2,
        name: '이영희',
        relation: '자녀',
        phone: '010-2345-6789',
        priority: 2,
      },
      {
        id: 3,
        name: '박지성',
        relation: '부모',
        phone: '010-3456-7890',
        priority: 3,
      }
    ];
  }
};

// 보호자 추가하기
export const addGuardian = async (userId, guardianData) => {
  try {
    const response = await apiClient.post(`/users/${userId}/guardians`, guardianData);
    return response;
  } catch (error) {
    console.error('보호자 추가 실패:', error);
    throw error;
  }
};

// 보호자 정보 업데이트
export const updateGuardian = async (userId, guardianId, guardianData) => {
  try {
    const response = await apiClient.patch(`/users/${userId}/guardians/${guardianId}`, guardianData);
    return response;
  } catch (error) {
    console.error('보호자 정보 업데이트 실패:', error);
    throw error;
  }
};

// 보호자 삭제
export const deleteGuardian = async (userId, guardianId) => {
  try {
    const response = await apiClient.delete(`/users/${userId}/guardians/${guardianId}`);
    return response;
  } catch (error) {
    console.error('보호자 삭제 실패:', error);
    throw error;
  }
};

// 자동 호출 설정 가져오기
export const fetchAutoCallSettings = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/auto-call-settings`);
    return response;
  } catch (error) {
    console.error('자동 호출 설정 가져오기 실패:', error);
    throw error;
  }
};

// 자동 호출 설정 업데이트
export const updateAutoCallSettings = async (userId, settings) => {
  try {
    const response = await apiClient.patch(`/users/${userId}/auto-call-settings`, settings);
    return response;
  } catch (error) {
    console.error('자동 호출 설정 업데이트 실패:', error);
    throw error;
  }
};

// 근처 병원 가져오기
export const fetchNearbyHospitals = async (latitude, longitude, radius = 5000) => {
  try {
    const response = await apiClient.get('/hospitals/nearby', {
      params: { latitude, longitude, radius }
    });
    return response;
  } catch (error) {
    console.error('근처 병원 가져오기 실패:', error);
    // 기본 데이터 반환 (실제 앱에서는 오류 처리 방식 변경 필요)
    return [
      {
        id: 1,
        name: '서울대학교병원',
        distance: '1.2km',
        address: '서울시 종로구 대학로 101',
        phone: '02-2072-2114',
        isOpen24h: true,
        specialty: '심장 전문',
      },
      {
        id: 2,
        name: '서울아산병원',
        distance: '2.5km',
        address: '서울시 송파구 올림픽로 43길 88',
        phone: '1688-7575',
        isOpen24h: true,
      },
      {
        id: 3,
        name: '세브란스병원',
        distance: '3.8km',
        address: '서울시 서대문구 연세로 50-1',
        phone: '1599-1004',
        isOpen24h: true,
        specialty: '응급의료센터',
      },
    ];
  }
};