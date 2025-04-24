import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MedicalModelInfo from '../components/MedicalModelInfo';
import Colors from '../utils/Colors';
import axios from 'axios';

/**
 * 통합 AI 시스템 화면 컴포넌트
 * 이미지와 텍스트를 모두 처리하는 멀티모달 인터페이스
 */
const IntegratedAiScreen = () => {
  // 상태 관리
  const [query, setQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [modelType, setModelType] = useState('hybrid');
  const scrollViewRef = useRef();

  // 컴포넌트 마운트 시 실행
  useEffect(() => {
    // 환영 메시지 추가
    setMessages([
      {
        id: 'welcome',
        type: 'system',
        content: '안녕하세요! 의료 AI 시스템입니다. 증상을 설명하거나 관련 이미지를 업로드해주세요.',
        timestamp: new Date()
      }
    ]);

    // 카메라 및 사진 액세스 권한 요청
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setError('사진 라이브러리 접근 권한이 필요합니다.');
        }
      }
    })();
  }, []);

  // 스크롤 자동으로 맨 아래로 이동
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  // 이미지 선택 함수
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setShowOptions(false);
    }
  };

  // 카메라 실행 함수
  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setShowOptions(false);
    }
  };

  // 이미지 초기화
  const clearImage = () => {
    setSelectedImage(null);
  };

  // 메시지 전송 함수
  const sendMessage = async () => {
    if ((!query || query.trim() === '') && !selectedImage) {
      return;
    }

    try {
      // 사용자 메시지 추가
      const newMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: query,
        image: selectedImage,
        timestamp: new Date()
      };

      // 메시지 목록에 추가
      setMessages(prev => [...prev, newMessage]);
      
      // 로딩 시작
      setIsLoading(true);
      
      // 요청 데이터 준비
      let formData = new FormData();
      formData.append('message', query);
      
      if (selectedImage) {
        const localUri = selectedImage;
        const filename = localUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';
        
        formData.append('image', {
          uri: localUri,
          name: filename,
          type
        });
      }
      
      formData.append('modelType', modelType);
      
      // API 호출
      const response = await axios.post('/api/ai/integrated-analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60초 타임아웃
      });
      
      // AI 응답 메시지 생성
      const aiResponse = {
        id: 'ai-' + Date.now().toString(),
        type: 'ai',
        content: response.data.text,
        analysis: response.data.analysis,
        timestamp: new Date()
      };
      
      // 응답 추가
      setMessages(prev => [...prev, aiResponse]);
      
      // 입력 필드 및 이미지 초기화
      setQuery('');
      setSelectedImage(null);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('메시지 전송 중 오류가 발생했습니다. 다시 시도해 주세요.');
      
      // 오류 메시지 추가
      const errorMessage = {
        id: 'error-' + Date.now().toString(),
        type: 'error',
        content: '죄송합니다. 요청을 처리하는 동안 오류가 발생했습니다. 다시 시도해 주세요.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
    } finally {
      setIsLoading(false);
    }
  };

  // 메시지 렌더링 함수
  const renderMessage = (message) => {
    switch (message.type) {
      case 'user':
        return (
          <View style={styles.userMessageContainer} key={message.id}>
            <View style={styles.userMessage}>
              {message.content && <Text style={styles.userMessageText}>{message.content}</Text>}
              {message.image && (
                <Image source={{ uri: message.image }} style={styles.messageImage} />
              )}
            </View>
            <Text style={styles.messageTime}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        );
        
      case 'ai':
        return (
          <View style={styles.aiMessageContainer} key={message.id}>
            <View style={styles.aiMessage}>
              <Text style={styles.aiMessageText}>{message.content}</Text>
              
              {/* 분석 결과가 있으면 표시 */}
              {message.analysis && (
                <View style={styles.analysisContainer}>
                  {message.analysis.mainDiagnosis && (
                    <>
                      <Text style={styles.analysisTitle}>진단 결과</Text>
                      <Text style={styles.analysisDiagnosis}>
                        {message.analysis.mainDiagnosis.condition} 
                        ({(message.analysis.mainDiagnosis.probability * 100).toFixed(1)}%)
                      </Text>
                      
                      {message.analysis.differentialDiagnosis && (
                        <>
                          <Text style={styles.analysisSubtitle}>감별 진단</Text>
                          {message.analysis.differentialDiagnosis.slice(0, 3).map((diagnosis, index) => (
                            <Text key={index} style={styles.analysisList}>
                              • {diagnosis.condition} ({(diagnosis.probability * 100).toFixed(1)}%)
                            </Text>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
            <Text style={styles.messageTime}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        );
        
      case 'system':
      case 'error':
        return (
          <View style={styles.systemMessageContainer} key={message.id}>
            <View style={[
              styles.systemMessage, 
              message.type === 'error' ? styles.errorMessage : {}
            ]}>
              <Text style={styles.systemMessageText}>{message.content}</Text>
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* 모델 정보 표시 */}
      <View style={styles.header}>
        <MedicalModelInfo modelType={modelType} />
      </View>
      
      {/* 에러 메시지 표시 */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close-circle" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* 메시지 목록 */}
      <ScrollView
        style={styles.messagesContainer}
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map(renderMessage)}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>AI가 응답을 생성하고 있습니다...</Text>
          </View>
        )}
      </ScrollView>
      
      {/* 선택된 이미지 표시 */}
      {selectedImage && (
        <View style={styles.selectedImageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
          <TouchableOpacity style={styles.clearImageButton} onPress={clearImage}>
            <Ionicons name="close-circle" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* 입력 영역 */}
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.attachButton} 
          onPress={() => setShowOptions(!showOptions)}
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="증상을 설명하거나 질문하세요..."
          multiline
        />
        
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!query && !selectedImage) ? styles.sendButtonDisabled : {}
          ]}
          onPress={sendMessage}
          disabled={(!query && !selectedImage) || isLoading}
        >
          <Ionicons 
            name="send" 
            size={24} 
            color={(!query && !selectedImage) ? '#ccc' : '#fff'} 
          />
        </TouchableOpacity>
      </View>
      
      {/* 옵션 메뉴 (사진 첨부 등) */}
      {showOptions && (
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={24} color={Colors.primary} />
            <Text style={styles.optionText}>사진 첨부</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionButton} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={24} color={Colors.primary} />
            <Text style={styles.optionText}>카메라</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionButton} onPress={() => setShowOptions(false)}>
            <Ionicons name="close-outline" size={24} color="#666" />
            <Text style={styles.optionText}>닫기</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  errorContainer: {
    backgroundColor: '#FF6B6B',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
  },
  userMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  userMessage: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 5,
    maxWidth: '75%',
    padding: 12,
  },
  userMessageText: {
    color: '#fff',
    fontSize: 16,
  },
  aiMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    maxWidth: '75%',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  aiMessageText: {
    color: '#333',
    fontSize: 16,
  },
  systemMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  systemMessage: {
    backgroundColor: '#F0F0F0',
    borderRadius: 15,
    padding: 10,
    maxWidth: '85%',
  },
  errorMessage: {
    backgroundColor: '#FFE8E8',
  },
  systemMessageText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  loadingText: {
    color: '#666',
    marginLeft: 10,
    fontSize: 14,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 8,
    marginTop: 3,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#eee',
  },
  optionsContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'space-around',
  },
  optionButton: {
    alignItems: 'center',
    padding: 10,
  },
  optionText: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
  },
  selectedImageContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f9f9f9',
    position: 'relative',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  clearImageButton: {
    position: 'absolute',
    top: 5,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F9F9FF',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  analysisTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#444',
    marginBottom: 3,
  },
  analysisDiagnosis: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  analysisSubtitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  analysisList: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
});

export default IntegratedAiScreen; 