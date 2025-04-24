// MedicalModelInfo.js
// 의료 AI 모델 정보 표시 컴포넌트

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 의료 AI 모델 정보 컴포넌트
 * 사용된 모델의 특성과 능력을 표시함
 */
const MedicalModelInfo = ({ modelType = 'hybrid' }) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  // 모델 설명 정보
  const modelInfo = {
    qwen: {
      name: 'Qwen2.5-Omni-7B',
      description: '멀티모달 모델로, 텍스트와 함께 이미지, 오디오 등 여러 데이터 유형 처리 가능',
      capabilities: ['텍스트 생성', '이미지 이해', '의료 질의응답', '의학 지식'],
      strengths: ['복잡한 질의 처리', '다양한 데이터 타입 처리', '맥락 이해력'],
      limitations: ['의학 용어 정확성 제한', '최신 의학 데이터 제한'],
      tokenLimit: 4096
    },
    mmedLlama: {
      name: 'MMed-Llama-3-8B-EnIns',
      description: '의료 전문 모델로, 의학 지식과 진단 능력에 최적화',
      capabilities: ['의료 진단', '약물 정보', '치료 계획', '의학 연구 참조'],
      strengths: ['정확한 의료 용어 처리', '최신 의학 연구 통합', '진단 참고 정보 제공'],
      limitations: ['일반 질의 제한적', '이미지 처리 제한'],
      tokenLimit: 4096
    },
    hybrid: {
      name: 'AI 헬퍼',
      description: 'Qwen2.5-Omni-7B와 MMed-Llama-3-8B 모델의 하이브리드',
      capabilities: ['고급 의료 진단', '멀티모달 데이터 분석', '실시간 건강 모니터링', '연구 문헌 통합'],
      strengths: ['정밀한 의료 정보', '다양한 입력 처리', '최신 연구 기반 응답', '맥락 이해력'],
      limitations: ['모델 간 충돌 가능성', '응답 생성 시간 증가'],
      tokenLimit: 4096
    }
  };
  
  // 현재 선택된 모델 정보
  const currentModel = modelInfo[modelType] || modelInfo.hybrid;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.infoButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="information-circle-outline" size={20} color="#FF6D94" />
        <Text style={styles.infoText}>AI 모델 정보</Text>
      </TouchableOpacity>
      
      {/* 모델 정보 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentModel.name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* 모델 설명 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>모델 설명</Text>
                <Text style={styles.description}>{currentModel.description}</Text>
              </View>
              
              {/* 모델 능력 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>주요 능력</Text>
                <View style={styles.tagContainer}>
                  {currentModel.capabilities.map((capability, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{capability}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              {/* 강점 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>강점</Text>
                {currentModel.strengths.map((strength, index) => (
                  <View key={index} style={styles.listItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.listItemText}>{strength}</Text>
                  </View>
                ))}
              </View>
              
              {/* 제한사항 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>제한사항</Text>
                {currentModel.limitations.map((limitation, index) => (
                  <View key={index} style={styles.listItem}>
                    <Ionicons name="alert-circle" size={16} color="#FF9800" />
                    <Text style={styles.listItemText}>{limitation}</Text>
                  </View>
                ))}
              </View>
              
              {/* 모델 아키텍처 다이어그램 (간단한 시각화) */}
              {modelType === 'hybrid' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>모델 아키텍처</Text>
                  <View style={styles.architectureDiagram}>
                    <View style={styles.modelBox}>
                      <Text style={styles.modelBoxTitle}>Qwen2.5-Omni-7B</Text>
                      <Text style={styles.modelBoxText}>멀티모달 처리</Text>
                    </View>
                    
                    <View style={styles.fusionArrows}>
                      <Ionicons name="arrow-forward" size={20} color="#666" />
                      <Ionicons name="git-merge-outline" size={24} color="#666" />
                      <Ionicons name="arrow-forward" size={20} color="#666" />
                    </View>
                    
                    <View style={styles.modelBox}>
                      <Text style={styles.modelBoxTitle}>MMed-Llama-3-8B</Text>
                      <Text style={styles.modelBoxText}>의학 전문성</Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* 면책 조항 */}
              <View style={styles.disclaimerSection}>
                <Ionicons name="alert-circle" size={20} color="#FF6D94" />
                <Text style={styles.disclaimerText}>
                  이 AI 모델은 의학적 조언을 대체할 수 없습니다. 실제 의료 결정은 의사와 상담하세요.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  infoText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#333',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  architectureDiagram: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  modelBox: {
    width: '40%',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    alignItems: 'center',
  },
  modelBoxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modelBoxText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  fusionArrows: {
    width: '20%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimerSection: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F7',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#FF6D94',
    flex: 1,
    marginLeft: 8,
  },
});

export default MedicalModelInfo; 