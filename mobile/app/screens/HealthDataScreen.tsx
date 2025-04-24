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
  Switch,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useSmartWatch } from '../contexts/SmartWatchContext';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';
import TimeAgo from '../components/TimeAgo';

const { width } = Dimensions.get('window');

const HealthDataScreen = () => {
  const { 
    isConnected, 
    currentData, 
    historicalData, 
    refreshData, 
    riskData, 
    riskHistory,
    isRiskAnalysisActive,
    toggleRiskAnalysis
  } = useSmartWatch();
  
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');
  const [selectedMetric, setSelectedMetric] = useState<'heartRate' | 'oxygen' | 'ecg'>('heartRate');
  const [showRiskHistory, setShowRiskHistory] = useState(false);
  
  // 초기 데이터 로드
  useEffect(() => {
    onRefresh();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };
  
  const getActiveData = () => {
    if (!historicalData) return null;
    
    const period = historicalData[activeTab] || [];
    if (period.length === 0) return null;
    
    // 각 기간에 맞게 데이터 형식화
    let labels: string[] = [];
    let data: number[] = [];
    
    switch (activeTab) {
      case 'day':
        // 하루 데이터는 시간별로 표시
        labels = period.map(item => {
          const date = new Date(item.timestamp);
          return `${date.getHours()}:00`;
        });
        break;
      case 'week':
        // 주간 데이터는 요일로 표시
        labels = ['월', '화', '수', '목', '금', '토', '일'];
        break;
      case 'month':
        // 월간 데이터는 주차로 표시
        labels = ['1주', '2주', '3주', '4주'];
        break;
    }
    
    // 선택된 지표에 따라 데이터 추출
    data = period.map(item => {
      switch (selectedMetric) {
        case 'heartRate':
          return item.heartRate;
        case 'oxygen':
          return item.oxygenLevel;
        case 'ecg':
          // ECG는 첫 번째 값만 사용 (실제로는 복잡한 데이터 처리 필요)
          return item.ecgData && item.ecgData.length > 0 ? item.ecgData[0] : 0;
        default:
          return 0;
      }
    });
    
    return {
      labels,
      datasets: [{ data }]
    };
  };
  
  const getChartColor = () => {
    switch (selectedMetric) {
      case 'heartRate':
        return colors.heartRate || '#FF0000';
      case 'oxygen':
        return colors.oxygen || '#007AFF';
      case 'ecg':
        return colors.ecg || '#FF9500';
      default:
        return colors.primary || '#FF0000';
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
  
  const getCurrentValue = () => {
    if (!currentData) return '--';
    
    switch (selectedMetric) {
      case 'heartRate':
        return `${currentData.heartRate} bpm`;
      case 'oxygen':
        return `${currentData.oxygenLevel}%`;
      case 'ecg':
        return currentData.ecgData && currentData.ecgData.length > 0
          ? `${currentData.ecgData[0].toFixed(2)} mV`
          : '--';
      default:
        return '--';
    }
  };
  
  const getStatistics = () => {
    if (!historicalData || !historicalData[activeTab] || historicalData[activeTab].length === 0) {
      return { avg: '--', min: '--', max: '--' };
    }
    
    const data = historicalData[activeTab].map(item => {
      switch (selectedMetric) {
        case 'heartRate':
          return item.heartRate;
        case 'oxygen':
          return item.oxygenLevel;
        case 'ecg':
          return item.ecgData && item.ecgData.length > 0 ? item.ecgData[0] : 0;
        default:
          return 0;
      }
    });
    
    if (data.length === 0) return { avg: '--', min: '--', max: '--' };
    
    const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    // 지표에 따라 다른 소수점 처리
    switch (selectedMetric) {
      case 'heartRate':
        return {
          avg: avg.toFixed(0),
          min: min.toFixed(0),
          max: max.toFixed(0)
        };
      case 'oxygen':
        return {
          avg: avg.toFixed(1),
          min: min.toFixed(1),
          max: max.toFixed(1)
        };
      case 'ecg':
        return {
          avg: avg.toFixed(2),
          min: min.toFixed(2),
          max: max.toFixed(2)
        };
      default:
        return {
          avg: avg.toFixed(1),
          min: min.toFixed(1),
          max: max.toFixed(1)
        };
    }
  };

  // 차트 구성
  const chartConfig = {
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    color: (opacity = 1) => {
      const chartColor = getChartColor();
      // 헥스 색상을 RGB로 변환
      const r = parseInt(chartColor.slice(1, 3), 16);
      const g = parseInt(chartColor.slice(3, 5), 16);
      const b = parseInt(chartColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForLabels: {
      fontSize: 10,
      fill: colors.text,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
    },
    style: {
      borderRadius: 16
    }
  };
  
  // 위험도 색상 결정
  const getRiskColor = (score: number) => {
    if (score >= 8) return '#FF3B30'; // 높은 위험
    if (score >= 5) return '#FF9500'; // 중간 위험
    if (score >= 3) return '#FFCC00'; // 낮은 위험
    return '#34C759'; // 정상
  };
  
  // 위험도 레벨 텍스트
  const getRiskLevelText = (score: number) => {
    if (score >= 8) return '높은 위험';
    if (score >= 5) return '중간 위험';
    if (score >= 3) return '낮은 위험';
    return '정상';
  };

  const renderRiskHistory = () => {
    if (!showRiskHistory) return null;
    
    return (
      <Card style={styles.riskHistoryCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>위험 분석 기록</Text>
        
        {riskHistory && riskHistory.length > 0 ? (
          <FlatList
            data={riskHistory}
            keyExtractor={(item) => item.timestamp.toString()}
            renderItem={({ item }) => (
              <View style={styles.riskHistoryItem}>
                <View style={styles.riskHistoryHeader}>
                  <View style={[
                    styles.riskLevelBadge, 
                    { backgroundColor: getRiskColor(item.riskScore) }
                  ]}>
                    <Text style={styles.riskLevelText}>
                      {getRiskLevelText(item.riskScore)}
                    </Text>
                  </View>
                  <TimeAgo timestamp={item.timestamp} style={styles.riskTime} />
                </View>
                
                <Text style={[styles.riskScore, { color: colors.text }]}>
                  위험 점수: {item.riskScore.toFixed(1)}/10
                </Text>
                
                {item.explanation && item.explanation.length > 0 && (
                  <View style={styles.riskExplanation}>
                    <Text style={[styles.riskExplanationTitle, { color: colors.text }]}>
                      분석 결과:
                    </Text>
                    {item.explanation.map((text, index) => (
                      <Text 
                        key={index} 
                        style={[styles.riskExplanationText, { color: colors.textSecondary }]}
                      >
                        • {text}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
            style={styles.riskHistoryList}
            contentContainerStyle={styles.riskHistoryContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            위험 분석 기록이 없습니다
          </Text>
        )}
      </Card>
    );
  };
  
  const chartData = getActiveData();
  const stats = getStatistics();
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>건강 데이터</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          지속적인 모니터링을 통한 건강 관리
        </Text>
      </View>
      
      {!isConnected && (
        <Card style={styles.warningCard}>
          <Ionicons name="warning-outline" size={24} color="#FFCC00" />
          <View style={styles.warningTextContainer}>
            <Text style={[styles.warningTitle, { color: colors.text }]}>
              스마트워치가 연결되지 않았습니다
            </Text>
            <Text style={[styles.warningMessage, { color: colors.textSecondary }]}>
              실시간 건강 데이터를 보려면 스마트워치를 연결하세요.
            </Text>
          </View>
        </Card>
      )}
      
      {/* 지표 선택 버튼 */}
      <View style={styles.metricSelector}>
        <TouchableOpacity
          style={[
            styles.metricButton,
            selectedMetric === 'heartRate' && styles.metricButtonSelected,
            selectedMetric === 'heartRate' && { borderColor: colors.heartRate }
          ]}
          onPress={() => setSelectedMetric('heartRate')}
        >
          <Ionicons
            name="heart"
            size={24}
            color={selectedMetric === 'heartRate' ? colors.heartRate : colors.textSecondary}
          />
          <Text
            style={[
              styles.metricButtonText,
              selectedMetric === 'heartRate' && styles.metricButtonTextSelected,
              selectedMetric === 'heartRate' && { color: colors.heartRate }
            ]}
          >
            심박수
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.metricButton,
            selectedMetric === 'oxygen' && styles.metricButtonSelected,
            selectedMetric === 'oxygen' && { borderColor: colors.oxygen }
          ]}
          onPress={() => setSelectedMetric('oxygen')}
        >
          <Ionicons
            name="water"
            size={24}
            color={selectedMetric === 'oxygen' ? colors.oxygen : colors.textSecondary}
          />
          <Text
            style={[
              styles.metricButtonText,
              selectedMetric === 'oxygen' && styles.metricButtonTextSelected,
              selectedMetric === 'oxygen' && { color: colors.oxygen }
            ]}
          >
            산소포화도
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.metricButton,
            selectedMetric === 'ecg' && styles.metricButtonSelected,
            selectedMetric === 'ecg' && { borderColor: colors.ecg }
          ]}
          onPress={() => setSelectedMetric('ecg')}
        >
          <Ionicons
            name="pulse"
            size={24}
            color={selectedMetric === 'ecg' ? colors.ecg : colors.textSecondary}
          />
          <Text
            style={[
              styles.metricButtonText,
              selectedMetric === 'ecg' && styles.metricButtonTextSelected,
              selectedMetric === 'ecg' && { color: colors.ecg }
            ]}
          >
            ECG
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* 현재 값 표시 */}
      <Card style={styles.currentValueCard}>
        <Text style={[styles.currentValueLabel, { color: colors.textSecondary }]}>
          현재 {getYAxisLabel()}
        </Text>
        <Text style={[styles.currentValue, { color: getChartColor() }]}>
          {getCurrentValue()}
        </Text>
        {currentData && (
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            마지막 업데이트: <TimeAgo timestamp={currentData.timestamp} inline />
          </Text>
        )}
      </Card>
      
      {/* 기간 선택 탭 */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'day' && styles.tabButtonActive,
            activeTab === 'day' && { borderColor: colors.primary }
          ]}
          onPress={() => setActiveTab('day')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'day' && styles.tabButtonTextActive,
              { color: activeTab === 'day' ? colors.primary : colors.textSecondary }
            ]}
          >
            하루
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'week' && styles.tabButtonActive,
            activeTab === 'week' && { borderColor: colors.primary }
          ]}
          onPress={() => setActiveTab('week')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'week' && styles.tabButtonTextActive,
              { color: activeTab === 'week' ? colors.primary : colors.textSecondary }
            ]}
          >
            주간
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'month' && styles.tabButtonActive,
            activeTab === 'month' && { borderColor: colors.primary }
          ]}
          onPress={() => setActiveTab('month')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'month' && styles.tabButtonTextActive,
              { color: activeTab === 'month' ? colors.primary : colors.textSecondary }
            ]}
          >
            월간
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* 차트 */}
      <Card style={styles.chartCard}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          {getYAxisLabel()} 추세
        </Text>
        
        {chartData ? (
          <LineChart
            data={chartData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            yAxisSuffix={getYAxisSuffix()}
            yAxisLabel=""
            withDots
            withShadow={false}
            withVerticalLines={false}
            withHorizontalLines
            fromZero={selectedMetric === 'ecg'}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="analytics-outline" size={50} color={colors.textSecondary} />
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              데이터가 없습니다
            </Text>
          </View>
        )}
      </Card>
      
      {/* 통계 요약 */}
      <Card style={styles.statsCard}>
        <Text style={[styles.statsTitle, { color: colors.text }]}>
          {activeTab === 'day' ? '오늘' : activeTab === 'week' ? '이번 주' : '이번 달'} 통계
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>평균</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.avg}{getYAxisSuffix()}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>최소</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.min}{getYAxisSuffix()}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>최대</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.max}{getYAxisSuffix()}
            </Text>
          </View>
        </View>
      </Card>
      
      {/* 위험도 분석 */}
      <Card style={styles.riskCard}>
        <View style={styles.riskHeaderContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>위험도 분석</Text>
          <View style={styles.riskToggleContainer}>
            <Text style={[styles.riskToggleLabel, { color: colors.textSecondary }]}>
              {isRiskAnalysisActive ? '활성화됨' : '비활성화됨'}
            </Text>
            <Switch
              value={isRiskAnalysisActive}
              onValueChange={toggleRiskAnalysis}
              trackColor={{ false: colors.inactiveSwitch, true: colors.activeSwitch }}
              thumbColor={isRiskAnalysisActive ? colors.primary : colors.inactiveSwitchThumb}
              ios_backgroundColor={colors.inactiveSwitch}
            />
          </View>
        </View>
        
        {isRiskAnalysisActive ? (
          riskData ? (
            <View style={styles.riskDataContainer}>
              <View style={styles.riskScoreContainer}>
                <View 
                  style={[
                    styles.riskScoreCircle, 
                    { borderColor: getRiskColor(riskData.riskScore) }
                  ]}
                >
                  <Text 
                    style={[
                      styles.riskScoreText, 
                      { color: getRiskColor(riskData.riskScore) }
                    ]}
                  >
                    {riskData.riskScore.toFixed(1)}
                  </Text>
                </View>
                <Text style={[styles.riskScoreLabel, { color: colors.text }]}>
                  {getRiskLevelText(riskData.riskScore)}
                </Text>
                <Text style={[styles.riskUpdateTime, { color: colors.textSecondary }]}>
                  <TimeAgo timestamp={riskData.timestamp} inline />
                </Text>
              </View>
              
              {riskData.explanation && riskData.explanation.length > 0 && (
                <View style={styles.riskInfo}>
                  <Text style={[styles.riskInfoTitle, { color: colors.text }]}>
                    분석 결과:
                  </Text>
                  {riskData.explanation.map((text, index) => (
                    <Text 
                      key={`explanation-${index}`} 
                      style={[styles.riskInfoText, { color: colors.textSecondary }]}
                    >
                      • {text}
                    </Text>
                  ))}
                </View>
              )}
              
              {riskData.recommendations && riskData.recommendations.length > 0 && (
                <View style={styles.riskInfo}>
                  <Text style={[styles.riskInfoTitle, { color: colors.text }]}>
                    권장 사항:
                  </Text>
                  {riskData.recommendations.map((text, index) => (
                    <Text 
                      key={`recommendation-${index}`} 
                      style={[styles.riskInfoText, { color: colors.textSecondary }]}
                    >
                      • {text}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noRiskDataContainer}>
              <Ionicons name="pulse-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.noRiskDataText, { color: colors.textSecondary }]}>
                위험도 분석 데이터가 없습니다
              </Text>
            </View>
          )
        ) : (
          <View style={styles.riskDisabledContainer}>
            <Ionicons name="information-circle-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.riskDisabledText, { color: colors.textSecondary }]}>
              위험도 분석이 비활성화되어 있습니다
            </Text>
            <Text style={[styles.riskDisabledSubtext, { color: colors.textTertiary }]}>
              실시간 건강 위험도 모니터링을 위해 활성화하세요
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => setShowRiskHistory(!showRiskHistory)}
        >
          <Text style={[styles.historyButtonText, { color: colors.primary }]}>
            {showRiskHistory ? '기록 숨기기' : '위험도 기록 보기'}
          </Text>
          <Ionicons 
            name={showRiskHistory ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </Card>
      
      {/* 위험도 기록 */}
      {renderRiskHistory()}
      
      {/* 정보 카드 */}
      <Card style={styles.infoCard}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          건강 데이터 가이드
        </Text>
        
        <View style={styles.infoSection}>
          <Text style={[styles.infoSectionTitle, { color: colors.text }]}>
            심박수
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            정상 심박수는 일반적으로 60-100 bpm 사이입니다. 운동, 스트레스, 수면 등에 따라 변할 수 있습니다.
          </Text>
        </View>
        
        <View style={styles.infoSection}>
          <Text style={[styles.infoSectionTitle, { color: colors.text }]}>
            산소포화도
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            건강한 성인의 정상 산소포화도는 95-100% 사이입니다. 90% 이하는 의학적 관심이 필요할 수 있습니다.
          </Text>
        </View>
        
        <View style={styles.infoSection}>
          <Text style={[styles.infoSectionTitle, { color: colors.text }]}>
            ECG (심전도)
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            ECG는 심장의 전기적 활동을 측정합니다. 이 데이터는 심장 리듬 이상을 탐지하는 데 도움이 될 수 있습니다.
          </Text>
        </View>
        
        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
          주의: 이 앱은 의학적 기기가 아니며 전문적인 의료 진단을 대체할 수 없습니다.
          비정상적인 수치가 감지되면 의사와 상담하세요.
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  header: {
    padding: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  warningTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 14,
  },
  metricSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  metricButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: (width - 48) / 3,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  metricButtonSelected: {
    borderWidth: 2,
  },
  metricButtonText: {
    marginTop: 6,
    fontSize: 14,
  },
  metricButtonTextSelected: {
    fontWeight: 'bold',
  },
  currentValueCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  currentValueLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  currentValue: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
  },
  tabSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
  },
  tabButtonText: {
    fontSize: 16,
  },
  tabButtonTextActive: {
    fontWeight: 'bold',
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
    paddingRight: 16,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    marginTop: 12,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  riskCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  riskHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  riskToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskToggleLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  riskDataContainer: {
    marginBottom: 12,
  },
  riskScoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  riskScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskScoreText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  riskScoreLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riskUpdateTime: {
    fontSize: 12,
  },
  riskInfo: {
    marginTop: 16,
  },
  riskInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  riskInfoText: {
    fontSize: 14,
    marginBottom: 6,
  },
  noRiskDataContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noRiskDataText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  riskDisabledContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskDisabledText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  riskDisabledSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  riskHistoryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  riskHistoryList: {
    maxHeight: 400,
  },
  riskHistoryContent: {
    paddingVertical: 8,
  },
  riskHistoryItem: {
    paddingVertical: 12,
  },
  riskHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  riskLevelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskLevelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  riskTime: {
    fontSize: 12,
  },
  riskScore: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  riskExplanation: {
    marginTop: 8,
  },
  riskExplanationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  riskExplanationText: {
    fontSize: 14,
    marginBottom: 4,
  },
  separator: {
    height: 1,
    opacity: 0.2,
    backgroundColor: '#ccc',
    marginVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  }
});

export default HealthDataScreen; 