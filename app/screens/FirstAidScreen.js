import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Linking,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// 응급처치 데이터
const firstAidData = [
  {
    id: '1',
    title: '심정지/심장마비',
    icon: 'heart-dislike',
    symptoms: [
      '가슴 통증 또는 압박감',
      '호흡 곤란',
      '의식 불명',
      '맥박 없음'
    ],
    steps: [
      '119에 즉시 신고하세요.',
      '환자를 평평한 곳에 눕히세요.',
      '의식과 호흡을 확인하세요.',
      '호흡이 없으면 즉시 가슴압박(CPR)을 시작하세요.',
      '가슴 중앙에 손을 겹쳐 놓고 분당 100-120회 속도로 5-6cm 깊이로 압박하세요.',
      '30회 압박 후 2회 인공호흡을 실시하세요. (인공호흡 훈련을 받지 않았다면 가슴압박만 계속하세요)',
      'AED(자동제세동기)가 있다면 사용하세요.',
      '응급 의료진이 도착할 때까지 계속하세요.'
    ],
    caution: '심정지는 생명을 위협하는 응급 상황입니다. 즉시 조치하지 않으면 뇌 손상이나 사망을 초래할 수 있습니다.'
  },
  {
    id: '2',
    title: '뇌졸중',
    icon: 'medkit',
    symptoms: [
      '한쪽 얼굴, 팔, 다리의 마비나 감각 상실',
      '말하기나 이해하기 어려움',
      '갑작스러운 심한 두통',
      '시력 장애',
      '균형 감각 상실이나 어지러움'
    ],
    steps: [
      'FAST 원칙으로 확인하세요: F(얼굴 처짐), A(팔 힘 약화), S(말하기 어려움), T(시간이 중요)',
      '즉시 119에 신고하세요.',
      '환자의 시간을 기록하세요. 증상이 언제 시작되었는지가 중요합니다.',
      '환자를 편안한 자세로 눕히고 안정을 취하게 하세요.',
      '의식이 있으면 고개를 약간 들어올린 자세로 유지하세요.',
      '음식이나 음료를 주지 마세요.',
      '호흡이 곤란하면 측면으로 눕히고 기도를 확보하세요.',
      '응급 의료진이 도착할 때까지 환자를 안심시키고 지속적으로 상태를 관찰하세요.'
    ],
    caution: '뇌졸중은 빠른 시간 내 치료가 중요합니다. 골든타임(3시간) 이내에 병원에 도착해야 효과적인 치료가 가능합니다.'
  },
  {
    id: '3',
    title: '심한 출혈',
    icon: 'water',
    symptoms: [
      '지속적인 출혈',
      '피부 창백함',
      '빠른 맥박',
      '현기증이나 어지러움',
      '발한(식은땀)'
    ],
    steps: [
      '깨끗한 천이나 거즈로 상처를 직접 압박하세요.',
      '상처를 심장보다 높게 들어올리세요(가능한 경우).',
      '압박을 최소 15분 동안 유지하세요.',
      '출혈이 멈추지 않으면 119에 신고하세요.',
      '압박 붕대를 사용할 수 있다면 상처 위에 단단히 감으세요.',
      '지혈대(토니켓)는 극단적인 상황에서만 사용하세요.',
      '환자가 쇼크 증상을 보이면 다리를 높게 유지하고 몸을 따뜻하게 하세요.'
    ],
    caution: '심한 출혈은 쇼크와 생명 위협으로 이어질 수 있습니다. 출혈이 멈추지 않으면 즉시 의료 도움을 구하세요.'
  },
  {
    id: '4',
    title: '호흡 곤란',
    icon: 'fitness',
    symptoms: [
      '숨쉬기 어려움',
      '가슴 압박감',
      '청색증(입술, 손톱)',
      '빠른 호흡',
      '불안과 공황'
    ],
    steps: [
      '환자를 앉은 자세로 유지하세요.',
      '옷을 느슨하게 하여 호흡을 편하게 하세요.',
      '창문을 열거나 선풍기로 공기 순환을 돕습니다.',
      '천식 환자라면 구급 흡입기를 사용하도록 도와주세요.',
      '호흡이 크게 개선되지 않으면 119에 신고하세요.',
      '호흡이 멈추면 즉시 심폐소생술(CPR)을 시작하세요.'
    ],
    caution: '호흡 곤란은 심각한 의학적 응급 상황일 수 있습니다. 특히 갑자기 발생하거나 심하면 즉시 의료 도움을 구하세요.'
  },
  {
    id: '5',
    title: '저혈당 응급상황',
    icon: 'pulse',
    symptoms: [
      '식은땀',
      '떨림, 현기증',
      '혼란, 두통',
      '불안정함',
      '의식 저하'
    ],
    steps: [
      '환자가 의식이 있으면 포도당 정제, 주스, 사탕 등 빠르게 흡수되는 당분을 제공하세요.',
      '15분 후에도 증상이 개선되지 않으면 당분을 다시 제공하세요.',
      '환자가 의식을 잃었다면 체크하고 119에 신고하세요.',
      '의식이 없는 환자에게는 음식이나 음료를 주지 마세요.',
      '당뇨병 환자라면 응급 글루카곤 키트가 있는지 확인하고 사용법을 아는 경우 사용하세요.',
      '환자가 회복되면 천천히 더 많은 탄수화물을 섭취하게 하세요.'
    ],
    caution: '저혈당은 특히 당뇨병 환자에게 위험할 수 있습니다. 증상이 빠르게 악화될 수 있으므로 즉시 대응해야 합니다.'
  }
];

