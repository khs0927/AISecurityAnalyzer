import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useSmartWatch } from '../contexts/SmartWatchContext';

const { width } = Dimensions.get('window');

const HealthDataScreen = () => {
  const { data, isConnected, deviceInfo } = useSmartWatch();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');
  const [selectedMetric, setSelectedMetric] = useState<'heartRate' | 'oxygen' | 'ecg'>('heartRate');
  
  // 데모 데이터 - 실제로는 API에서 가져오거나 저장된 데이터를 사용해야 함
  const [heartRateData, setHeartRateData] = useState({
    day: {
      labels: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      datasets: [{ data: [65, 72, 78, 75, 68, 73] }]
    },
    week: {
      labels: ['월', '화', '수', '목', '금', '토', '일'],
      datasets: [{ data: [70, 68, 75, 72, 74, 69, 71] }]
    },
    month: {
      labels: ['1주', '2주', '3주', '4주'],
      datasets: [{ data: [72, 70, 73, 71] }]
    }
  });
  
  const [oxygenData, setOxygenData] = useState({
    day: {
      labels: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      datasets: [{ data: [97, 98, 97, 98, 99, 98] }]
    },
    week: {
      labels: ['월', '화', '수', '목', '금', '토', '일'],
      datasets: [{ data: [98, 97, 98, 98, 99, 97, 98] }]
    },
    month: {
      labels: ['1주', '2주', '3주', '4주'],
      datasets: [{ data: [98, 97, 98, 98] }]
    }
  });
  
  const [ecgData, setEcgData] = useState({
    day: {
      labels: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      datasets: [{ data: [0.5, 1.2, 0.8, 1.0, 0.7, 0.9] }]
    },
    week: {
      labels: ['월', '화', '수', '목', '금', '토', '일'],
      datasets: [{ data: [0.8, 0.9, 1.0, 0.7, 0.8, 0.9, 1.1] }]
    },
    month: {
      labels: ['1주', '2주', '3주', '4주'],
      datasets: [{ data: [0.9, 0.8, 0.9, 0.8] }]
    }
  });
  
  const onRefresh = async () => {
    setRefreshing(true);
    // 여기서 실제로 API 호출을 통해 데이터를 가져와야 함
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };
  
  const getActiveData = () => {
    switch (selectedMetric) {
      case 'heartRate':
        return heartRateData[activeTab];
      case 'oxygen':
        return oxygenData[activeTab];
      case 'ecg':
        return ecgData[activeTab];
      default:
        return heartRateData[activeTab];
    }
  };
  
  const getChartColor = () => {
    switch (selectedMetric) {
      case 'heartRate':
        return '#FF0000';
      case 'oxygen':
        return '#007AFF';
      case 'ecg':
        return '#FF9500';
      default:
        return '#FF0000';
    }
  };
  
  const getYAxisSuffix = () => {
    switch (selectedMetric) {
      case 'heartRate':
        return ' bpm';
      case 'oxygen':
        return '%';
      case 'ecg':
        return ' mV';
      default:
        return '';
    }
  };
  
  const getYAxisLabel = () => {
    switch (selectedMetric) {
      case 'heartRate':
        return '심박수';
      case 'oxygen':
        return '산소포화도';
      case 'ecg':
        return 'ECG';
      default:
        return '';
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
        <Text style={styles.title}>건강 데이터</Text>
        <Text style={styles.subtitle}>지속적인 모니터링을 통한 건강 관리</Text>
      </View>
      
      {!isConnected && (
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={24} color="#FFCC00" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>스마트워치가 연결되지 않았습니다</Text>
            <Text style={styles.warningMessage}>
              실시간 건강 데이터를 보려면 스마트워치를 연결하세요.
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.metricSelectorContainer}>
        <TouchableOpacity 
          style={[
            styles.metricButton, 
            selectedMetric === 'heartRate' && styles.activeMetricButton
          ]}
          onPress={() => setSelectedMetric('heartRate')}
        >
          <Ionicons 
            name="heart" 
            size={20} 
            color={selectedMetric === 'heartRate' ? '#fff' : '#FF0000'} 
          />
          <Text 
            style={[
              styles.metricButtonText, 
              selectedMetric === 'heartRate' && styles.activeMetricButtonText
            ]}
          >
            심박수
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.metricButton, 
            selectedMetric === 'oxygen' && styles.activeMetricButton,
            selectedMetric === 'oxygen' && { backgroundColor: '#007AFF' }
          ]}
          onPress={() => setSelectedMetric('oxygen')}
        >
          <Ionicons 
            name="water" 
            size={20} 
            color={selectedMetric === 'oxygen' ? '#fff' : '#007AFF'} 
          />
          <Text 
            style={[
              styles.metricButtonText, 
              selectedMetric === 'oxygen' && styles.activeMetricButtonText
            ]}
          >
            산소포화도
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.metricButton, 
            selectedMetric === 'ecg' && styles.activeMetricButton,
            selectedMetric === 'ecg' && { backgroundColor: '#FF9500' }
          ]}
          onPress={() => setSelectedMetric('ecg')}
        >
          <Ionicons 
            name="pulse" 
            size={20} 
            color={selectedMetric === 'ecg' ? '#fff' : '#FF9500'} 
          />
          <Text 
            style={[
              styles.metricButtonText, 
              selectedMetric === 'ecg' && styles.activeMetricButtonText
            ]}
          >
            ECG
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.currentValueCard}>
        <View style={styles.valueHeader}>
          <Ionicons 
            name={
              selectedMetric === 'heartRate' ? "heart" : 
              selectedMetric === 'oxygen' ? "water" : "pulse"
            } 
            size={24} 
            color={getChartColor()} 
          />
          <Text style={styles.valueTitle}>
            {getYAxisLabel()} 현재 값
          </Text>
        </View>
        
        <View style={styles.valueContent}>
          <Text style={[styles.currentValue, { color: getChartColor() }]}>
            {selectedMetric === 'heartRate' && data.heartRate ? data.heartRate : 
             selectedMetric === 'oxygen' && data.oxygenLevel ? data.oxygenLevel : 
             selectedMetric === 'ecg' && data.ecgData && data.ecgData.length > 0 ? data.ecgData[data.ecgData.length - 1] : 
             '--'}
          </Text>
          <Text style={styles.valueSuffix}>
            {selectedMetric === 'heartRate' ? 'bpm' : 
             selectedMetric === 'oxygen' ? '%' : 
             'mV'}
          </Text>
        </View>
        
        <Text style={styles.lastUpdated}>
          {data.lastUpdated ? 
            `마지막 업데이트: ${new Date(data.lastUpdated).toLocaleTimeString()}` : 
            '데이터가 없습니다'}
        </Text>
      </View>
      
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{getYAxisLabel()} 추이</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'day' && styles.activeTabButton]}
              onPress={() => setActiveTab('day')}
            >
              <Text style={[styles.tabText, activeTab === 'day' && styles.activeTabText]}>일간</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'week' && styles.activeTabButton]}
              onPress={() => setActiveTab('week')}
            >
              <Text style={[styles.tabText, activeTab === 'week' && styles.activeTabText]}>주간</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'month' && styles.activeTabButton]}
              onPress={() => setActiveTab('month')}
            >
              <Text style={[styles.tabText, activeTab === 'month' && styles.activeTabText]}>월간</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <LineChart
          data={getActiveData()}
          width={width - 40}
          height={220}
          yAxisSuffix={getYAxisSuffix()}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: selectedMetric === 'oxygen' ? 0 : 1,
            color: (opacity = 1) => `rgba(${
              selectedMetric === 'heartRate' ? '255, 0, 0' : 
              selectedMetric === 'oxygen' ? '0, 122, 255' : 
              '255, 149, 0'
            }, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: getChartColor()
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>
      
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>통계 요약</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>평균</Text>
            <Text style={[styles.statValue, { color: getChartColor() }]}>
              {selectedMetric === 'heartRate' ? '72' : 
               selectedMetric === 'oxygen' ? '98' : 
               '0.9'}
              {getYAxisSuffix()}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>최소</Text>
            <Text style={[styles.statValue, { color: getChartColor() }]}>
              {selectedMetric === 'heartRate' ? '65' : 
               selectedMetric === 'oxygen' ? '97' : 
               '0.5'}
              {getYAxisSuffix()}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>최대</Text>
            <Text style={[styles.statValue, { color: getChartColor() }]}>
              {selectedMetric === 'heartRate' ? '78' : 
               selectedMetric === 'oxygen' ? '99' : 
               '1.2'}
              {getYAxisSuffix()}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={22} color="#007AFF" />
          <Text style={styles.infoTitle}>알아두세요</Text>
        </View>
        <Text style={styles.infoContent}>
          {selectedMetric === 'heartRate' ? 
            '정상 심박수는 성인의 경우 일반적으로 60-100 bpm 사이입니다. 운동, 스트레스, 질병 등에 따라 변할 수 있습니다.' : 
            selectedMetric === 'oxygen' ? 
            '정상 산소포화도는 95% 이상입니다. 90% 이하일 경우 의사와 상담하세요.' : 
            'ECG(심전도)는 심장 활동의 전기적 신호를 측정합니다. 이상한 패턴이 지속되면 의사와 상담하세요.'}
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
  warningCard: {
    backgroundColor: '#FFF9E6',
    margin: 10,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  warningTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E6A700',
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 14,
    color: '#7A6020',
  },
  metricSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 10,
    marginBottom: 5,
  },
  metricButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 5,
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeMetricButton: {
    backgroundColor: '#FF0000',
  },
  metricButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
    color: '#151515',
  },
  activeMetricButtonText: {
    color: '#fff',
  },
  currentValueCard: {
    backgroundColor: '#fff',
    margin: 10,
    marginTop: 5,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  valueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#151515',
    marginLeft: 8,
  },
  valueContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  currentValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  valueSuffix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginLeft: 5,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#151515',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    padding: 2,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#151515',
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#151515',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#EAF5FF',
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
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0070C9',
    marginLeft: 8,
  },
  infoContent: {
    fontSize: 14,
    color: '#1A5086',
    lineHeight: 20,
  },
});

export default HealthDataScreen; 