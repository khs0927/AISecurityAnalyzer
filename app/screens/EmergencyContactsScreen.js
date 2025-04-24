import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  Linking,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// 가상 데이터 - 실제 앱에서는 API 또는 로컬 저장소에서 가져옴
const guardians = [
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

const hospitals = [
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

const EmergencyContactsScreen = ({ webAppData, refreshData, loading }) => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('guardians');
  
  const callGuardian = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };
  
  const callHospital = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };
  
  const renderGuardianItem = ({ item }) => (
    <View style={styles.guardianCard}>
      <View style={styles.guardianHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          {item.priority && (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
          )}
        </View>
        <View style={styles.guardianInfo}>
          <Text style={styles.guardianName}>{item.name}</Text>
          <View style={styles.relationContainer}>
            <Text style={styles.relationText}>{item.relation}</Text>
          </View>
          <Text style={styles.phoneNumber}>{item.phone}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.callButton]}
            onPress={() => callGuardian(item.phone)}
          >
            <Ionicons name="call" size={18} color="#FF6D94" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="create-outline" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  
  const renderHospitalItem = ({ item }) => (
    <View style={styles.hospitalCard}>
      <View style={styles.hospitalIconContainer}>
        <Ionicons name="medkit" size={20} color="#FF6D94" />
      </View>
      <View style={styles.hospitalInfo}>
        <View style={styles.hospitalHeader}>
          <Text style={styles.hospitalName}>{item.name}</Text>
          {item.isOpen24h && (
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeText}>24시간</Text>
            </View>
          )}
        </View>
        <Text style={styles.hospitalAddress}>
          <Ionicons name="location" size={12} color="#666" /> {item.address} ({item.distance})
        </Text>
        {item.specialty && (
          <Text style={styles.hospitalSpecialty}>
            <Ionicons name="star" size={12} color="#666" /> {item.specialty}
          </Text>
        )}
      </View>
      <TouchableOpacity 
        style={styles.hospitalCallButton}
        onPress={() => callHospital(item.phone)}
      >
        <Ionicons name="call" size={18} color="#FF6D94" />
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>비상연락</Text>
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {/* 헤더 설명 */}
        <Text style={styles.headerDescription}>
          긴급 상황 시 연락할 보호자와 가까운 병원 정보
        </Text>
        
        {/* 비상 119 연락 카드 */}
        <TouchableOpacity 
          style={styles.emergencyCallButton}
          onPress={() => Linking.openURL('tel:119')}
        >
          <View style={styles.emergencyIconContainer}>
            <Ionicons name="warning" size={24} color="#fff" />
          </View>
          <View style={styles.emergencyTextContainer}>
            <Text style={styles.emergencyTitle}>긴급 상황 시</Text>
            <Text style={styles.emergencyDescription}>즉시 119에 연락하세요</Text>
          </View>
          <View style={styles.callButtonContainer}>
            <Text style={styles.callButtonText}>119 전화</Text>
          </View>
        </TouchableOpacity>
        
        {/* 탭 네비게이션 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'guardians' && styles.activeTabButton]}
            onPress={() => setActiveTab('guardians')}
          >
            <Ionicons 
              name="people" 
              size={18} 
              color={activeTab === 'guardians' ? "#FF6D94" : "#666"} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'guardians' && styles.activeTabText
              ]}
            >
              보호자
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'hospitals' && styles.activeTabButton]}
            onPress={() => setActiveTab('hospitals')}
          >
            <Ionicons 
              name="medkit" 
              size={18} 
              color={activeTab === 'hospitals' ? "#FF6D94" : "#666"} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'hospitals' && styles.activeTabText
              ]}
            >
              주변 병원
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* 탭 내용 */}
        <View style={styles.content}>
          {activeTab === 'guardians' && (
            <View style={styles.guardiansContent}>
              <View style={styles.contentHeader}>
                <Text style={styles.contentTitle}>등록된 보호자</Text>
                <TouchableOpacity style={styles.addButton}>
                  <Ionicons name="add" size={16} color="#FF6D94" />
                  <Text style={styles.addButtonText}>보호자 추가</Text>
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={guardians}
                renderItem={renderGuardianItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
              />
              
              {/* 자동 호출 설정 */}
              <View style={styles.autoCallCard}>
                <Text style={styles.autoCallTitle}>자동 호출 설정</Text>
                <Text style={styles.autoCallDescription}>
                  응급 상황이 감지되면 아래 우선순위로 자동 연락합니다
                </Text>
                <View style={styles.priorityList}>
                  {guardians
                    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                    .map((guardian) => (
                      <Text key={guardian.id} style={styles.priorityItem}>
                        {guardian.priority}. {guardian.name} ({guardian.relation}) - {guardian.phone}
                      </Text>
                    ))
                  }
                </View>
                <TouchableOpacity style={styles.autoCallSettingsButton}>
                  <Text style={styles.autoCallSettingsText}>자동 호출 설정 변경</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {activeTab === 'hospitals' && (
            <View style={styles.hospitalsContent}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <Text style={styles.searchPlaceholder}>병원 검색...</Text>
              </View>
              
              {/* 지도 영역 (가상) */}
              <View style={styles.mapContainer}>
                <Text style={styles.mapPlaceholder}>지도 영역</Text>
              </View>
              
              {/* 병원 필터 */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                <TouchableOpacity style={[styles.filterBadge, styles.activeFilterBadge]}>
                  <Text style={styles.activeFilterText}>모든 병원</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterBadge}>
                  <Text style={styles.filterText}>심장 전문</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterBadge}>
                  <Text style={styles.filterText}>응급의료센터</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterBadge}>
                  <Text style={styles.filterText}>24시간 운영</Text>
                </TouchableOpacity>
              </ScrollView>
              
              {/* 병원 목록 */}
              <FlatList
                data={hospitals}
                renderItem={renderHospitalItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.hospitalList}
              />
              
              {/* 정보 안내 */}
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>병원 정보 안내</Text>
                <Text style={styles.infoText}>
                  가장 가까운 응급실을 찾으시려면 119에 문의하는 것이 가장 빠릅니다.
                  위급한 상황에서는 먼저 119에 연락하세요.
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
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
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  emergencyCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4d4d',
    margin: 20,
    marginTop: 10,
    borderRadius: 20,
    padding: 15,
  },
  emergencyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  emergencyTextContainer: {
    flex: 1,
  },
  emergencyTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emergencyDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  callButtonContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  callButtonText: {
    color: '#ff4d4d',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    marginHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#FFE2E9',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#FF6D94',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  guardiansContent: {
    paddingHorizontal: 20,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE2E9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 12,
    color: '#FF6D94',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  guardianCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  guardianHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  priorityBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6D94',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  guardianInfo: {
    flex: 1,
  },
  guardianName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  relationContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  relationText: {
    fontSize: 12,
    color: '#666',
  },
  phoneNumber: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#f5f5f5',
  },
  callButton: {
    backgroundColor: '#FFE2E9',
  },
  autoCallCard: {
    backgroundColor: '#FFE2E9',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  autoCallTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6D94',
    marginBottom: 8,
  },
  autoCallDescription: {
    fontSize: 14,
    color: 'rgba(255, 109, 148, 0.8)',
    marginBottom: 15,
  },
  priorityList: {
    marginBottom: 15,
  },
  priorityItem: {
    fontSize: 14,
    color: '#FF6D94',
    marginBottom: 8,
    paddingLeft: 12,
  },
  autoCallSettingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  autoCallSettingsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6D94',
  },
  hospitalsContent: {
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    color: '#999',
    fontSize: 14,
  },
  mapContainer: {
    height: 150,
    backgroundColor: '#e1e1e1',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  mapPlaceholder: {
    color: '#999',
    fontSize: 14,
  },
  filterContainer: {
    marginBottom: 15,
  },
  filterBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  activeFilterBadge: {
    backgroundColor: '#FF6D94',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
  },
  activeFilterText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  hospitalList: {
    paddingBottom: 20,
  },
  hospitalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hospitalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE2E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  openBadge: {
    backgroundColor: '#e7f9f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  openBadgeText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  hospitalAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  hospitalSpecialty: {
    fontSize: 12,
    color: '#666',
  },
  hospitalCallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE2E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  }
});

export default EmergencyContactsScreen;