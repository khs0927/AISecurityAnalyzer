import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { analyzeTextSecurity, getHuggingFaceToken, setHuggingFaceToken } from '../api/huggingFaceService';
import { SecurityAnalysisResult } from '../types/security';

const SecurityAnalyzer: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [results, setResults] = useState<SecurityAnalysisResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = await getHuggingFaceToken();
      setHasToken(!!token);
      if (token) {
        setApiKey(token);
      }
    } catch (error) {
      console.error('토큰 확인 오류:', error);
    }
  };

  const saveToken = async () => {
    try {
      if (!apiKey.trim()) {
        Alert.alert('오류', 'API 키를 입력해주세요.');
        return;
      }
      
      await setHuggingFaceToken(apiKey);
      setHasToken(true);
      Alert.alert('성공', 'Hugging Face API 키가 저장되었습니다.');
    } catch (error) {
      Alert.alert('오류', '토큰 저장 중 오류가 발생했습니다.');
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      Alert.alert('오류', '분석할 텍스트를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const analysisResults = await analyzeTextSecurity({ text });
      setResults(analysisResults);
    } catch (error) {
      console.error('분석 오류:', error);
      Alert.alert('오류', '보안 분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderResultItem = (item: SecurityAnalysisResult, index: number) => {
    // 보안 점수에 따른 색상 결정
    const scoreColor = item.score < 0.3 ? '#4CAF50' : 
                       item.score < 0.7 ? '#FF9800' : '#F44336';
    
    return (
      <View key={index} style={styles.resultItem}>
        <Text style={styles.categoryText}>{item.category}</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>보안 점수:</Text>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>
            {(item.score * 100).toFixed(1)}%
          </Text>
        </View>
        <Text style={styles.descriptionText}>{item.description}</Text>
        
        {item.recommendations && item.recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>권장 사항:</Text>
            {item.recommendations.map((rec, idx) => (
              <Text key={idx} style={styles.recommendationItem}>• {rec}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>보안 분석기</Text>
        <Text style={styles.description}>
          Hugging Face API를 사용하여 텍스트의 보안 취약점을 분석합니다.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API 설정</Text>
        <TextInput
          style={styles.input}
          placeholder="Hugging Face API 키 입력"
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={saveToken}>
          <Text style={styles.buttonText}>API 키 저장</Text>
        </TouchableOpacity>
        
        {hasToken && (
          <Text style={styles.successText}>
            ✓ API 키가 설정되었습니다
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>텍스트 분석</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="분석할 텍스트를 입력하세요..."
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={6}
        />
        <TouchableOpacity 
          style={[styles.button, (!hasToken || loading) && styles.buttonDisabled]} 
          onPress={handleAnalyze}
          disabled={!hasToken || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>분석 시작</Text>
          )}
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>분석 결과</Text>
          {results.map(renderResultItem)}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successText: {
    color: '#4CAF50',
    marginTop: 8,
    fontSize: 14,
  },
  resultItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  recommendationsContainer: {
    marginTop: 8,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#555',
  },
  recommendationItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    paddingLeft: 4,
  },
});

export default SecurityAnalyzer; 