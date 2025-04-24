import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSmartWatch } from '../contexts/SmartWatchContext';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { isConnected, deviceInfo, data } = useSmartWatch();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [healthScore, setHealthScore] = useState(85);

  useEffect(() => {
    if (data.lastUpdated) {
      setLastUpdate(data.lastUpdated);
    }
    
    if (data.heartRate) {
      if (data.heartRate > 120) {
        setHealthStatus('critical');
        setHealthScore(Math.max(30, healthScore - 10));
      } else if (data.heartRate > 100) {
        setHealthStatus('warning');
        setHealthScore(Math.max(50, healthScore - 5));
      } else if (data.heartRate >= 60 && data.heartRate <= 100) {
        setHealthStatus('normal');
        setHealthScore(Math.min(100, healthScore + 1));
      } else if (data.heartRate < 50) {
        setHealthStatus('warning');
        setHealthScore(Math.max(50, healthScore - 5));
      }
    }
  }, [data]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const getStatusColor = () => {
    switch (healthStatus) {
      case 'critical': return '#FF3B30';
      case 'warning': return '#FFCC00';
      case 'normal': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getStatusText = () => {
    switch (healthStatus) {
      case 'critical': return '위험';
      case 'warning': return '주의';
      case 'normal': return '정상';
      default: return '확인 중';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>낫투데이</Text>
        <Text style={styles.subtitle}>건강한 하루 시작하세요</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.watchStatusCard}
        onPress={() => navigation.navigate('Smart Watch' as never)}
      >
        <View style={styles.watchStatusContent}>
          <Ionicons 
            name={isConnected ? "watch" : "watch-outline"} 
            size={28} 
            color={isConnected ? "#FF0000" : "#8E8E93"} 
          />
          <View style={styles.watchTextContainer}>
            <Text style={styles.watchStatusTitle}>
              {isConnected ? '스마트워치 연결됨' : '스마트워치 연결 안됨'}
            </Text>
            <Text style={styles.watchStatusSubtitle}>
              {isConnected 
                ? `${deviceInfo?.name || '연결된 기기'} - 마지막 업데이트: ${lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '없음'}`
                : '실시간 건강 데이터를 보려면 스마트워치를 연결하세요'
              }
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        </View>
      </TouchableOpacity>
      
      <View style={styles.healthStatusCard}>
        <View style={styles.healthScoreContainer}>
          <View 
            style={[
              styles.healthScoreCircle, 
              { borderColor: getStatusColor() }
            ]}
          >
            <Text style={styles.healthScoreText}>{healthScore}</Text>
          </View>
          <Text style={[styles.healthStatusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          <Text style={styles.healthStatusSubtext}>현재 건강 상태</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.vitalSignsContainer}>
          <View style={styles.vitalSign}>
            <Ionicons name="heart" size={22} color="#FF0000" />
            <Text style={styles.vitalSignValue}>
              {data.heartRate ? `${data.heartRate} bpm` : '-'}
            </Text>
            <Text style={styles.vitalSignLabel}>심박수</Text>
          </View>
          
          <View style={styles.vitalSign}>
            <Ionicons name="water" size={22} color="#007AFF" />
            <Text style={styles.vitalSignValue}>
              {data.oxygenLevel ? `${data.oxygenLevel}%` : '-'}
            </Text>
            <Text style={styles.vitalSignLabel}>산소포화도</Text>
          </View>
          
          <View style={styles.vitalSign}>
            <Ionicons name="pulse" size={22} color="#FF9500" />
            <Text style={styles.vitalSignValue}>
              {data.ecgData && data.ecgData.length > 0 ? '기록됨' : '-'}
            </Text>
            <Text style={styles.vitalSignLabel}>ECG</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Health Data' as never)}
        >
          <Ionicons name="pulse" size={24} color="#FF0000" />
          <Text style={styles.quickActionText}>건강 데이터</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('AI Consultation' as never)}
        >
          <Ionicons name="medical" size={24} color="#FF0000" />
          <Text style={styles.quickActionText}>AI 상담</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Settings' as never)}
        >
          <Ionicons name="settings" size={24} color="#FF0000" />
          <Text style={styles.quickActionText}>설정</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.healthTipCard}>
        <View style={styles.healthTipHeader}>
          <Ionicons name="information-circle" size={22} color="#FF0000" />
          <Text style={styles.healthTipTitle}>오늘의 건강 팁</Text>
        </View>
        <Text style={styles.healthTipContent}>
          규칙적인 운동과 충분한 수면은 심장 건강에 중요합니다. 하루 30분의 가벼운 운동과 7-8시간의 수면을 유지하세요.
        </Text>
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
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#151515',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  watchStatusCard: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  watchStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  watchTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  watchStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#151515',
  },
  watchStatusSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  healthStatusCard: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingVertical: 20,
  },
  healthScoreContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  healthScoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  healthScoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#151515',
  },
  healthStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  healthStatusSubtext: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 10,
    marginHorizontal: 20,
  },
  vitalSignsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  vitalSign: {
    alignItems: 'center',
  },
  vitalSignValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#151515',
    marginTop: 6,
    marginBottom: 2,
  },
  vitalSignLabel: {
    fontSize: 13,
    color: '#666',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 10,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 5,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#151515',
  },
  healthTipCard: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
  },
  healthTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  healthTipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#151515',
    marginLeft: 8,
  },
  healthTipContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default HomeScreen;