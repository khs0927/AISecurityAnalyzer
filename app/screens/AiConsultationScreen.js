import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import aiService from '../api/aiService';
import healthDataProcessor from '../utils/healthDataProcessor';
import selfLearning from '../utils/selfLearning';

// 가상의 사전 정의된 대화 예시
const suggestedQuestions = [
  '오늘 심장이 두근거려요. 정상인가요?',
  '혈압이 높을 때 어떻게 해야 하나요?',
  '가슴 통증이 있을 때 무엇을 확인해야 하나요?',
  '심장 건강을 위한 운동 추천해주세요',
  '고혈압에 좋은 음식은 무엇인가요?',
  '심전도 결과를 어떻게 이해하나요?'
];

// 초기 메시지
const initialMessages = [
  {
    id: '1',
    sender: 'ai',
    text: '안녕하세요! 건강 관련 질문이 있으신가요? 어떻게 도와드릴까요?',
    timestamp: new Date().toISOString()
  }
];

const AiConsultationScreen = ({ webAppData, refreshData, loading }) => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true); // 네트워크 상태
  const [healthData, setHealthData] = useState(null); // 건강 데이터
  const scrollViewRef = useRef();
  
  // 네트워크 상태 체크
  useEffect(() => {
    const checkNetworkStatus = async () => {
      // 실제 구현에서는 네트워크 상태 확인
      // 현재는 항상 온라인으로 가정
      setIsOnline(true);
    };
    
    checkNetworkStatus();
    
    // 건강 데이터 불러오기 (예시)
    const loadHealthData = async () => {
      try {
        // 실제 구현에서는 디바이스나 서버에서 데이터 가져오기
        // 현재는 가상 데이터 사용
        setHealthData({
          heartRate: 72,
          oxygenLevel: 98,
          systolic: 120,
          diastolic: 80
        });
      } catch (error) {
        console.error('건강 데이터 로딩 오류:', error);
      }
    };
    
    loadHealthData();
  }, []);
  
  // 메시지 전송
  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    // 사용자 메시지 추가
    const userMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      let aiResponse;
      
      if (isOnline) {
        // 온라인 모드: API 호출
        const messageHistory = messages.map(msg => ({
          sender: msg.sender,
          content: msg.text
        }));
        
        const response = await aiService.sendMessage(
          text.trim(), 
          messageHistory,
          healthData
        );
        
        aiResponse = response.aiResponse || '죄송합니다. 응답을 받아오지 못했습니다.';
        
        // 자가 학습을 위한 상호작용 기록
        selfLearning.recordInteraction({
          query: text.trim(),
          response: aiResponse,
          healthData,
          wasHelpful: true // 기본값, 추후 사용자 피드백 추가 가능
        });
      } else {
        // 오프라인 모드: 로컬 응답 생성
        const offlineResponse = aiService.handleOfflineMessage(text);
        aiResponse = offlineResponse.aiResponse;
      }
      
      // AI 응답 메시지 추가
      const aiResponseMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiResponseMessage]);
    } catch (error) {
      console.error('AI 응답 오류:', error);
      
      // 오류 메시지 추가
      const errorMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: '죄송합니다. 응답을 받아오는 중 오류가 발생했습니다. 다시 시도해주세요.',
        isError: true,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // 사용자에게 오류 알림
      Alert.alert(
        '연결 오류',
        '서버 연결에 문제가 발생했습니다. 오프라인 모드로 전환하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '확인', onPress: () => setIsOnline(false) }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // 건강 데이터 분석 요청
  const analyzeHealthData = async () => {
    if (!healthData) {
      Alert.alert('알림', '분석할 건강 데이터가 없습니다.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isOnline) {
        // 온라인 모드: API 호출
        const response = await aiService.analyzeHealthData(healthData);
        
        if (response) {
          // 분석 결과 메시지 추가
          const analysisMessage = {
            id: String(Date.now()),
            sender: 'ai',
            text: `건강 데이터 분석 결과:\n- 심박수: ${healthData.heartRate || 'N/A'} bpm\n- 산소포화도: ${healthData.oxygenLevel || 'N/A'}%\n\n${response.analysis || response.aiResponse || '분석 결과를 가져오지 못했습니다.'}`,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => [...prev, analysisMessage]);
        }
      } else {
        // 오프라인 모드: 로컬 분석
        const analysis = healthDataProcessor.analyzeAllData(healthData);
        
        // 분석 결과 메시지 구성
        let analysisText = `건강 데이터 분석 결과:\n`;
        
        if (analysis.heartRate) {
          analysisText += `- 심박수(${healthData.heartRate}bpm): ${analysis.heartRate.message} - ${analysis.heartRate.details}\n`;
        }
        
        if (analysis.oxygenLevel) {
          analysisText += `- 산소포화도(${healthData.oxygenLevel}%): ${analysis.oxygenLevel.message} - ${analysis.oxygenLevel.details}\n`;
        }
        
        if (analysis.bloodPressure) {
          analysisText += `- 혈압(${healthData.systolic}/${healthData.diastolic}): ${analysis.bloodPressure.message} - ${analysis.bloodPressure.details}\n`;
        }
        
        analysisText += `\n전체 위험도: ${analysis.overallRisk.level} (${analysis.overallRisk.score}점)`;
        
        // 분석 결과 메시지 추가
        const analysisMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: analysisText,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, analysisMessage]);
      }
    } catch (error) {
      console.error('건강 데이터 분석 오류:', error);
      
      // 오류 메시지 추가
      const errorMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: '죄송합니다. 건강 데이터 분석 중 오류가 발생했습니다.',
        isError: true,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 메시지 렌더링
  const renderMessage = ({ item }) => (
    <View 
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessage : styles.aiMessage,
        item.isError && styles.errorMessage
      ]}
    >
      {item.sender === 'ai' && (
        <View style={styles.aiAvatar}>
          <Ionicons name="heart-circle" size={24} color="#FF6D94" />
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.aiBubble,
        item.isError && styles.errorBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.sender === 'user' ? styles.userText : styles.aiText,
          item.isError && styles.errorText
        ]}>
          {item.text}
        </Text>
      </View>
    </View>
  );
  
  // 메시지가 추가될 때마다 스크롤 자동 이동
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            AI 헬퍼 {isOnline ? '' : '(오프라인)'}
          </Text>
          <TouchableOpacity style={styles.infoButton} onPress={analyzeHealthData}>
            <Ionicons name="analytics-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {/* 연결 상태 표시 */}
        {!isOnline && (
          <View style={styles.offlineBar}>
            <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
            <Text style={styles.offlineText}>오프라인 모드 - 제한된 기능</Text>
          </View>
        )}
        
        {/* 건강 데이터 표시 */}
        {healthData && (
          <View style={styles.healthDataBar}>
            <View style={styles.healthDataItem}>
              <Ionicons name="heart-outline" size={16} color="#FF6D94" />
              <Text style={styles.healthDataText}>{healthData.heartRate || '--'}bpm</Text>
            </View>
            <View style={styles.healthDataItem}>
              <Ionicons name="water-outline" size={16} color="#6D9CFF" />
              <Text style={styles.healthDataText}>{healthData.oxygenLevel || '--'}%</Text>
            </View>
            <View style={styles.healthDataItem}>
              <Ionicons name="pulse-outline" size={16} color="#65C466" />
              <Text style={styles.healthDataText}>
                {healthData.systolic || '--'}/{healthData.diastolic || '--'}
              </Text>
            </View>
          </View>
        )}
        
        {/* 대화 내용 */}
        <FlatList
          ref={scrollViewRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesContainer}
        />
        
        {/* 추천 질문 */}
        {messages.length < 3 && (
          <View style={styles.suggestedContainer}>
            <Text style={styles.suggestedTitle}>질문 예시:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedQuestions}
            >
              {suggestedQuestions.map((question, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.suggestedQuestionItem}
                  onPress={() => sendMessage(question)}
                >
                  <Text style={styles.suggestedQuestionText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* 로딩 표시 */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FF6D94" />
            <Text style={styles.loadingText}>AI가 응답하는 중...</Text>
          </View>
        )}
        
        {/* 입력 영역 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="질문을 입력하세요..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.disabledSendButton]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={inputText.trim() ? "#fff" : "#ccc"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* 면책 조항 */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
            이 AI 상담은 의학적 조언을 대체할 수 없습니다. 긴급한 상황에서는 의사나 응급 서비스에 연락하세요.
          </Text>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoButton: {
    padding: 5,
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#FF6D94',
    borderBottomRightRadius: 5,
  },
  aiBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 5,
  },
  errorBubble: {
    backgroundColor: '#FFE5E5',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#333',
  },
  errorText: {
    color: '#D32F2F',
  },
  suggestedContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  suggestedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  suggestedQuestions: {
    paddingBottom: 5,
  },
  suggestedQuestionItem: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  suggestedQuestionText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6D94',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  disabledSendButton: {
    backgroundColor: '#f0f0f0',
  },
  disclaimerContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  offlineBar: {
    backgroundColor: '#FF9800',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
  },
  healthDataBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    justifyContent: 'space-around',
  },
  healthDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthDataText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
});

export default AiConsultationScreen;