import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendAiConsultationMessage, fetchConversationHistory } from '../lib/aiConsultationApi';

// 메시지 유형 정의
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

const AiConsultationScreen = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const userId = 1; // 임시 사용자 ID

  // 초기 인사 메시지
  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: '안녕하세요! 저는 AI 헬퍼입니다. 심장 건강에 관한 질문이 있으시면 언제든지 물어보세요. 모든 의학 분야에 대한 상담이 가능합니다.',
        sender: 'ai',
        timestamp: Date.now(),
      },
    ]);

    // 대화 내역 불러오기
    loadConversationHistory();
  }, []);

  // 대화 내역 로드
  const loadConversationHistory = async () => {
    try {
      setLoading(true);
      const history = await fetchConversationHistory(userId);
      if (history && history.length > 0) {
        setMessages(history);
      }
    } catch (error) {
      console.error('대화 내역 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 메시지 전송
  const handleSendMessage = async () => {
    if (message.trim() === '') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setMessage('');
    scrollToBottom();

    try {
      setLoading(true);
      // 기존 메시지 내역을 전달하여 맥락을 유지
      const conversationHistory = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const response = await sendAiConsultationMessage(userId, message, conversationHistory);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.message,
        sender: 'ai',
        timestamp: Date.now(),
      };

      setMessages(prevMessages => [...prevMessages, aiMessage]);
      scrollToBottom();
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      
      // 오류 메시지 표시
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '죄송합니다. 메시지 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        sender: 'ai',
        timestamp: Date.now(),
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 음성 녹음 토글
  const toggleRecording = () => {
    setRecording(!recording);
    // 실제 녹음 기능은 여기에 구현
  };

  // 스크롤을 맨 아래로 이동
  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // 메시지 아이템 렌더링
  const renderMessageItem = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageBubble,
      item.sender === 'user' ? styles.userBubble : styles.aiBubble
    ]}>
      {item.sender === 'ai' && (
        <View style={styles.aiAvatar}>
          <Ionicons name="heart-circle" size={24} color="#FF0000" />
        </View>
      )}
      <View style={styles.messageContent}>
        <Text style={[
          styles.messageText,
          item.sender === 'user' ? styles.userText : styles.aiText
        ]}>
          {item.text}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FF0000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI 헬퍼</Text>
        <View style={styles.voiceToggle}>
          <TouchableOpacity onPress={() => setVoiceEnabled(!voiceEnabled)}>
            <Ionicons 
              name={voiceEnabled ? "volume-high" : "volume-mute"} 
              size={24} 
              color={voiceEnabled ? "#FF0000" : "#999"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.messageContainer}
        keyboardVerticalOffset={90}
      >
        {loading && messages.length <= 1 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF0000" />
            <Text style={styles.loadingText}>AI 상담사와 연결 중...</Text>
          </View>
        ) : (
          <FlatList
            ref={scrollViewRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
          />
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={[styles.recordButton, recording && styles.recordingButton]} 
            onPress={toggleRecording}
          >
            <Ionicons 
              name={recording ? "mic" : "mic-outline"}
              size={24} 
              color={recording ? "#fff" : "#FF0000"} 
            />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="질문을 입력하세요..."
            placeholderTextColor="#999"
            multiline
          />
          
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSendMessage}
            disabled={message.trim() === '' || loading}
          >
            <Ionicons 
              name="send" 
              size={24} 
              color={message.trim() === '' || loading ? "#ccc" : "#FF0000"} 
            />
          </TouchableOpacity>
        </View>
        
        {loading && messages.length > 1 && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>AI가 응답 중...</Text>
            <ActivityIndicator size="small" color="#FF0000" />
          </View>
        )}
        
        {isSpeaking && (
          <View style={styles.speakingIndicator}>
            <ActivityIndicator size="small" color="#FF0000" />
            <Text style={styles.speakingText}>음성 출력 중...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  voiceToggle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  messageList: {
    flex: 1,
    padding: 10,
  },
  messageListContent: {
    paddingBottom: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    flexDirection: 'row',
  },
  userBubble: {
    backgroundColor: '#FF0000',
    alignSelf: 'flex-end',
    marginLeft: '20%',
    borderTopRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    marginRight: '20%',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageContent: {
    flex: 1,
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
  timestamp: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  recordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  recordingButton: {
    backgroundColor: '#FF0000',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  speakingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});

export default AiConsultationScreen;