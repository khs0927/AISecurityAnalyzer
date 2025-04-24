// pubmedService.js
// PubMed API 연동 서비스

import apiClient from '../api/client';

/**
 * PubMed 검색 서비스
 * 의학 논문 검색 및 참조 기능 제공
 */
export default {
  /**
   * 키워드로 PubMed 검색
   * @param {string} query 검색어
   * @param {number} maxResults 최대 결과 수
   * @returns {Promise<Array>} 논문 목록
   */
  async searchByKeyword(query, maxResults = 3) {
    try {
      if (!query) return [];
      
      // 서버로 요청 (서버측에서 PubMed API 호출)
      const response = await apiClient.get('/api/pubmed/search', {
        params: {
          query,
          maxResults
        }
      });
      
      return response.articles || [];
    } catch (error) {
      console.error('PubMed 검색 오류:', error);
      return [];
    }
  },
  
  /**
   * 심장 관련 검색어에 최적화된 검색
   * @param {string} symptom 증상/키워드
   * @returns {Promise<Array>} 심장 관련 논문 목록
   */
  async searchHeartRelated(symptom) {
    try {
      // 심장 관련 키워드 추가
      const enhancedQuery = `${symptom} heart cardiac`;
      return await this.searchByKeyword(enhancedQuery);
    } catch (error) {
      console.error('심장 관련 검색 오류:', error);
      return [];
    }
  },
  
  /**
   * 논문 상세 정보 가져오기
   * @param {string} pmid PubMed ID
   * @returns {Promise<Object>} 논문 상세 정보
   */
  async getArticleDetails(pmid) {
    try {
      if (!pmid) return null;
      
      // 서버로 요청
      const response = await apiClient.get(`/api/pubmed/article/${pmid}`);
      return response.article || null;
    } catch (error) {
      console.error('논문 상세 정보 가져오기 오류:', error);
      return null;
    }
  },
  
  /**
   * 건강 데이터 기반 관련 논문 검색
   * @param {Object} healthData 건강 데이터
   * @returns {Promise<Array>} 관련 논문 목록
   */
  async findRelevantArticles(healthData) {
    try {
      if (!healthData) return [];
      
      // 검색어 구성
      let searchQuery = "cardiac ";
      
      if (healthData.heartRate) {
        searchQuery += `heart rate ${healthData.heartRate < 60 ? "bradycardia" : (healthData.heartRate > 100 ? "tachycardia" : "normal")} `;
      }
      
      if (healthData.oxygenLevel) {
        searchQuery += `oxygen saturation ${healthData.oxygenLevel < 90 ? "hypoxemia severe" : (healthData.oxygenLevel < 95 ? "hypoxemia mild" : "normal")} `;
      }
      
      if (healthData.systolic && healthData.diastolic) {
        searchQuery += `blood pressure ${healthData.systolic > 140 || healthData.diastolic > 90 ? "hypertension" : "normal"} `;
      }
      
      return await this.searchByKeyword(searchQuery);
    } catch (error) {
      console.error('관련 논문 검색 오류:', error);
      return [];
    }
  },
  
  /**
   * 오프라인 모드용 가상 논문 데이터
   * @param {string} keyword 키워드
   * @returns {Array} 가상 논문 목록
   */
  getMockArticles(keyword) {
    const mockArticles = [
      {
        pmid: '32703884',
        title: 'Cardiovascular disease and COVID-19: a consensus paper from the ESC Working Group',
        authors: 'Guzik TJ, et al.',
        journal: 'Cardiovascular Research',
        pubDate: '2020 Aug 1',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32703884/',
        abstract: '심혈관 질환을 가진 환자는 COVID-19 감염 시 합병증 및 사망 위험이 증가합니다. 본 합의문은 이러한 환자 치료에 대한 지침을 제공합니다.'
      },
      {
        pmid: '31475123',
        title: 'Physical Activity and Hypertension: From Cells to Physiological Systems',
        authors: 'Ramos JS, et al.',
        journal: 'Physiological Reviews',
        pubDate: '2019 Oct',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31475123/',
        abstract: '신체 활동은 고혈압 관리에 중요한 비약물적 접근법입니다. 본 리뷰는 신체 활동이 혈압 조절에 미치는 분자 및 생리학적 메커니즘을 설명합니다.'
      },
      {
        pmid: '28298458',
        title: 'Heart rate variability and cardiac autonomic modulation: advances and perspectives',
        authors: 'Shaffer F, et al.',
        journal: 'Frontiers in Public Health',
        pubDate: '2017 Mar 2',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28298458/',
        abstract: '심박 변이도는 자율신경계 기능을 평가하는 중요한 지표입니다. 이 리뷰는 HRV 측정 방법, 해석 및 임상적 의미를 포괄적으로 논의합니다.'
      },
      {
        pmid: '29128677',
        title: 'Oxygen saturation targets in critically ill patients with respiratory failure',
        authors: 'Chu DK, et al.',
        journal: 'New England Journal of Medicine',
        pubDate: '2018 Apr 5',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29128677/',
        abstract: '중환자실에서 산소포화도 목표 설정은 환자 결과에 중요한 영향을 미칩니다. 본 연구는 최적의 산소포화도 목표에 대한 근거를 제시합니다.'
      },
      {
        pmid: '30586765',
        title: 'Machine learning for cardiovascular risk prediction',
        authors: 'Krittanawong C, et al.',
        journal: 'Journal of the American Heart Association',
        pubDate: '2020 Jan 21',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30586765/',
        abstract: '기계 학습은 심혈관 위험 예측의 정확도를 향상시킬 수 있습니다. 이 리뷰는 다양한 기계 학습 기법과 그 응용에 대해 설명합니다.'
      }
    ];
    
    // 키워드 기반 필터링
    if (!keyword) return mockArticles.slice(0, 3);
    
    const lowerKeyword = keyword.toLowerCase();
    const filtered = mockArticles.filter(article => 
      article.title.toLowerCase().includes(lowerKeyword) || 
      article.abstract.toLowerCase().includes(lowerKeyword)
    );
    
    return filtered.length > 0 ? filtered.slice(0, 3) : mockArticles.slice(0, 3);
  }
}; 