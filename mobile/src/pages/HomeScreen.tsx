import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchLatestHealthData } from '../api/healthApi';

interface HealthData {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  oxygenSaturation: number;
  temperature: number;
  recordedAt: string;
}

const HomeScreen = () => {
  const navigation = useNavigation();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      const data = await fetchLatestHealthData(1); // 사용자 ID 1 사용
      setHealthData(data);
    } catch (error) {
      console.error('건강 데이터를 불러오는데 실패했습니다:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadHealthData().then(() => setRefreshing(false));
  }, []);

  return (
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
          <Text style={styles.username}>홍길동님</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.connectionIndicator, isConnected ? styles.connected : styles.disconnected]}>
            <Ionicons name="watch-outline" size={14} color={isConnected ? '#fff' : '#666'} />
            <Text style={{color: isConnected ? '#fff' : '#666', fontSize: 10, marginLeft: 2}}>
              {isConnected ? '연결됨' : '연결 안됨'}
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
        
        {healthData ? (
          <View style={styles.healthGrid}>
            <View style={styles.healthItem}>
              <View style={[styles.iconCircle, {backgroundColor: '#FFE2E9'}]}>
                <Ionicons name="heart" size={20} color="#FF6D94" />
              </View>
              <Text style={styles.metricValue}>{healthData.heartRate}</Text>
              <Text style={styles.metricLabel}>심박수</Text>
            </View>
            
            <View style={styles.healthItem}>
              <View style={[styles.iconCircle, {backgroundColor: '#E3F2FD'}]}>
                <Ionicons name="pulse" size={20} color="#2196F3" />
              </View>
              <Text style={styles.metricValue}>{healthData.bloodPressureSystolic}/{healthData.bloodPressureDiastolic}</Text>
              <Text style={styles.metricLabel}>혈압</Text>
            </View>
            
            <View style={styles.healthItem}>
              <View style={[styles.iconCircle, {backgroundColor: '#E1F5FE'}]}>
                <Ionicons name="water" size={20} color="#03A9F4" />
              </View>
              <Text style={styles.metricValue}>{healthData.oxygenSaturation}%</Text>
              <Text style={styles.metricLabel}>산소포화도</Text>
            </View>
            
            <View style={styles.healthItem}>
              <View style={[styles.iconCircle, {backgroundColor: '#FFF3E0'}]}>
                <Ionicons name="thermometer" size={20} color="#FF9800" />
              </View>
              <Text style={styles.metricValue}>{healthData.temperature}°C</Text>
              <Text style={styles.metricLabel}>체온</Text>
            </View>
          </View>
        ) : (
          <View style={styles.noDataView}>
            <Text style={styles.noDataText}>건강 데이터를 불러오는 중...</Text>
          </View>
        )}
        
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
            onPress={() => navigation.navigate('EmergencyGuideDetail')}
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
            onPress={() => navigation.navigate('AiConsultation')}
          >
            <View style={[styles.actionIcon, {backgroundColor: '#E1F5FE'}]}>
              <Ionicons name="chatbubbles" size={24} color="#03A9F4" />
            </View>
            <Text style={styles.actionText}>AI 상담</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 일일 건강 요약 */}
      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>일일 건강 요약</Text>
        <View style={styles.summaryContent}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>오늘의 심박수 평균</Text>
            <View style={styles.summaryValueContainer}>
              <Text style={styles.summaryValue}>72</Text>
              <Text style={styles.summaryUnit}>bpm</Text>
            </View>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>산소포화도 평균</Text>
            <View style={styles.summaryValueContainer}>
              <Text style={styles.summaryValue}>98</Text>
              <Text style={styles.summaryUnit}>%</Text>
            </View>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>최고 혈압</Text>
            <View style={styles.summaryValueContainer}>
              <Text style={styles.summaryValue}>120/80</Text>
              <Text style={styles.summaryUnit}>mmHg</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>일일 리포트 보기</Text>
          <Ionicons name="chevron-forward" size={16} color="#FF6D94" />
        </TouchableOpacity>
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
        </Text>
        <View style={styles.aiFooter}>
          <Text style={styles.aiTimeStamp}>1시간 전</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* 푸터 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>HeartCare v1.0</Text>
      </View>
    </ScrollView>
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
    paddingTop: 60,
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
  noDataView: {
    padding: 30,
    alignItems: 'center',
  },
  noDataText: {
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
  summaryCard: {
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
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryUnit: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  aiAdviceCard: {
    backgroundColor: '#FF6D94',
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