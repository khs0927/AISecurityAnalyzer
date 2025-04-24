import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { saveHuggingFaceToken, getHuggingFaceToken } from '../services/securityService';

const TokenSettingsScreen = () => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 저장된 토큰 불러오기
    const loadToken = async () => {
      try {
        const savedToken = await getHuggingFaceToken();
        if (savedToken) {
          setToken(savedToken);
        }
      } catch (error) {
        console.error('토큰 불러오기 오류:', error);
        Alert.alert('오류', '토큰을 불러오는 중 오류가 발생했습니다.');
      }
    };

    loadToken();
  }, []);

  const handleSaveToken = async () => {
    if (!token.trim()) {
      Alert.alert('경고', '토큰을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    
    try {
      await saveHuggingFaceToken(token);
      Alert.alert('성공', 'Hugging Face 토큰이 저장되었습니다.');
    } catch (error) {
      console.error('토큰 저장 오류:', error);
      Alert.alert('오류', '토큰을 저장하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hugging Face API 설정</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          보안 분석을 위해 Hugging Face API 토큰이 필요합니다.
        </Text>
        <Text style={styles.infoText}>
          토큰은 기기에 안전하게 저장되며 API 요청에만 사용됩니다.
        </Text>
      </View>

      <Text style={styles.label}>API 토큰</Text>
      <TextInput
        style={styles.input}
        value={token}
        onChangeText={setToken}
        placeholder="Hugging Face API 토큰을 입력하세요"
        placeholderTextColor="#999"
        secureTextEntry={true}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity 
        style={styles.button}
        onPress={handleSaveToken}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? '저장 중...' : '토큰 저장하기'}
        </Text>
      </TouchableOpacity>

      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>API 토큰 얻는 방법:</Text>
        <Text style={styles.helpText}>1. Hugging Face 계정에 로그인하세요.</Text>
        <Text style={styles.helpText}>2. 설정 > API 토큰 메뉴로 이동하세요.</Text>
        <Text style={styles.helpText}>3. 새 토큰을 생성하고 복사하세요.</Text>
        <Text style={styles.helpText}>4. 이 화면에 토큰을 입력하고 저장하세요.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  helpText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
});

export default TokenSettingsScreen; 