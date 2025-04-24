/**
 * 의료 멀티모달 AI 시스템 - 의학 지식 그래프
 * 의학 지식을 효율적으로 저장하고 관리하는 그래프 데이터베이스
 */

// 노드 타입 정의
export type NodeType = 'disease' | 'symptom' | 'treatment' | 'medication' | 'research' | 'entity';

// 관계 타입 정의
export type RelationType = 'causes' | 'treats' | 'indicates' | 'contradictsTo' | 'relatedTo';

// 지식 노드 인터페이스
export interface MedicalNode {
  id: string;
  type: NodeType;
  name: string;
  content: string;
  metadata?: Record<string, any>;
  lastUpdated: number;
}

// 노드 간 관계 인터페이스
export interface NodeRelation {
  source: string; // 소스 노드 ID
  target: string; // 타겟 노드 ID
  type: RelationType;
  weight: number; // 관계 강도 (0-1)
  evidence?: string; // 근거
  lastUpdated: number;
}

/**
 * 의학 지식 그래프 클래스
 * 의학 지식을 그래프 형태로 저장하고 관리합니다.
 */
export class MedicalKnowledgeGraph {
  private static instance: MedicalKnowledgeGraph;
  private nodes: Map<string, MedicalNode> = new Map();
  private relations: NodeRelation[] = [];

  private constructor() {
    console.log('의학 지식 그래프 초기화...');
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): MedicalKnowledgeGraph {
    if (!MedicalKnowledgeGraph.instance) {
      MedicalKnowledgeGraph.instance = new MedicalKnowledgeGraph();
    }
    return MedicalKnowledgeGraph.instance;
  }

  /**
   * 노드 추가
   * @param node 의학 지식 노드
   */
  public addNode(node: MedicalNode): void {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
      console.log(`노드 추가: ${node.type} - ${node.name}`);
    } else {
      // 기존 노드 업데이트
      const existingNode = this.nodes.get(node.id)!;
      const updatedNode = { ...existingNode, ...node, lastUpdated: Date.now() };
      this.nodes.set(node.id, updatedNode);
      console.log(`노드 업데이트: ${node.type} - ${node.name}`);
    }
  }

  /**
   * 관계 추가
   * @param relation 노드 간 관계
   */
  public addRelation(relation: NodeRelation): void {
    // 소스 및 타겟 노드 존재 여부 확인
    if (!this.nodes.has(relation.source) || !this.nodes.has(relation.target)) {
      console.error(`관계 추가 실패: 존재하지 않는 노드 - ${relation.source} 또는 ${relation.target}`);
      return;
    }

    // 기존 관계와 중복 확인
    const existingIndex = this.relations.findIndex(r => 
      r.source === relation.source && 
      r.target === relation.target && 
      r.type === relation.type
    );

    if (existingIndex >= 0) {
      // 기존 관계 업데이트
      this.relations[existingIndex] = { 
        ...this.relations[existingIndex], 
        ...relation,
        lastUpdated: Date.now()
      };
      console.log(`관계 업데이트: ${relation.source} -[${relation.type}]-> ${relation.target}`);
    } else {
      // 새 관계 추가
      this.relations.push({
        ...relation,
        lastUpdated: relation.lastUpdated || Date.now()
      });
      console.log(`관계 추가: ${relation.source} -[${relation.type}]-> ${relation.target}`);
    }
  }

  /**
   * 노드 검색
   * @param type 노드 타입 (선택 사항)
   * @param query 검색 쿼리
   */
  public findNodes(query: string, type?: NodeType): MedicalNode[] {
    const queryLower = query.toLowerCase();
    const results = Array.from(this.nodes.values())
      .filter(node => {
        if (type && node.type !== type) {
          return false;
        }
        return (
          node.name.toLowerCase().includes(queryLower) ||
          node.content.toLowerCase().includes(queryLower)
        );
      });
    
    console.log(`검색 결과: "${query}" - ${results.length}개 노드 발견`);
    return results;
  }

  /**
   * 노드 관계 검색
   * @param nodeId 노드 ID
   */
  public findRelations(nodeId: string): NodeRelation[] {
    const results = this.relations.filter(r => 
      r.source === nodeId || r.target === nodeId
    );
    
    console.log(`노드 ${nodeId}의 관계: ${results.length}개 발견`);
    return results;
  }

  /**
   * PubMed에서 지식 가져와 확장
   * @param query 검색 쿼리
   */
  public async expandFromPubMed(query: string): Promise<number> {
    console.log(`PubMed에서 지식 확장: "${query}"`);
    
    try {
      // PubMed API 호출 함수 (별도 구현 필요)
      const pubmedSearch = async (q: string) => {
        // 실제 구현에서는 PubMed API 호출
        console.log(`PubMed 검색: ${q}`);
        return []; // 테스트용 빈 배열 반환
      };
      
      const articles = await pubmedSearch(query);
      let addedCount = 0;
      
      for (const article of articles) {
        const nodeId = `pubmed_${article.pmid}`;
        
        this.addNode({
          id: nodeId,
          type: 'research',
          name: article.title || '제목 없음',
          content: article.abstract || '',
          metadata: {
            pmid: article.pmid,
            authors: article.authors,
            journal: article.journal,
            year: article.year
          },
          lastUpdated: Date.now()
        });
        
        addedCount++;
      }
      
      console.log(`PubMed에서 ${addedCount}개 노드 추가됨`);
      return addedCount;
    } catch (error) {
      console.error('PubMed 지식 확장 중 오류:', error);
      return 0;
    }
  }

  /**
   * 그래프 통계 조회
   */
  public getStatistics(): Record<string, any> {
    const nodesByType: Record<string, number> = {};
    const relationsByType: Record<string, number> = {};
    
    // 노드 타입별 통계
    this.nodes.forEach(node => {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    });
    
    // 관계 타입별 통계
    this.relations.forEach(relation => {
      relationsByType[relation.type] = (relationsByType[relation.type] || 0) + 1;
    });
    
    return {
      totalNodes: this.nodes.size,
      totalRelations: this.relations.length,
      nodesByType,
      relationsByType
    };
  }
}

// 기본 인스턴스 내보내기
export default MedicalKnowledgeGraph.getInstance(); 