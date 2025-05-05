import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { firebase } from '../../mobile/src/lib/firebase';
import useHeartRate from '../../mobile/src/hooks/useHeartRate';

const { width } = Dimensions.get('window');

const HeartDiagnosisScreen = ({ webAppData, refreshData, loading }) => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('monitoring');
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // 실시간 심박수 데이터 훅 사용
  const { heartRate, error, isLoading } = useHeartRate(isMonitoring ? 5 : 0); // 모니터링 중일 때만 5초 간격으로 데이터 수신
  
  // 심박수 이력 데이터 (최근 10개)
  const [heartRateHistory, setHeartRateHistory] = useState([]);
  
  // Firebase에서 사용자의 심박수 이력 가져오기
  useEffect(() => {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid) return;
    
    const unsubscribe = firebase.firestore()
      .collection(`users/${uid}/vitals`)
      .where('type', '==', 'heartRate')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        setHeartRateHistory(data);
      }, error => {
        console.error('심박수 이력 데이터를 가져오는 중 오류 발생:', error);
      });
      
    return () => unsubscribe();
  }, []);
  
  // 측정 시작/중지 함수
  const toggleMonitoring = () => {
    if (!isMonitoring) {
      // 권한 확인 및 측정 시작
      startMonitoring();
    } else {
      // 측정 중지
      setIsMonitoring(false);
    }
  };
  
  // 측정 시작 함수
  const startMonitoring = async () => {
    try {
      // 여기서는 useHeartRate 훅이 권한 요청을 처리하므로
      // 단순히 상태만 변경합니다.
      setIsMonitoring(true);
    } catch (error) {
      console.error('측정 시작 중 오류 발생:', error);
      Alert.alert(
        '측정 오류',
        '심박수 측정을 시작하는 중 오류가 발생했습니다. 앱 권한을 확인해주세요.',
        [{ text: '확인' }]
      );
    }
  };
  
  // ECG 데이터 시각화 (가상 데이터)
  const generateEcgData = () => {
    // 심박수에 따라 ECG 파형 주파수 조정
    const bpm = heartRate?.value || webAppData?.healthData?.heartRate || 70;
    const frequency = bpm / 60; // 초당 심박수
    
    return Array(100).fill(0).map((_, i) => 
      Math.sin(i / (10 / frequency)) * 50 + 
      Math.sin(i / 5) * 10 + // P파 시뮬레이션
      (i % 20 === 0 ? 80 : 0) + // QRS 복합체 시뮬레이션
      Math.random() * 5 // 노이즈
    );
  };
  
  const ecgData = generateEcgData();
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>심장진단</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('비상연락')}
          >
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {/* 탭 메뉴 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'monitoring' && styles.activeTabButton]}
            onPress={() => setActiveTab('monitoring')}
          >
            <Ionicons 
              name="pulse" 
              size={18} 
              color={activeTab === 'monitoring' ? "#FF6D94" : "#666"} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'monitoring' && styles.activeTabText
              ]}
            >
              모니터링
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'risk' && styles.activeTabButton]}
            onPress={() => setActiveTab('risk')}
          >
            <Ionicons 
              name="stats-chart" 
              size={18} 
              color={activeTab === 'risk' ? "#FF6D94" : "#666"} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'risk' && styles.activeTabText
              ]}
            >
              위험도 분석
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons 
              name="calendar" 
              size={18} 
              color={activeTab === 'history' ? "#FF6D94" : "#666"} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'history' && styles.activeTabText
              ]}
            >
              측정기록
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'ai' && styles.activeTabButton]}
            onPress={() => setActiveTab('ai')}
          >
            <Ionicons 
              name="heart-circle" 
              size={18} 
              color={activeTab === 'ai' ? "#FF6D94" : "#666"} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'ai' && styles.activeTabText
              ]}
            >
              AI 분석
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {activeTab === 'monitoring' && (
            <View style={styles.monitoringContent}>
              {/* 현재 상태 정보 */}
              <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>심박수</Text>
                    <View style={styles.statusValueContainer}>
                      <Text style={styles.statusValue}>
                        {heartRate?.value || webAppData?.healthData?.heartRate || '--'}
                      </Text>
                      <Text style={styles.statusUnit}>bpm</Text>
                    </View>
                    {isMonitoring && (
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveIndicatorDot} />
                        <Text style={styles.liveIndicatorText}>실시간</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>산소포화도</Text>
                    <View style={styles.statusValueContainer}>
                      <Text style={styles.statusValue}>
                        {webAppData?.healthData?.oxygenSaturation || '--'}
                      </Text>
                      <Text style={styles.statusUnit}>%</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.statusRow}>
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>혈압</Text>
                    <View style={styles.statusValueContainer}>
                      <Text style={styles.statusValue}>
                        {webAppData?.healthData ? 
                          `${webAppData.healthData.bloodPressureSystolic}/${webAppData.healthData.bloodPressureDiastolic}` : 
                          '--/--'
                        }
                      </Text>
                      <Text style={styles.statusUnit}>mmHg</Text>
                    </View>
                  </View>
                  
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>체온</Text>
                    <View style={styles.statusValueContainer}>
                      <Text style={styles.statusValue}>
                        {webAppData?.healthData?.temperature || '--'}
                      </Text>
                      <Text style={styles.statusUnit}>°C</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.updateTime}>
                  {heartRate?.timestamp ? 
                    `최근 업데이트: ${heartRate.timestamp.toLocaleString()}` : 
                    webAppData?.healthData?.lastUpdated ? 
                    `최근 업데이트: ${new Date(webAppData.healthData.lastUpdated).toLocaleString()}` : 
                    '업데이트 정보 없음'
                  }
                </Text>
              </View>
              
              {/* ECG 그래프 영역 */}
              <View style={styles.ecgCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>실시간 ECG</Text>
                  <TouchableOpacity>
                    <Ionicons name="expand-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.ecgGraphContainer}>
                  <View style={styles.ecgGraph}>
                    {/* ECG 선 그래프 */}
                    <View style={styles.ecgLineContainer}>
                      {ecgData.map((value, index) => (
                        <View 
                          key={index}
                          style={[
                            styles.ecgLine,
                            { 
                              height: Math.abs(value), 
                              transform: [{ translateY: value > 0 ? 0 : -value }]
                            }
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                </View>
                
                <View style={styles.ecgStatus}>
                  <View style={styles.normalStatus}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.normalStatusText}>
                      {isMonitoring ? '측정 중...' : '정상 심박동'}
                    </Text>
                  </View>
                  
                  <Text style={styles.bpmText}>
                    {heartRate?.value || webAppData?.healthData?.heartRate || '--'} BPM
                  </Text>
                </View>
              </View>
              
              {/* 측정 버튼 영역 */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[
                    styles.measureButton,
                    isMonitoring && styles.stopButton
                  ]}
                  onPress={toggleMonitoring}
                >
                  <Ionicons 
                    name={isMonitoring ? "stop-circle" : "pulse"} 
                    size={24} 
                    color="#fff" 
                  />
                  <Text style={styles.measureButtonText}>
                    {isMonitoring ? '측정 중지' : '심전도 측정'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.shareButton}>
                  <Ionicons name="share-outline" size={20} color="#FF6D94" />
                  <Text style={styles.shareButtonText}>의사와 공유</Text>
                </TouchableOpacity>
              </View>
              
              {/* 웹 연동 정보 */}
              <View style={styles.webSyncInfoCard}>
                <View style={styles.webSyncHeader}>
                  <Ionicons name="globe-outline" size={20} color="#0D47A1" />
                  <Text style={styles.webSyncTitle}>웹 연동 정보</Text>
                </View>
                <Text style={styles.webSyncText}>
                  웹 애플리케이션에 연결되어 있습니다. 
                  더 자세한 ECG 분석과 데이터는 웹에서 확인하세요.
                </Text>
                <TouchableOpacity style={styles.webSyncButton}>
                  <Text style={styles.webSyncButtonText}>웹에서 보기</Text>
                  <Ionicons name="open-outline" size={16} color="#2196F3" />
                </TouchableOpacity>
              </View>
              
              {/* 팁 카드 */}
              <View style={styles.tipCard}>
                <View style={styles.tipIconContainer}>
                  <Ionicons name="information-circle" size={24} color="#fff" />
                </View>
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>측정 팁</Text>
                  <Text style={styles.tipText}>
                    정확한 심전도 측정을 위해 스마트워치를 손목에 꼭 맞게 착용하고, 
                    측정 중에는 움직임을 최소화하세요.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'history' && (
            <View style={styles.historyContent}>
              <Text style={styles.historyTitle}>최근 심박수 기록</Text>
              
              {heartRateHistory.length > 0 ? (
                heartRateHistory.map((item, index) => (
                  <View key={item.id || index} style={styles.historyItem}>
                    <View style={styles.historyItemInfo}>
                      <Text style={styles.historyItemDate}>
                        {item.timestamp.toLocaleString()}
                      </Text>
                      <Text style={styles.historyItemSource}>
                        출처: {item.source || '앱'}
                      </Text>
                    </View>
                    <View style={styles.historyItemValue}>
                      <Text style={styles.historyItemBpm}>
                        {item.bpm}
                      </Text>
                      <Text style={styles.historyItemUnit}>BPM</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyHistory}>
                  <Ionicons name="pulse" size={40} color="#ddd" />
                  <Text style={styles.emptyHistoryText}>
                    측정 기록이 없습니다.
                  </Text>
                  <Text style={styles.emptyHistorySubText}>
                    '심전도 측정' 버튼을 눌러 첫 측정을 시작하세요.
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {activeTab === 'risk' && (
            <View style={styles.riskContent}>
              <Text style={styles.contentTitle}>위험도 분석</Text>
              <Text style={styles.comingSoonText}>웹 애플리케이션과 연동 중입니다.
              모바일 애플리케이션에서 곧 사용 가능합니다.</Text>
            </View>
          )}
          
          {activeTab === 'ai' && (
            <View style={styles.aiContent}>
              <Text style={styles.contentTitle}>AI 분석</Text>
              <Text style={styles.comingSoonText}>웹 애플리케이션과 연동 중입니다.
              모바일 애플리케이션에서 곧 사용 가능합니다.</Text>
            </View>
          )}
        </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6D94',
  },
  tabText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#FF6D94',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  monitoringContent: {
    padding: 15,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  statusValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statusUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 2,
    marginBottom: 4,
  },
  updateTime: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 5,
  },
  ecgCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ecgGraphContainer: {
    height: 120,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  ecgGraph: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  ecgLineContainer: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  ecgLine: {
    width: 2,
    backgroundColor: '#FF6D94',
    marginRight: 1,
  },
  ecgStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  normalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  normalStatusText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 5,
  },
  bpmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6D94',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  measureButton: {
    backgroundColor: '#FF6D94',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 3,
    marginRight: 10,
  },
  stopButton: {
    backgroundColor: '#FF4757',
  },
  measureButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: '#fff',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 2,
    borderWidth: 1,
    borderColor: '#FF6D94',
  },
  shareButtonText: {
    color: '#FF6D94',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
  webSyncInfoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  webSyncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  webSyncTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginLeft: 8,
  },
  webSyncText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  webSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  webSyncButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginRight: 5,
  },
  tipCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 15,
  },
  tipIconContainer: {
    backgroundColor: '#FF6D94',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4757',
    marginRight: 4,
  },
  liveIndicatorText: {
    fontSize: 12,
    color: '#FF4757',
    fontWeight: '500',
  },
  historyContent: {
    padding: 15,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  historyItemInfo: {
    flex: 3,
  },
  historyItemDate: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 3,
  },
  historyItemSource: {
    fontSize: 12,
    color: '#888',
  },
  historyItemValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  historyItemBpm: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6D94',
  },
  historyItemUnit: {
    fontSize: 12,
    color: '#888',
    marginLeft: 3,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptyHistorySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
  },
  riskContent: {
    padding: 20,
  },
  aiContent: {
    padding: 20,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
});

export default HeartDiagnosisScreen;