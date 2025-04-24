import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

// 임시 응급 처치 가이드 데이터
const EMERGENCY_GUIDES = {
  'cpr': {
    title: '심폐소생술 (CPR)',
    description: '심정지 환자에게 실시하는 기본 응급처치입니다. 신속한 조치가 생존율을 높일 수 있습니다.',
    steps: [
      {
        id: '1',
        title: '의식 확인',
        description: '환자의 어깨를 가볍게 두드리며 "괜찮으세요?"라고 물어보세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+1'
      },
      {
        id: '2',
        title: '도움 요청',
        description: '주변에 도움을 요청하고 119에 신고하세요. AED를 가져오도록 요청하세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+2'
      },
      {
        id: '3',
        title: '기도 확보',
        description: '환자의 머리를 젖히고 턱을 들어 기도를 확보하세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+3'
      },
      {
        id: '4',
        title: '호흡 확인',
        description: '10초 이내로 환자의 가슴 움직임을 보고 호흡을 확인하세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+4'
      },
      {
        id: '5',
        title: '흉부 압박',
        description: '양손을 겹쳐 가슴 중앙에 놓고 분당 100-120회 속도로 5-6cm 깊이로 압박하세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+5'
      },
      {
        id: '6',
        title: '인공호흡',
        description: '30회 압박 후 2회 인공호흡을 실시하세요. (인공호흡 훈련을 받았을 경우)',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+6'
      },
      {
        id: '7',
        title: '지속적인 반복',
        description: '구조대가 도착할 때까지 30:2 비율로 계속 반복하세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+7'
      }
    ],
    videoUrl: 'https://example.com/cpr_video.mp4'
  },
  'choking': {
    title: '기도폐쇄 (하임리히법)',
    description: '음식물 등으로 기도가 막혔을 때 실시하는 응급처치입니다.',
    steps: [
      {
        id: '1',
        title: '상태 확인',
        description: '"괜찮으세요? 숨을 쉴 수 없나요?"라고 물어보세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+1'
      },
      {
        id: '2',
        title: '자세 취하기',
        description: '환자의 뒤에 서서 양팔로 환자의 복부를 감싸세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+2'
      },
      {
        id: '3',
        title: '주먹 위치',
        description: '한 손으로 주먹을 쥐고 엄지를 배꼽과 명치 사이에 놓으세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+3'
      },
      {
        id: '4',
        title: '압박하기',
        description: '다른 손으로 주먹을 감싸고 빠르게 안쪽 위로 밀어올리세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+4'
      },
      {
        id: '5',
        title: '반복하기',
        description: '이물질이 나올 때까지 반복하세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+5'
      }
    ],
    videoUrl: 'https://example.com/choking_video.mp4'
  },
  'heart-attack': {
    title: '심장마비 대응',
    description: '심장마비 증상이 나타날 때 취해야 할 응급 조치입니다.',
    steps: [
      {
        id: '1',
        title: '증상 인식',
        description: '가슴 통증, 호흡곤란, 식은땀, 메스꺼움 등의 증상을 확인하세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+1'
      },
      {
        id: '2',
        title: '119 신고',
        description: '즉시 119에 신고하고 심장마비 증상임을 알리세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+2'
      },
      {
        id: '3',
        title: '앉혀두기',
        description: '환자를 편안한 자세로 앉히고 좁은 옷은 느슨하게 해주세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+3'
      },
      {
        id: '4',
        title: '아스피린 제공',
        description: '의사의 지시가 없는 한, 성인용 아스피린을 씹어 먹도록 하세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+4'
      },
      {
        id: '5',
        title: '의식 확인',
        description: '환자의 의식이 없어지면 즉시 CPR을 시작하세요.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Step+5'
      }
    ],
    videoUrl: 'https://example.com/heart_attack_video.mp4'
  }
};

const EmergencyGuideDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // route.params에서 guideId를 가져오거나 기본값 사용
  const guideId = (route.params?.guideId || 'cpr') as string;
  const guide = EMERGENCY_GUIDES[guideId];
  
  // 다음 단계로 이동
  const goToNextStep = () => {
    if (currentStep < guide.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      scrollToStep(currentStep + 1);
    }
  };
  
  // 이전 단계로 이동
  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollToStep(currentStep - 1);
    }
  };
  
  // 특정 단계로 스크롤
  const scrollToStep = (stepIndex: number) => {
    if (scrollViewRef.current) {
      const { width } = Dimensions.get('window');
      scrollViewRef.current.scrollTo({ x: stepIndex * width, y: 0, animated: true });
    }
  };
  
  // 비디오 재생/정지 토글
  const togglePlayVideo = () => {
    setPlaying(!playing);
    // 실제로는 여기에 비디오 플레이어 제어 로직 추가
  };
  
  // 응급 전화 걸기
  const callEmergency = () => {
    // 실제로는 여기에 전화 걸기 로직 추가
    alert('119에 전화를 겁니다.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{guide.title}</Text>
        <TouchableOpacity style={styles.emergencyCallButton} onPress={callEmergency}>
          <Ionicons name="call" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.guideContainer}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{guide.description}</Text>
        </View>
        
        {/* 단계별 가이드 슬라이더 */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepIndicator}>
            단계 {currentStep + 1}/{guide.steps.length}
          </Text>
          
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const { width } = Dimensions.get('window');
              const newIndex = Math.floor(event.nativeEvent.contentOffset.x / width);
              setCurrentStep(newIndex);
            }}
            style={styles.stepsScrollView}
          >
            {guide.steps.map((step, index) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={styles.stepImageContainer}>
                  {loading && <ActivityIndicator size="large" color="#FF6D94" style={styles.loader} />}
                  <Image
                    source={{ uri: step.imageUrl }}
                    style={styles.stepImage}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                  />
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, currentStep === 0 && styles.disabledButton]}
              onPress={goToPrevStep}
              disabled={currentStep === 0}
            >
              <Ionicons name="chevron-back" size={24} color={currentStep === 0 ? "#ccc" : "#333"} />
              <Text style={[styles.navButtonText, currentStep === 0 && styles.disabledButtonText]}>이전</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navButton, currentStep === guide.steps.length - 1 && styles.disabledButton]}
              onPress={goToNextStep}
              disabled={currentStep === guide.steps.length - 1}
            >
              <Text style={[styles.navButtonText, currentStep === guide.steps.length - 1 && styles.disabledButtonText]}>다음</Text>
              <Ionicons name="chevron-forward" size={24} color={currentStep === guide.steps.length - 1 ? "#ccc" : "#333"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* 비디오 섹션 */}
      <View style={styles.videoSection}>
        <Text style={styles.videoTitle}>실시간 비디오 가이드</Text>
        <TouchableOpacity style={styles.videoContainer} onPress={togglePlayVideo}>
          <View style={styles.videoPlaceholder}>
            {playing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Ionicons name="play-circle" size={50} color="#fff" />
            )}
          </View>
          <Text style={styles.videoText}>
            {playing ? '비디오 재생 중...' : '비디오 가이드 보기'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* 하단 비상 버튼 */}
      <TouchableOpacity style={styles.emergencyButton} onPress={callEmergency}>
        <Ionicons name="call-outline" size={24} color="#fff" />
        <Text style={styles.emergencyButtonText}>119 응급 전화</Text>
      </TouchableOpacity>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emergencyCallButton: {
    backgroundColor: '#FF6D94',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideContainer: {
    flex: 1,
    padding: 20,
  },
  descriptionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  stepsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  stepsScrollView: {
    flex: 1,
  },
  stepItem: {
    width: width - 70, // Padding 고려
    justifyContent: 'center',
  },
  stepImageContainer: {
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  loader: {
    position: 'absolute',
  },
  stepImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  stepTextContainer: {
    marginBottom: 15,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  navButtonText: {
    fontSize: 16,
    color: '#333',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#ccc',
  },
  videoSection: {
    padding: 20,
    paddingTop: 0,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  videoContainer: {
    backgroundColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  emergencyButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6D94',
    padding: 15,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default EmergencyGuideDetailScreen;