const FirstAidScreen = () => {
  const navigation = useNavigation();
  const [expandedId, setExpandedId] = useState(null);
  const animatedHeights = useRef({}).current;
  
  // 애니메이션 객체 초기화
  firstAidData.forEach(item => {
    if (!animatedHeights[item.id]) {
      animatedHeights[item.id] = new Animated.Value(0);
    }
  });
  
  // 항목 확장/축소 토글
  const toggleExpand = (id) => {
    if (expandedId === id) {
      // 축소
      Animated.timing(animatedHeights[id], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false
      }).start();
      setExpandedId(null);
    } else {
      // 이전에 확장된 항목이 있으면 축소
      if (expandedId) {
        Animated.timing(animatedHeights[expandedId], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        }).start();
      }
      
      // 새 항목 확장
      Animated.timing(animatedHeights[id], {
        toValue: 1,
        duration: 300,
        useNativeDriver: false
      }).start();
      setExpandedId(id);
    }
  };
  
  // 응급 번호로 전화
  const callEmergency = () => {
    Alert.alert(
      '응급 전화',
      '119로 전화하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '전화하기', onPress: () => Linking.openURL('tel:119') }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>응급처치</Text>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={callEmergency}
          >
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.emergencyButtonText}>119</Text>
          </TouchableOpacity>
        </View>
        
        {/* 안내 배너 */}
        <View style={styles.banner}>
          <View style={styles.bannerIconContainer}>
            <Ionicons name="information-circle" size={28} color="#fff" />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>응급 상황 시 행동 요령</Text>
            <Text style={styles.bannerText}>
              침착하게 상황을 판단하고, 가능한 빨리 119에 연락하세요.
              전문가가 도착하기 전까지 아래 지침을 따라주세요.
            </Text>
          </View>
        </View>
        
        {/* 응급처치 목록 */}
        <ScrollView style={styles.scrollView}>
          {firstAidData.map((item) => (
            <View key={item.id} style={styles.firstAidItem}>
              <TouchableOpacity 
                style={styles.firstAidHeader}
                onPress={() => toggleExpand(item.id)}
              >
                <View style={styles.firstAidHeaderContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={item.icon} size={24} color="#fff" />
                  </View>
                  <Text style={styles.firstAidTitle}>{item.title}</Text>
                </View>
                <Ionicons 
                  name={expandedId === item.id ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#555" 
                />
              </TouchableOpacity>
              
              <Animated.View 
                style={[
                  styles.firstAidContent,
                  {
                    maxHeight: animatedHeights[item.id].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1000]
                    }),
                    opacity: animatedHeights[item.id]
                  }
                ]}
              >
                <View style={styles.symptomsSection}>
                  <Text style={styles.sectionTitle}>증상</Text>
                  {item.symptoms.map((symptom, index) => (
                    <View key={index} style={styles.symptomItem}>
                      <View style={styles.bulletPoint} />
                      <Text style={styles.symptomText}>{symptom}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.stepsSection}>
                  <Text style={styles.sectionTitle}>응급 처치 방법</Text>
                  {item.steps.map((step, index) => (
                    <View key={index} style={styles.stepItem}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.cautionSection}>
                  <Ionicons name="warning" size={20} color="#FF6D94" />
                  <Text style={styles.cautionText}>{item.caution}</Text>
                </View>
              </Animated.View>
            </View>
          ))}
          
          {/* 추가 정보 */}
          <View style={styles.additionalInfo}>
            <Text style={styles.additionalInfoTitle}>
              응급 처치는 전문적인 의료 도움이 올 때까지의 임시적인 조치입니다.
            </Text>
            <Text style={styles.additionalInfoText}>
              응급 처치 교육에 관심이 있으시면 대한적십자사나 지역 소방서의 
              응급처치 교육 프로그램에 참여해보세요.
            </Text>
            <TouchableOpacity 
              style={styles.learnMoreButton}
              onPress={() => Linking.openURL('https://www.redcross.or.kr/education/education_emergency.do')}
            >
              <Text style={styles.learnMoreButtonText}>자세히 알아보기</Text>
              <Ionicons name="open-outline" size={16} color="#FF6D94" />
            </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  emergencyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  bannerIconContainer: {
    marginRight: 10,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
  },
  firstAidItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  firstAidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  firstAidHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6D94',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  firstAidTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  firstAidContent: {
    overflow: 'hidden',
  },
  symptomsSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6D94',
    marginRight: 8,
  },
  symptomText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  stepsSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6D94',
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: 24,
    marginRight: 10,
    fontSize: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  cautionSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9F9',
    padding: 15,
  },
  cautionText: {
    fontSize: 13,
    color: '#FF4757',
    flex: 1,
    marginLeft: 8,
    lineHeight: 18,
  },
  additionalInfo: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginBottom: 30,
    borderRadius: 10,
  },
  additionalInfoTitle: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  additionalInfoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  learnMoreButtonText: {
    fontSize: 14,
    color: '#FF6D94',
    marginRight: 4,
  },
});

export default FirstAidScreen; 