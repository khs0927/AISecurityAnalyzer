import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  SafeAreaView,
  ActivityIndicator, 
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 비상 연락처 목록 더미 데이터
const EMERGENCY_CONTACTS = [
  {
    id: '1',
    name: '홍길동',
    relation: '보호자',
    phone: '010-1234-5678',
    priority: 1,
  },
  {
    id: '2',
    name: '김의사',
    relation: '담당의',
    phone: '010-2345-6789',
    priority: 2,
  },
  {
    id: '3',
    name: '서울대병원',
    relation: '의료기관',
    phone: '02-2072-2114',
    priority: 3,
  },
];

// 비상 연락망 화면 컴포넌트
const EmergencyContactsScreen = () => {
  const [contacts, setContacts] = useState(EMERGENCY_CONTACTS);
  const [loading, setLoading] = useState(false);

  // API에서 비상 연락처 데이터 가져오기 (추후 실제 API로 연결)
  const fetchEmergencyContacts = async () => {
    try {
      setLoading(true);
      // 실제 API 호출 로직으로 대체 예정
      // const response = await fetch('https://api-url/emergency-contacts');
      // const data = await response.json();
      // setContacts(data);
      
      // 더미 데이터 사용
      setTimeout(() => {
        setContacts(EMERGENCY_CONTACTS);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('비상 연락처를 가져오는 중 오류 발생:', error);
      setLoading(false);
      Alert.alert('오류', '비상 연락처를 불러오는 데 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchEmergencyContacts();
  }, []);

  // 전화 걸기 기능 (실제로는 Linking API를 사용하여 전화 앱 실행)
  const handleCall = (phone) => {
    Alert.alert(
      '전화 걸기',
      `${phone}로 전화를 겁니다.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '전화 걸기', onPress: () => console.log(`전화 걸기: ${phone}`) }
      ]
    );
  };

  // 비상 연락처 항목 렌더링
  const renderContactItem = ({ item }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.contactName}>{item.name}</Text>
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>{item.priority}순위</Text>
          </View>
        </View>
        <Text style={styles.relationText}>{item.relation}</Text>
        <Text style={styles.phoneText}>{item.phone}</Text>
      </View>
      <TouchableOpacity 
        style={styles.callButton}
        onPress={() => handleCall(item.phone)}
      >
        <Ionicons name="call" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // 주변 병원 찾기 버튼
  const handleFindHospital = () => {
    Alert.alert('주변 병원 찾기', '현재 위치 기반으로 주변 병원을 검색합니다.');
  };

  // 긴급 상황 안내 버튼
  const handleEmergencyInfo = () => {
    Alert.alert('긴급 상황 안내', '긴급 상황 시 행동 요령과 관련 정보를 제공합니다.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>심박감지알람</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchEmergencyContacts}>
          <Ionicons name="refresh" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6D94" />
          <Text style={styles.loadingText}>연락처 불러오는 중...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>등록된 보호자</Text>
            <FlatList
              data={contacts}
              renderItem={renderContactItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>

          <View style={styles.emergencySection}>
            <Text style={styles.sectionTitle}>긴급 서비스</Text>
            
            <TouchableOpacity style={styles.emergencyButton} onPress={() => handleCall('119')}>
              <View style={[styles.emergencyIcon, {backgroundColor: '#ff6b6b'}]}>
                <Ionicons name="fitness" size={24} color="#fff" />
              </View>
              <View style={styles.emergencyButtonText}>
                <Text style={styles.emergencyTitle}>응급 의료 서비스 (119)</Text>
                <Text style={styles.emergencyDesc}>의료 응급 상황 시 연락</Text>
              </View>
              <Ionicons name="call" size={24} color="#ff6b6b" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.emergencyButton} onPress={() => handleCall('112')}>
              <View style={[styles.emergencyIcon, {backgroundColor: '#4dabf7'}]}>
                <Ionicons name="shield" size={24} color="#fff" />
              </View>
              <View style={styles.emergencyButtonText}>
                <Text style={styles.emergencyTitle}>경찰 (112)</Text>
                <Text style={styles.emergencyDesc}>위급 상황 시 신고</Text>
              </View>
              <Ionicons name="call" size={24} color="#4dabf7" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleFindHospital}>
              <Ionicons name="location" size={24} color="#FF6D94" />
              <Text style={styles.actionButtonText}>주변 병원 찾기</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleEmergencyInfo}>
              <Ionicons name="information-circle" size={24} color="#FF6D94" />
              <Text style={styles.actionButtonText}>긴급 상황 안내</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contactInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  priorityBadge: {
    backgroundColor: '#FF6D94',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  relationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  phoneText: {
    fontSize: 16,
    color: '#333',
  },
  callButton: {
    backgroundColor: '#FF6D94',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencySection: {
    padding: 20,
    paddingTop: 0,
  },
  emergencyButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emergencyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emergencyButtonText: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emergencyDesc: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 0,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default EmergencyContactsScreen;