import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const HeartDiagnosisScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('monitoring');
  
  // 가상의 ECG 데이터
  const ecgData = Array(100).fill(0).map((_, i) => Math.sin(i / 10) * 50 + Math.random() * 20);
  
  return (
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
                    <Text style={styles.statusValue}>72</Text>
                    <Text style={styles.statusUnit}>bpm</Text>
                  </View>
                </View>
                
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>산소포화도</Text>
                  <View style={styles.statusValueContainer}>
                    <Text style={styles.statusValue}>98</Text>
                    <Text style={styles.statusUnit}>%</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>혈압</Text>
                  <View style={styles.statusValueContainer}>
                    <Text style={styles.statusValue}>120/80</Text>
                    <Text style={styles.statusUnit}>mmHg</Text>
                  </View>
                </View>
                
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>체온</Text>
                  <View style={styles.statusValueContainer}>
                    <Text style={styles.statusValue}>36.5</Text>
                    <Text style={styles.statusUnit}>°C</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.updateTime}>최근 업데이트: 1분 전</Text>
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
                
                <Text style={styles.bpmText}>72 BPM</Text>
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
            {/* 위험도 분석 내용 */}
          </View>
        )}
        
        {activeTab === 'history' && (
          <View style={styles.historyContent}>
            <Text style={styles.contentTitle}>측정 기록</Text>
            {/* 측정 기록 내용 */}
          </View>
        )}
        
        {activeTab === 'ai' && (
          <View style={styles.aiContent}>
            <Text style={styles.contentTitle}>AI 분석</Text>
            {/* AI 분석 내용 */}
          </View>
        )}
      </ScrollView>
    </View>
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
});

export default HeartDiagnosisScreen;