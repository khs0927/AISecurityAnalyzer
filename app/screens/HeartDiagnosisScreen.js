import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const HeartDiagnosisScreen = ({ webAppData, refreshData, loading }) => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('monitoring');
  
  // 가상의 ECG 데이터
  const ecgData = Array(100).fill(0).map((_, i) => Math.sin(i / 10) * 50 + Math.random() * 20);
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>심장진단</Text>
          <TouchableOpacity style={styles.settingsButton}>
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
                        {webAppData?.healthData?.heartRate || '--'}
                      </Text>
                      <Text style={styles.statusUnit}>bpm</Text>
                    </View>
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
                  {webAppData?.healthData?.lastUpdated ? 
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
                    {/* 가상의 ECG 선 그래프 */}
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
                    <Text style={styles.normalStatusText}>정상 심박동</Text>
                  </View>
                  
                  <Text style={styles.bpmText}>
                    {webAppData?.healthData?.heartRate || '--'} BPM
                  </Text>
                </View>
              </View>
              
              {/* 측정 버튼 영역 */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.measureButton}>
                  <Ionicons name="pulse" size={24} color="#fff" />
                  <Text style={styles.measureButtonText}>심전도 측정</Text>
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
                    정확한 측정을 위해 안정된 자세로 30초간 움직이지 말고 기다려주세요.
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {activeTab === 'risk' && (
            <View style={styles.riskContent}>
              <Text style={styles.contentTitle}>위험도 분석</Text>
              <Text style={styles.comingSoonText}>웹 애플리케이션과 연동 중입니다.
              모바일 애플리케이션에서 곧 사용 가능합니다.</Text>
            </View>
          )}
          
          {activeTab === 'history' && (
            <View style={styles.historyContent}>
              <Text style={styles.contentTitle}>측정 기록</Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#FFE2E9',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#FF6D94',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  monitoringContent: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statusItem: {
    width: '48%',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  updateTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 10,
  },
  ecgCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  ecgGraphContainer: {
    height: 120,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
  },
  ecgGraph: {
    height: 80,
    justifyContent: 'center',
  },
  ecgLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  ecgLine: {
    width: 2,
    backgroundColor: '#FF6D94',
    marginHorizontal: 1,
  },
  ecgStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  normalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  normalStatusText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  bpmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtons: {
    marginBottom: 20,
  },
  measureButton: {
    backgroundColor: '#FF6D94',
    borderRadius: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#FF6D94',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  measureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  shareButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6D94',
  },
  shareButtonText: {
    color: '#FF6D94',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  webSyncInfoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
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
    color: '#0D47A1',
    marginBottom: 10,
    lineHeight: 20,
  },
  webSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  webSyncButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold',
    marginRight: 4,
  },
  tipCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 14,
    color: '#0D47A1',
    lineHeight: 20,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  riskContent: {
    padding: 20,
  },
  historyContent: {
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
  }
});

export default HeartDiagnosisScreen;