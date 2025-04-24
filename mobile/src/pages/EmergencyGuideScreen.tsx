import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// 응급 상황 데이터
const emergencySituations = [
  {
    id: '1',
    title: '심정지',
    icon: 'heart-dislike',
    color: '#FF6D94',
    description: '심장박동이 멈추거나 불규칙적인 경우',
    steps: [
      '환자의 반응 확인',
      '119 신고',
      '가슴압박 30회 시행',
      '인공호흡 2회 시행',
      '반복'
    ]
  },
  {
    id: '2',
    title: '심장마비',
    icon: 'heart',
    color: '#FF5252',
    description: '급작스러운 가슴 통증과 호흡곤란이 있는 경우',
    steps: [
      '편안한 자세로 앉거나 눕힘',
      '꽉 끼는 옷 풀어줌',
      '119 신고',
      '아스피린 복용 (금기사항 없을 시)',
      'AED 사용 준비'
    ]
  },
  {
    id: '3',
    title: '뇌졸중',
    icon: 'body',
    color: '#7C4DFF',
    description: '갑작스러운 언어장애, 한쪽 마비 증상이 있는 경우',
    steps: [
      'FAST 테스트 실시 (얼굴, 팔, 말, 시간)',
      '편안한 자세로 눕힘',
      '119 신고',
      '의식 및 호흡 지속 관찰',
      '음식물 제공 금지'
    ]
  },
  {
    id: '4',
    title: '호흡곤란',
    icon: 'medkit',
    color: '#42A5F5',
    description: '숨을 쉬기 어려워하는 경우',
    steps: [
      '편안한 자세로 앉힘',
      '꽉 끼는 옷 풀어줌',
      '창문 열어 환기',
      '천식 환자라면 구급약 사용',
      '증상 악화 시 119 신고'
    ]
  },
  {
    id: '5',
    title: '낙상사고',
    icon: 'fitness',
    color: '#FFA726',
    description: '넘어지거나 떨어져서 부상을 입은 경우',
    steps: [
      '추가 부상 방지를 위해 환자 움직임 최소화',
      '출혈 시 직접 압박',
      '골절 의심 시 부목 고정',
      '증상 악화 시 119 신고',
      '환자 상태 지속 관찰'
    ]
  },
  {
    id: '6',
    title: '심한 출혈',
    icon: 'water',
    color: '#EF5350',
    description: '심한 출혈이 있는 경우',
    steps: [
      '깨끗한 천으로 상처 직접 압박',
      '환자를 눕히고 다리를 높게',
      '지혈점 압박',
      '119 신고',
      '쇼크 증상 관찰'
    ]
  },
];

const EmergencyGuideScreen = () => {
  const navigation = useNavigation();
  
  const renderSituationItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.situationCard, { borderLeftColor: item.color }]}
      onPress={() => navigation.navigate('EmergencyGuideDetail', { situation: item })}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={24} color="#fff" />
      </View>
      <View style={styles.situationInfo}>
        <Text style={styles.situationTitle}>{item.title}</Text>
        <Text style={styles.situationDescription}>{item.description}</Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepCount}>{item.steps.length}단계</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </View>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>응급처치</Text>
        <TouchableOpacity>
          <Ionicons name="search-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* 비상 연락 버튼 */}
      <TouchableOpacity 
        style={styles.emergencyCallButton}
        onPress={() => navigation.navigate('비상연락')}
      >
        <View style={styles.emergencyIconContainer}>
          <Ionicons name="call" size={20} color="#fff" />
        </View>
        <View style={styles.emergencyTextContainer}>
          <Text style={styles.emergencyTitle}>긴급 상황 시</Text>
          <Text style={styles.emergencyDescription}>119로 바로 연락하세요</Text>
        </View>
        <View style={styles.emergencyActionContainer}>
          <Ionicons name="call" size={16} color="#fff" style={{marginRight: 4}} />
          <Text style={styles.callText}>119</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </View>
      </TouchableOpacity>
      
      {/* 가이드 설명 제거됨 */}
      
      {/* 상황 목록 */}
      <FlatList
        data={emergencySituations}
        renderItem={renderSituationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      {/* AI 도우미 안내 */}
      <TouchableOpacity style={styles.aiHelpButton}>
        <View style={styles.aiIconContainer}>
          <Ionicons name="chatbubbles" size={20} color="#fff" />
        </View>
        <Text style={styles.aiHelpText}>AI 응급 상담 시작하기</Text>
      </TouchableOpacity>
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
  emergencyCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6D94',
    margin: 20,
    borderRadius: 20,
    padding: 15,
  },
  emergencyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emergencyTextContainer: {
    flex: 1,
  },
  emergencyTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emergencyDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  emergencyActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  callText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 5,
  },
  guideDescription: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  guideText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  situationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  situationInfo: {
    flex: 1,
  },
  situationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  situationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCount: {
    fontSize: 12,
    color: '#999',
    marginRight: 5,
  },
  aiHelpButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0088FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  aiIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  aiHelpText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default EmergencyGuideScreen;