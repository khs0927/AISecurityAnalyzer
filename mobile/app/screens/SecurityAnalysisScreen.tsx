import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { analyzeTextSecurity, hasHuggingFaceToken } from '../services/securityService';
import { SecurityAnalysisResult } from '../types/securityTypes';

const SecurityAnalysisScreen = ({ navigation }: { navigation: any }) => {
  const [text, setText] = useState('');
  const [results, setResults] = useState<SecurityAnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  // 컴포넌트 마운트 시 토큰 확인
  React.useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    const tokenExists = await hasHuggingFaceToken();
    setHasToken(tokenExists);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      Alert.alert('알림', '분석할 텍스트를 입력해주세요.');
      return;
    }

    if (!hasToken) {
      Alert.alert(
        '토큰 필요',
        'Hugging Face API 토큰이 필요합니다. 토큰 설정 화면으로 이동하시겠습니까?',
        [
          { text: '아니오', style: 'cancel' },
          { text: '예', onPress: () => navigation.navigate('TokenSettings') }
        ]
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysisResults = await analyzeTextSecurity({ text });
      setResults(analysisResults);
    } catch (error) {
      console.error('보안 분석 오류:', error);
      Alert.alert('오류', '보안 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return '#ff4d4d'; // 빨간색
      case 'medium':
        return '#ffa64d'; // 주황색 
      case 'low':
        return '#ffdc73'; // 노란색
      default:
        return '#333333'; // 기본 색상
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>보안 분석</Text>
      
      {!hasToken && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Hugging Face API 토큰이 설정되지 않았습니다.
          </Text>
          <TouchableOpacity
            style={styles.tokenButton}
            onPress={() => navigation.navigate('TokenSettings')}
          >
            <Text style={styles.tokenButtonText}>토큰 설정하기</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Text style={styles.label}>분석할 텍스트:</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="분석할 텍스트를 입력하세요..."
        placeholderTextColor="#999"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <TouchableOpacity 
        style={[styles.button, !text.trim() && styles.buttonDisabled]}
        onPress={handleAnalyze}
        disabled={isAnalyzing || !text.trim()}
      >
        {isAnalyzing ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>보안 분석하기</Text>
        )}
      </TouchableOpacity>

      {results.length > 0 && (
        <>
          <Text style={styles.resultsTitle}>분석 결과:</Text>
          <ScrollView style={styles.resultsContainer}>
            {results.map((result, index) => (
              <View 
                key={index} 
                style={[
                  styles.resultItem, 
                  { borderLeftColor: getSeverityColor(result.severity) }
                ]}
              >
                <View style={styles.resultHeader}>
                  <Text style={styles.resultType}>{result.type}</Text>
                  <Text 
                    style={[
                      styles.resultSeverity, 
                      { color: getSeverityColor(result.severity) }
                    ]}
                  >
                    {result.severity}
                  </Text>
                </View>
                <Text style={styles.resultDescription}>{result.description}</Text>
                {result.recommendation && (
                  <Text style={styles.resultRecommendation}>
                    <Text style={styles.recommendationLabel}>권장사항: </Text>
                    {result.recommendation}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </>
      )}
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
  warningContainer: {
    backgroundColor: '#fff8e1',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    color: '#5d4037',
    marginBottom: 10,
  },
  tokenButton: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  tokenButtonText: {
    color: '#4a90e2',
    fontWeight: '600',
    fontSize: 14,
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
    height: 150,
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 25,
  },
  buttonDisabled: {
    backgroundColor: '#9fc5e8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 5,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  resultSeverity: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  resultRecommendation: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  recommendationLabel: {
    fontWeight: '600',
    color: '#444',
  },
});

export default SecurityAnalysisScreen; 