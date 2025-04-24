// modelManager.js
// AI 모델 관리 및 통합을 위한 유틸리티

/**
 * 의료 AI 모델 관리자
 * Qwen2.5-Omni-7B와 MMed-Llama-3-8B 모델 통합 관리
 */
export default {
  // 모델 정보 정의
  models: {
    qwen: {
      id: 'Qwen/Qwen2.5-Omni-7B',
      description: '멀티모달 모델로, 텍스트와 함께 이미지, 오디오 등 여러 데이터 유형 처리 가능',
      capabilities: ['텍스트 생성', '이미지 이해', '의료 질의응답', '의학 지식'],
      strengths: ['복잡한 질의 처리', '다양한 데이터 타입 처리', '맥락 이해력'],
      tokenLimit: 4096
    },
    mmedLlama: {
      id: 'Henrychur/MMed-Llama-3-8B-EnIns',
      description: '의료 전문 모델로, 의학 지식과 진단 능력에 최적화',
      capabilities: ['의료 진단', '약물 정보', '치료 계획', '의학 연구 참조'],
      strengths: ['정확한 의료 용어 처리', '최신 의학 연구 통합', '진단 참고 정보 제공'],
      tokenLimit: 4096
    }
  },
  
  /**
   * 쿼리 복잡도 기반 모델 라우팅
   * @param {string} query 사용자 쿼리
   * @param {Object} healthData 건강 데이터
   * @returns {string} 선택된 모델 ID
   */
  routeQuery(query, healthData) {
    // 모달리티 감지 (이미지, 오디오 등이 포함된 경우 Qwen 모델 사용)
    if (healthData && (healthData.images || healthData.audio)) {
      return this.models.qwen.id;
    }
    
    // 복잡도 평가
    const complexity = this.assessComplexity(query);
    
    // 의학 용어 밀도 평가
    const medicalTermDensity = this.assessMedicalTerms(query);
    
    // 모델 선택 로직
    if (complexity > 0.7 || medicalTermDensity < 0.3) {
      return this.models.qwen.id; // 복잡하지만 의학 용어가 적은 쿼리
    } else {
      return this.models.mmedLlama.id; // 의학 용어가 많은 쿼리는 전문 의료 모델로
    }
  },
  
  /**
   * 쿼리 복잡도 평가
   * @param {string} query 사용자 쿼리
   * @returns {number} 복잡도 점수 (0-1)
   */
  assessComplexity(query) {
    // 간단한 복잡도 평가 로직
    const words = query.split(/\s+/).length;
    const sentences = query.split(/[.!?]+/).length;
    const avgWordPerSentence = words / Math.max(1, sentences);
    
    // 문장당 단어 수와 전체 길이를 기반으로 복잡도 평가
    const lengthFactor = Math.min(1, query.length / 200);
    const sentenceComplexity = Math.min(1, avgWordPerSentence / 20);
    
    return (lengthFactor * 0.6) + (sentenceComplexity * 0.4);
  },
  
  /**
   * 의학 용어 밀도 평가
   * @param {string} query 사용자 쿼리
   * @returns {number} 의학 용어 밀도 (0-1)
   */
  assessMedicalTerms(query) {
    // 일반적인 의학 용어 목록 (실제로는 더 광범위한 용어 사전 필요)
    const medicalTerms = [
      '심장', '폐', '간', '신장', '뇌', '혈액', '혈압', '맥박', 
      '심박수', '산소포화도', '콜레스테롤', '당뇨', '고혈압',
      '저혈압', '빈맥', '서맥', '부정맥', '심전도', 'ECG', 'EKG',
      '심근경색', '뇌졸중', '협심증', '심부전', '동맥', '정맥',
      '호르몬', '항생제', '항염증제', '혈전', '응고', '염증'
    ];
    
    // 쿼리 내 의학 용어 카운트
    const lowerQuery = query.toLowerCase();
    let termCount = 0;
    
    for (const term of medicalTerms) {
      if (lowerQuery.includes(term.toLowerCase())) {
        termCount++;
      }
    }
    
    // 용어 밀도 계산
    const words = query.split(/\s+/).length;
    return Math.min(1, termCount / Math.max(1, words / 2));
  },
  
  /**
   * 두 모델의 응답 융합
   * @param {string} qwenResponse Qwen 모델 응답
   * @param {string} mmedResponse MMed-Llama 모델 응답
   * @returns {string} 융합된 응답
   */
  fuseResponses(qwenResponse, mmedResponse) {
    if (!qwenResponse) return mmedResponse;
    if (!mmedResponse) return qwenResponse;
    
    // 각 모델의 응답에서 키 문장 추출
    const qwenSentences = this.extractKeySentences(qwenResponse);
    const mmedSentences = this.extractKeySentences(mmedResponse);
    
    // 중복 제거 및 정렬
    const allSentences = [...new Set([...qwenSentences, ...mmedSentences])];
    
    // 의학 용어 기반 정렬
    allSentences.sort((a, b) => {
      const aMedTerms = this.countMedicalTerms(a);
      const bMedTerms = this.countMedicalTerms(b);
      return bMedTerms - aMedTerms;
    });
    
    // 최종 응답 구성
    return allSentences.join(' ');
  },
  
  /**
   * 텍스트에서 핵심 문장 추출
   * @param {string} text 텍스트
   * @returns {Array} 핵심 문장 배열
   */
  extractKeySentences(text) {
    // 문장 분리
    const sentences = text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10); // 짧은 문장 제외
    
    // 의학 용어 포함 문장 우선 선택
    return sentences.filter(s => this.countMedicalTerms(s) > 0);
  },
  
  /**
   * 텍스트 내 의학 용어 개수 카운트
   * @param {string} text 텍스트
   * @returns {number} 의학 용어 개수
   */
  countMedicalTerms(text) {
    // 일반적인 의학 용어 목록 (실제로는 더 광범위한 용어 사전 필요)
    const medicalTerms = [
      '심장', '폐', '간', '신장', '뇌', '혈액', '혈압', '맥박', 
      '심박수', '산소포화도', '콜레스테롤', '당뇨', '고혈압',
      '저혈압', '빈맥', '서맥', '부정맥', '심전도', 'ECG', 'EKG',
      '심근경색', '뇌졸중', '협심증', '심부전', '동맥', '정맥',
      '호르몬', '항생제', '항염증제', '혈전', '응고', '염증'
    ];
    
    // 텍스트 내 의학 용어 카운트
    const lowerText = text.toLowerCase();
    let count = 0;
    
    for (const term of medicalTerms) {
      if (lowerText.includes(term.toLowerCase())) {
        count++;
      }
    }
    
    return count;
  }
}; 