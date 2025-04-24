import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const EmergencyGuideDetailScreen = ({ route, webAppData, refreshData, loading }) => {
  const navigation = useNavigation();
  const { situation } = route.params || {};
  const [activeStep, setActiveStep] = useState(0);
  
  // 단계별 설명 렌더링
  const renderSteps = () => {
    if (!situation || !situation.steps) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>응급 상황 정보를 불러올 수 없습니다.</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.stepsContainer}>
        {/* 현재 단계 표시 */}
        <View style={styles.stepIndicators}>
          {situation.steps.map((_, index) => (
            <TouchableOpacity 
              key={index}
              style={[
                styles.stepIndicator, 
                activeStep === index && styles.activeStepIndicator
              ]}
              onPress={() => setActiveStep(index)}
            >
              <Text 
                style={[
                  styles.stepIndicatorText, 
                  activeStep === index && styles.activeStepIndicatorText
                ]}
              >
                {index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* 현재 단계 내용 */}
        <View style={styles.currentStepContainer}>
          <Text style={styles.stepNumber}>단계 {activeStep + 1}/{situation.steps.length}</Text>
          <Text style={styles.stepDescription}>{situation.steps[activeStep]}</Text>
          
          {/* 단계별 이미지 (가상) */}
          <View style={styles.imageContainer}>
            <View style={styles.imagePlaceholder}>
              <Ionicons name={situation.icon} size={40} color={situation.color} />
              <Text style={styles.imagePlaceholderText}>안내 이미지</Text>
            </View>
          </View>
          
          {/* 음성 안내 버튼 */}
          <TouchableOpacity style={styles.voiceButton}>
            <Ionicons name="volume-high" size={20} color="#fff" />
            <Text style={styles.voiceButtonText}>음성 안내 듣기</Text>
          </TouchableOpacity>
        </View>
        
        {/* 이전/다음 단계 버튼 */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={[styles.navButton, activeStep === 0 && styles.disabledNavButton]}
            onPress={() => setActiveStep(prev => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
          >
            <Ionicons 
              name="chevron-back" 
              size={20} 
              color={activeStep === 0 ? "#999" : "#666"} 
            />
            <Text 
              style={[
                styles.navButtonText, 
                activeStep === 0 && styles.disabledNavButtonText
              ]}
            >
              이전
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.navButton, 
              activeStep === situation.steps.length - 1 && styles.disabledNavButton
            ]}
            onPress={() => setActiveStep(prev => Math.min(situation.steps.length - 1, prev + 1))}
            disabled={activeStep === situation.steps.length - 1}
          >
            <Text 
              style={[
                styles.navButtonText, 
                activeStep === situation.steps.length - 1 && styles.disabledNavButtonText
              ]}
            >
              다음
            </Text>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={activeStep === situation.steps.length - 1 ? "#999" : "#666"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {situation?.title || '응급 상황'}
          </Text>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {/* 응급 상황 타이틀 카드 */}
        <View 
          style={[
            styles.situationCard, 
            { backgroundColor: situation?.color || '#FF6D94' }
          ]}
        >
          <View style={styles.situationIcon}>
            <Ionicons 
              name={situation?.icon || "medkit"} 
              size={30} 
              color="#fff" 
            />
          </View>
          <View style={styles.situationInfo}>
            <Text style={styles.situationTitle}>
              {situation?.title || '응급 상황'}
            </Text>
            <Text style={styles.situationDescription}>
              {situation?.description || '응급 처치 가이드'}
            </Text>
          </View>
        </View>
        
        {/* 긴급 전화 버튼 */}
        <TouchableOpacity style={styles.emergencyCallButton}>
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={styles.emergencyCallText}>119 긴급 전화</Text>
        </TouchableOpacity>
        
        {/* 단계별 가이드 */}
        <ScrollView style={styles.content}>
          {renderSteps()}
          
          {/* 주의사항 카드 */}
          <View style={styles.cautionCard}>
            <View style={styles.cautionHeader}>
              <Ionicons name="alert-circle" size={20} color="#FF6D94" />
              <Text style={styles.cautionTitle}>주의사항</Text>
            </View>
            <Text style={styles.cautionText}>
              이 가이드는 응급 상황에서 참고용으로만 사용하세요.
              가능한 빨리 전문가의 도움을 받는 것이 중요합니다.
              119에 먼저 연락하는 것을 권장합니다.
            </Text>
          </View>
          
          {/* 추가 정보 */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>추가 정보</Text>
            <Text style={styles.infoText}>
              더 자세한 정보는 웹 애플리케이션에서 확인할 수 있습니다.
              웹 버전에서는 상세한 영상 가이드와 전문가의 조언을 제공합니다.
            </Text>
          </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  helpButton: {
    padding: 5,
  },
  situationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    margin: 15,
    borderRadius: 20,
  },
  situationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  situationInfo: {
    flex: 1,
  },
  situationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  situationDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  emergencyCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4D4D',
    paddingVertical: 10,
    marginHorizontal: 15,
    borderRadius: 20,
  },
  emergencyCallText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  stepsContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  activeStepIndicator: {
    backgroundColor: '#FF6D94',
  },
  stepIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  activeStepIndicatorText: {
    color: '#fff',
  },
  currentStepContainer: {
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
  },
  imageContainer: {
    width: '100%',
    marginBottom: 20,
  },
  imagePlaceholder: {
    height: 180,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0088FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 15,
  },
  voiceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  disabledNavButton: {
    backgroundColor: '#f0f0f0',
  },
  navButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 5,
  },
  disabledNavButtonText: {
    color: '#999',
  },
  cautionCard: {
    backgroundColor: '#FFF2F5',
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
  },
  cautionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cautionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6D94',
    marginLeft: 8,
  },
  cautionText: {
    fontSize: 14,
    color: '#FF6D94',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default EmergencyGuideDetailScreen;