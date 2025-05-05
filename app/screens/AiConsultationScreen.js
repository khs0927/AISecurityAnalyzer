import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { firebase } from '../../mobile/src/lib/firebase';

const AiConsultationScreen = ({ route, webAppData }) => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);
  
  // 사용자 ID 얻기
  const userId = firebase.auth().currentUser?.uid;
  
  // 이전 대화 내역 불러오기
  useEffect(() => {
    if (!userId) return;
    
    const loadConversation = async () => {
      setIsLoading(true);
      try {
        const snapshot = await firebase.firestore()
          .collection(`users/${userId}/aiQuestions`)
          .orderBy('createdAt', 'asc')
          .limit(20)
          .get();
          
        const loadedMessages = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.q,
            sender: 'user',
            createdAt: data.createdAt?.toDate() || new Date(),
            response: data.answer ? {
              id: `${doc.id}-response`,
              text: data.answer,
              sender: 'ai',
              createdAt: data.answeredAt?.toDate() || new Date()
            } : null,
            status: data.status || 'completed'
          };
        });
        
        // 질문과 응답을 분리하여 시간순으로 나열
        const formattedMessages = [];
        loadedMessages.forEach(msg => {
          formattedMessages.push({
            id: msg.id,
            text: msg.text,
            sender: msg.sender,
            createdAt: msg.createdAt
          });
          
          if (msg.response) {
            formattedMessages.push(msg.response);
          }
        });
        
        // 시간순 정렬
        formattedMessages.sort((a, b) => a.createdAt - b.createdAt);
        setMessages(formattedMessages);
      } catch (error) {
        console.error('대화 내역 불러오기 실패:', error);
        Alert.alert('오류', '대화 내역을 불러오는 중 문제가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConversation();
    
    // 실시간 업데이트 리스너 설정
    const unsubscribe = firebase.firestore()
      .collection(`users/${userId}/aiQuestions`)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'modified') {
            const data = change.doc.data();
            // 응답이 추가된 경우
            if (data.status === 'completed' && data.answer) {
              // 메시지 목록 업데이트
              setMessages(prevMessages => {
                // 이미 응답이 있는지 확인
                const responseExists = prevMessages.some(
                  msg => msg.id === `${change.doc.id}-response`
                );
                
                if (responseExists) return prevMessages;
                
                // 응답 추가
                return [
                  ...prevMessages,
                  {
                    id: `${change.doc.id}-response`,
                    text: data.answer,
                    sender: 'ai',
                    createdAt: data.answeredAt?.toDate() || new Date()
                  }
                ];
              });
            }
          }
        });
      }, error => {
        console.error('실시간 업데이트 오류:', error);
      });
      
    return () => unsubscribe();
  }, [userId]);
  
  // 메시지 전송 함수
  const sendMessage = async () => {
    if (!inputText.trim() || !userId) return;
    
    const newMessage = {
      id: `temp-${Date.now()}`,
      text: inputText.trim(),
      sender: 'user',
      createdAt: new Date()
    };
    
    // UI 상태 업데이트
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsLoading(true);
    
    // Firestore에 저장 (AI 에이전트 트리거)
    try {
      const docRef = await firebase.firestore()
        .collection(`users/${userId}/aiQuestions`)
        .add({
          q: newMessage.text,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          status: 'pending',
          user: {
            id: userId,
            name: webAppData?.user?.name || '사용자'
          },
          contextData: {
            heartRate: webAppData?.healthData?.heartRate,
            bloodPressure: webAppData?.healthData 
              ? `${webAppData.healthData.bloodPressureSystolic}/${webAppData.healthData.bloodPressureDiastolic}`
              : null,
            oxygenSaturation: webAppData?.healthData?.oxygenSaturation
          }
        });
      
      // ID 업데이트
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, id: docRef.id } 
            : msg
        )
      );
    } catch (error) {
      console.error('메시지 저장 실패:', error);
      Alert.alert('오류', '메시지를 전송하는 중 문제가 발생했습니다.');
      
      // 메시지 목록에서 제거
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    } finally {
      setIsLoading(false);
    }
  };
  
  // 메시지 렌더링 함수
  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[
        styles.messageContainer, 
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="heart-circle" size={24} color="#fff" />
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.aiMessageText
          ]}>
            {item.text}
          </Text>
          
          <Text style={styles.messageTime}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };
  
  // 시간 포맷팅 함수
  const formatTime = (date) => {
    try {
      return new Date(date).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return '';
    }
  };
  
  // 펜딩 상태일 때 표시할 로딩 인디케이터
  const renderPendingIndicator = () => {
    const pendingMessage = messages[messages.length - 1];
    if (
      pendingMessage && 
      pendingMessage.sender === 'user' && 
      !messages.some(msg => msg.id === `${pendingMessage.id}-response`)
    ) {
      return (
        <View style={styles.pendingContainer}>
          <View style={styles.aiAvatar}>
            <Ionicons name="heart-circle" size={24} color="#fff" />
          </View>
          <View style={styles.pendingBubble}>
            <View style={styles.typingIndicator}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, { animationDelay: '0.2s' }]} />
              <View style={[styles.typingDot, { animationDelay: '0.4s' }]} />
            </View>
            <Text style={styles.pendingText}>AI가 응답 중입니다...</Text>
          </View>
        </View>
      );
    }
    
    return null;
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI 상담</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.infoButton}>
              <Ionicons name="information-circle-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 메시지 목록 */}
        {isLoading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6D94" />
            <Text style={styles.loadingText}>대화 내역을 불러오는 중...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => 
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListHeaderComponent={() => (
              <View style={styles.welcomeContainer}>
                <View style={styles.aiLargeAvatar}>
                  <Ionicons name="heart-circle" size={40} color="#fff" />
                </View>
                <Text style={styles.welcomeTitle}>AI 심장 건강 상담</Text>
                <Text style={styles.welcomeText}>
                  심장 건강에 관한 질문에 답변해 드립니다. 
                  증상, 생활 습관, 약물 등에 관해 물어보세요.
                </Text>
                <Text style={styles.disclaimerText}>
                  * 이 AI는 의학적 조언을 대체할 수 없습니다. 
                  긴급한 증상이 있다면 즉시 의사와 상담하세요.
                </Text>
              </View>
            )}
            ListFooterComponent={renderPendingIndicator}
          />
        )}
        
        {/* 입력 영역 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="질문을 입력하세요..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.disabledSendButton
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 32,
    alignItems: 'flex-end',
  },
  infoButton: {
    padding: 4,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6D94',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#FF6D94',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.5)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6D94',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledSendButton: {
    backgroundColor: '#ccc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  welcomeContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  aiLargeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6D94',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  pendingBubble: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    maxWidth: '80%',
  },
  pendingText: {
    fontSize: 14,
    color: '#666',
  },
  typingIndicator: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
    marginRight: 3,
    opacity: 0.5,
  },
});

export default AiConsultationScreen;