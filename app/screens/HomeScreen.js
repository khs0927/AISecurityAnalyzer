import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl,
  SafeAreaView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = ({ webAppData, refreshData, loading }) => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const renderHealthData = () => {
    if (!webAppData || !webAppData.healthData) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>건강 데이터를 불러오는 중...</Text>
        </View>
      );
    }

    const { heartRate, bloodPressureSystolic, bloodPressureDiastolic, oxygenSaturation, temperature } = webAppData.healthData;

    return (
      <View style={styles.healthGrid}>
        <View style={styles.healthItem}>
          <View style={[styles.iconCircle, {backgroundColor: '#FFE2E9'}]}>
            <Ionicons name="heart" size={20} color="#FF6D94" />
          </View>
          <Text style={styles.metricValue}>{heartRate}</Text>
          <Text style={styles.metricLabel}>심박수</Text>
        </View>
        
        <View style={styles.healthItem}>
          <View style={[styles.iconCircle, {backgroundColor: '#E3F2FD'}]}>
            <Ionicons name="pulse" size={20} color="#2196F3" />
          </View>
          <Text style={styles.metricValue}>{bloodPressureSystolic}/{bloodPressureDiastolic}</Text>
          <Text style={styles.metricLabel}>혈압</Text>
        </View>
        
        <View style={styles.healthItem}>
          <View style={[styles.iconCircle, {backgroundColor: '#E1F5FE'}]}>
            <Ionicons name="water" size={20} color="#03A9F4" />
          </View>
          <Text style={styles.metricValue}>{oxygenSaturation}%</Text>
          <Text style={styles.metricLabel}>산소포화도</Text>
        </View>
        
        <View style={styles.healthItem}>
          <View style={[styles.iconCircle, {backgroundColor: '#FFF3E0'}]}>
            <Ionicons name="thermometer" size={20} color="#FF9800" />
          </View>
          <Text style={styles.metricValue}>{temperature}°C</Text>
          <Text style={styles.metricLabel}>체온</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>안녕하세요!</Text>
            <Text style={styles.username}>
              {webAppData?.user?.name || '사용자'}님
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[
              styles.connectionIndicator, 
              webAppData?.watchConnected ? styles.connected : styles.disconnected
            ]}>
              <Ionicons 
                name="watch-outline" 
                size={14} 
                color={webAppData?.watchConnected ? '#fff' : '#666'} 
              />
              <Text style={{
                color: webAppData?.watchConnected ? '#fff' : '#666', 
                fontSize: 10, 
                marginLeft: 2
              }}>
                {webAppData?.watchConnected ? '연결됨' : '연결 안됨'}
              </Text>
            </View>
            <TouchableOpacity style={styles.profileButton}>
              <Ionicons name="person-circle-outline" size={32} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 현재 건강 상태 */}
        <View style={styles.healthCard}>
          <Text style={styles.sectionTitle}>현재 건강 상태</Text>
          {renderHealthData()}
          
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => navigation.navigate('심장진단')}
          >
            <Text style={styles.viewButtonText}>상세 보기</Text>
            <Ionicons name="chevron-forward" size={16} color="#FF6D94" />
          </TouchableOpacity>
        </View>

        {/* 빠른 액션 버튼 */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>빠른 액션</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('심장진단')}
            >
              <View style={[styles.actionIcon, {backgroundColor: '#FFE2E9'}]}>
                <Ionicons name="pulse" size={24} color="#FF6D94" />
              </View>
              <Text style={styles.actionText}>측정 시작</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('응급처치')}
            >
              <View style={[styles.actionIcon, {backgroundColor: '#E8F5E9'}]}>
                <Ionicons name="medkit" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.actionText}>응급 처치</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('비상연락')}
            >
              <View style={[styles.actionIcon, {backgroundColor: '#E3F2FD'}]}>
                <Ionicons name="call" size={24} color="#2196F3" />
              </View>
              <Text style={styles.actionText}>긴급 연락</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('심장진단', { screen: 'AI상담' })}
            >
              <View style={[styles.actionIcon, {backgroundColor: '#E1F5FE'}]}>
                <Ionicons name="chatbubbles" size={24} color="#03A9F4" />
              </View>
              <Text style={styles.actionText}>AI 상담</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI 건강 조언 */}
        <TouchableOpacity style={styles.aiAdviceCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIconContainer}>
              <Ionicons name="heart-circle" size={24} color="#fff" />
            </View>
            <Text style={styles.aiTitle}>AI 건강 조언</Text>
          </View>
          <Text style={styles.aiMessage}>
            오늘은 혈압이 안정적입니다. 하루 30분의 가벼운 운동을 추천합니다.
            웹 애플리케이션에서 더 자세한 건강 분석을 확인해보세요.
          </Text>
          <View style={styles.aiFooter}>
            <Text style={styles.aiTimeStamp}>1시간 전</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* 웹앱 연동 정보 */}
        <View style={styles.webSyncCard}>
          <View style={styles.webSyncHeader}>
            <Ionicons name="globe-outline" size={20} color="#333" />
            <Text style={styles.webSyncTitle}>웹 애플리케이션 연동</Text>
          </View>
          <Text style={styles.webSyncText}>
            HeartCare 웹 애플리케이션과 연동되어 있습니다.
            모바일 앱과 웹에서 동일한 데이터를 확인할 수 있습니다.
          </Text>
          <TouchableOpacity style={styles.webSyncButton}>
            <Text style={styles.webSyncButtonText}>자세히 보기</Text>
            <Ionicons name="open-outline" size={16} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* 푸터 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>HeartCare v1.0</Text>
        </View>
      </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  profileButton: {
    padding: 4,
  },
  healthCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  healthItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6D94',
    marginRight: 4,
  },
  quickActions: {
    padding: 20,
    paddingTop: 0,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  aiAdviceCard: {
    backgroundColor: '#FF6D94',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  aiMessage: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 12,
  },
  aiFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiTimeStamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  webSyncCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  webSyncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  webSyncTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  webSyncText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  webSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  webSyncButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold',
    marginRight: 4,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default HomeScreen;