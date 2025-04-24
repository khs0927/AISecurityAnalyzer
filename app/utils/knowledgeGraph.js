// knowledgeGraph.js
// 의료 지식 그래프 관리 유틸리티

import AsyncStorage from '@react-native-async-storage/async-storage';
import pubmedService from './pubmedService';

/**
 * 의료 지식 그래프 관리 유틸리티
 * 의학 지식 체계화 및 관계 분석을 위한 그래프 구조 관리
 */
export default {
  // 스토리지 키
  STORAGE_KEY: 'medicalKnowledgeGraph',
  
  // 기본 노드 타입
  NODE_TYPES: {
    SYMPTOM: 'symptom',
    DISEASE: 'disease',
    TREATMENT: 'treatment',
    MEDICATION: 'medication',
    RESEARCH: 'research',
    TEST: 'test'
  },
  
  // 기본 관계 타입
  RELATION_TYPES: {
    INDICATES: 'indicates',
    TREATS: 'treats',
    CAUSES: 'causes',
    PREVENTS: 'prevents',
    TESTS_FOR: 'tests_for',
    CONTRAINDICATES: 'contraindicates',
    RESEARCHES: 'researches'
  },
  
  /**
   * 그래프 초기화 (로컬 데이터 로드)
   * @returns {Promise<Object>} 로드된 그래프
   */
  async initGraph() {
    try {
      const graphData = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (graphData) {
        return JSON.parse(graphData);
      }
      
      // 기본 그래프 생성
      const defaultGraph = {
        nodes: [],
        relations: [],
        lastUpdated: new Date().toISOString()
      };
      
      await this.saveGraph(defaultGraph);
      return defaultGraph;
    } catch (error) {
      console.error('그래프 초기화 오류:', error);
      return { nodes: [], relations: [], lastUpdated: new Date().toISOString() };
    }
  },
  
  /**
   * 그래프 저장
   * @param {Object} graph 그래프 데이터
   * @returns {Promise<boolean>} 성공 여부
   */
  async saveGraph(graph) {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(graph)
      );
      return true;
    } catch (error) {
      console.error('그래프 저장 오류:', error);
      return false;
    }
  },
  
  /**
   * 노드 추가
   * @param {Object} graph 그래프 데이터
   * @param {Object} node 추가할 노드
   * @returns {Object} 업데이트된 그래프
   */
  addNode(graph, node) {
    if (!graph || !node || !node.id || !node.type) {
      console.error('유효하지 않은 그래프 또는 노드');
      return graph;
    }
    
    // 중복 확인
    const existingNodeIndex = graph.nodes.findIndex(n => n.id === node.id);
    
    if (existingNodeIndex >= 0) {
      // 기존 노드 업데이트
      graph.nodes[existingNodeIndex] = {
        ...graph.nodes[existingNodeIndex],
        ...node,
        updatedAt: new Date().toISOString()
      };
    } else {
      // 새 노드 추가
      graph.nodes.push({
        ...node,
        createdAt: new Date().toISOString()
      });
    }
    
    graph.lastUpdated = new Date().toISOString();
    return graph;
  },
  
  /**
   * 관계 추가
   * @param {Object} graph 그래프 데이터
   * @param {Object} relation 추가할 관계
   * @returns {Object} 업데이트된 그래프
   */
  addRelation(graph, relation) {
    if (!graph || !relation || !relation.source || !relation.target || !relation.type) {
      console.error('유효하지 않은 그래프 또는 관계');
      return graph;
    }
    
    // 중복 확인
    const existingRelationIndex = graph.relations.findIndex(
      r => r.source === relation.source && 
           r.target === relation.target && 
           r.type === relation.type
    );
    
    if (existingRelationIndex >= 0) {
      // 기존 관계 업데이트
      graph.relations[existingRelationIndex] = {
        ...graph.relations[existingRelationIndex],
        ...relation,
        updatedAt: new Date().toISOString()
      };
    } else {
      // 새 관계 추가
      graph.relations.push({
        ...relation,
        createdAt: new Date().toISOString()
      });
    }
    
    graph.lastUpdated = new Date().toISOString();
    return graph;
  },
  
  /**
   * 키워드 관련 노드 검색
   * @param {Object} graph 그래프 데이터
   * @param {string} keyword 검색 키워드
   * @returns {Array} 검색 결과 노드 배열
   */
  searchNodes(graph, keyword) {
    if (!graph || !keyword) return [];
    
    const lowerKeyword = keyword.toLowerCase();
    
    return graph.nodes.filter(node => 
      node.name?.toLowerCase().includes(lowerKeyword) ||
      node.description?.toLowerCase().includes(lowerKeyword)
    );
  },
  
  /**
   * 노드 간 최단 경로 찾기
   * @param {Object} graph 그래프 데이터
   * @param {string} sourceId 시작 노드 ID
   * @param {string} targetId 목표 노드 ID
   * @returns {Array} 경로상 노드와 관계 배열
   */
  findShortestPath(graph, sourceId, targetId) {
    // 간단한 BFS 구현
    const queue = [{ id: sourceId, path: [] }];
    const visited = new Set([sourceId]);
    
    while (queue.length > 0) {
      const { id, path } = queue.shift();
      
      // 목표 노드 도달 시
      if (id === targetId) {
        return path;
      }
      
      // 현재 노드에서 갈 수 있는 모든 관계 탐색
      const relations = graph.relations.filter(
        r => r.source === id || r.target === id
      );
      
      for (const relation of relations) {
        const nextId = relation.source === id ? relation.target : relation.source;
        
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push({
            id: nextId,
            path: [...path, { 
              relation, 
              node: graph.nodes.find(n => n.id === nextId)
            }]
          });
        }
      }
    }
    
    return []; // 경로 없음
  },
  
  /**
   * PubMed 데이터를 그래프에 통합
   * @param {Object} graph 그래프 데이터
   * @param {string} keyword PubMed 검색 키워드
   * @returns {Promise<Object>} 업데이트된 그래프
   */
  async integrateFromPubMed(graph, keyword) {
    try {
      // PubMed 검색
      const articles = await pubmedService.searchHeartRelated(keyword);
      
      if (!articles || articles.length === 0) {
        return graph;
      }
      
      let updatedGraph = { ...graph };
      
      // 각 논문을 노드로 추가
      for (const article of articles) {
        const nodeId = `pubmed_${article.pmid}`;
        
        const researchNode = {
          id: nodeId,
          type: this.NODE_TYPES.RESEARCH,
          name: article.title,
          description: article.abstract,
          source: 'pubmed',
          url: article.url,
          metadata: {
            authors: article.authors,
            journal: article.journal,
            pubDate: article.pubDate
          }
        };
        
        updatedGraph = this.addNode(updatedGraph, researchNode);
        
        // 키워드와 논문 연결
        if (keyword) {
          const keywordNodeId = `keyword_${keyword.replace(/\s+/g, '_').toLowerCase()}`;
          
          // 키워드 노드가 없으면 추가
          const keywordExists = updatedGraph.nodes.some(n => n.id === keywordNodeId);
          
          if (!keywordExists) {
            updatedGraph = this.addNode(updatedGraph, {
              id: keywordNodeId,
              type: 'keyword',
              name: keyword,
              description: `'${keyword}' 관련 의학 정보`
            });
          }
          
          // 관계 추가
          updatedGraph = this.addRelation(updatedGraph, {
            source: keywordNodeId,
            target: nodeId,
            type: this.RELATION_TYPES.RESEARCHES
          });
        }
      }
      
      await this.saveGraph(updatedGraph);
      return updatedGraph;
    } catch (error) {
      console.error('PubMed 통합 오류:', error);
      return graph;
    }
  },
  
  /**
   * 사용자 상호작용 기반 지식 그래프 확장
   * @param {Object} graph 그래프 데이터
   * @param {Object} interaction 사용자 상호작용
   * @returns {Promise<Object>} 업데이트된 그래프
   */
  async expandFromInteraction(graph, interaction) {
    try {
      if (!interaction || !interaction.query) {
        return graph;
      }
      
      const { query, response, healthData } = interaction;
      
      // 임시 ID 생성 (실제 구현에서는 적절한 ID 생성 방식 사용)
      const interactionId = `interaction_${Date.now()}`;
      
      // 상호작용을 노드로 추가
      let updatedGraph = this.addNode(graph, {
        id: interactionId,
        type: 'interaction',
        name: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
        description: response,
        metadata: {
          healthData,
          timestamp: new Date().toISOString()
        }
      });
      
      // 관련 키워드 추출 (간단한 구현)
      const keywords = this.extractKeywords(query);
      
      // 키워드 노드 추가 및 연결
      for (const keyword of keywords) {
        const keywordId = `keyword_${keyword.replace(/\s+/g, '_').toLowerCase()}`;
        
        // 키워드 노드가 없으면 추가
        const keywordExists = updatedGraph.nodes.some(n => n.id === keywordId);
        
        if (!keywordExists) {
          updatedGraph = this.addNode(updatedGraph, {
            id: keywordId,
            type: 'keyword',
            name: keyword,
            description: `'${keyword}' 관련 의학 정보`
          });
        }
        
        // 관계 추가
        updatedGraph = this.addRelation(updatedGraph, {
          source: keywordId,
          target: interactionId,
          type: 'relates_to'
        });
      }
      
      await this.saveGraph(updatedGraph);
      return updatedGraph;
    } catch (error) {
      console.error('상호작용 기반 확장 오류:', error);
      return graph;
    }
  },
  
  /**
   * 간단한 키워드 추출 함수
   * @param {string} text 분석할 텍스트
   * @returns {Array} 추출된 키워드 배열
   */
  extractKeywords(text) {
    if (!text) return [];
    
    // 실제 구현에서는 더 정교한 NLP 기술 사용 필요
    const medicalTerms = [
      '심장', '폐', '간', '신장', '뇌', '혈액', '혈압', '맥박', 
      '심박수', '산소포화도', '콜레스테롤', '당뇨', '고혈압',
      '저혈압', '빈맥', '서맥', '부정맥', '심전도', 'ECG', 'EKG',
      '심근경색', '뇌졸중', '협심증', '심부전', '동맥', '정맥'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    return medicalTerms.filter(term => 
      words.includes(term.toLowerCase()) || 
      text.toLowerCase().includes(term.toLowerCase())
    );
  }
}; 