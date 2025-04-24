import axios from 'axios';
import { monitoring } from '../utils/monitoring';
import { config } from '../config';
import { cache } from '../utils/cache';

/**
 * 의학 엔티티 타입 정의
 */
export enum MedicalEntityType {
  DISEASE = 'DISEASE',
  CHEMICAL = 'CHEMICAL',
  GENE = 'GENE',
  SPECIES = 'SPECIES',
  PROCEDURE = 'PROCEDURE',
  ANATOMY = 'ANATOMY',
  SYMPTOM = 'SYMPTOM',
  DRUG = 'DRUG',
  DEVICE = 'DEVICE',
  OTHER = 'OTHER'
}

/**
 * 추출된 의학 엔티티 인터페이스
 */
export interface MedicalEntity {
  text: string;
  type: MedicalEntityType;
  startPosition?: number;
  endPosition?: number;
  confidence?: number;
  normalizedText?: string;
  id?: string; // UMLS 또는 MeSH ID
}

/**
 * 엔티티 추출 옵션 인터페이스
 */
export interface EntityExtractionOptions {
  text: string;
  types?: MedicalEntityType[];
  minConfidence?: number;
  includePositions?: boolean;
  includeNormalization?: boolean;
  useCache?: boolean;
  cacheTTL?: number;
}

/**
 * 의학 엔티티 추출기 클래스
 * SciSpaCy 모델을 사용하여 의학 텍스트에서 엔티티를 추출하고 분류
 */
export class MedicalEntityExtractor {
  private static instance: MedicalEntityExtractor;
  private apiEndpoint: string;
  private apiKey: string;
  private defaultModel: string;
  private modelToTypeMap: Map<string, MedicalEntityType[]>;
  
  /**
   * 생성자
   * @private
   */
  private constructor() {
    this.apiEndpoint = config.medicalNlp?.apiEndpoint || 'http://localhost:5000/extract';
    this.apiKey = config.medicalNlp?.apiKey || '';
    this.defaultModel = config.medicalNlp?.defaultModel || 'en_ner_bc5cdr_md';
    
    // 모델별 지원 엔티티 타입 매핑
    this.modelToTypeMap = new Map([
      ['en_ner_bc5cdr_md', [MedicalEntityType.DISEASE, MedicalEntityType.CHEMICAL]],
      ['en_ner_craft_md', [MedicalEntityType.GENE, MedicalEntityType.SPECIES, MedicalEntityType.CHEMICAL]],
      ['en_ner_jnlpba_md', [MedicalEntityType.GENE, MedicalEntityType.CHEMICAL]],
      ['en_ner_bionlp13cg_md', [
        MedicalEntityType.DISEASE, 
        MedicalEntityType.GENE, 
        MedicalEntityType.CHEMICAL,
        MedicalEntityType.ANATOMY,
        MedicalEntityType.PROCEDURE
      ]]
    ]);
    
    monitoring.log('ai', 'info', `의학 엔티티 추출기 초기화 완료`);
  }
  
  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): MedicalEntityExtractor {
    if (!MedicalEntityExtractor.instance) {
      MedicalEntityExtractor.instance = new MedicalEntityExtractor();
    }
    return MedicalEntityExtractor.instance;
  }
  
  /**
   * 텍스트에서 의학 엔티티 추출
   * @param options 추출 옵션
   * @returns 추출된 엔티티 배열
   */
  public async extractEntities(options: EntityExtractionOptions): Promise<MedicalEntity[]> {
    try {
      const {
        text,
        types,
        minConfidence = 0.5,
        includePositions = true,
        includeNormalization = false,
        useCache = true,
        cacheTTL = 86400 // 1일
      } = options;
      
      if (!text || text.length === 0) {
        return [];
      }
      
      // 캐시 처리
      if (useCache) {
        const cacheKey = `entity_extraction:${Buffer.from(text.slice(0, 200)).toString('base64')}:${types?.join(',')}:${minConfidence}`;
        const cachedResult = await cache.get(cacheKey);
        
        if (cachedResult) {
          monitoring.log('ai', 'debug', `캐시된 엔티티 추출 결과 사용: ${text.slice(0, 50)}...`);
          return cachedResult;
        }
      }
      
      // 최적의 모델 선택
      const model = this.selectModelForEntityTypes(types);
      
      // API 호출
      const entities = await this.callExtractionAPI(text, model, {
        minConfidence,
        includePositions,
        includeNormalization
      });
      
      // 타입 필터링
      const filteredEntities = types 
        ? entities.filter(entity => types.includes(entity.type))
        : entities;
      
      // 결과 캐싱
      if (useCache && filteredEntities.length > 0) {
        const cacheKey = `entity_extraction:${Buffer.from(text.slice(0, 200)).toString('base64')}:${types?.join(',')}:${minConfidence}`;
        await cache.set(cacheKey, filteredEntities, { ttl: cacheTTL });
      }
      
      return filteredEntities;
    } catch (error) {
      monitoring.log('ai', 'error', `의학 엔티티 추출 오류: ${error.message}`);
      return [];
    }
  }
  
  /**
   * 요청된 엔티티 타입에 최적화된 모델 선택
   * @private
   */
  private selectModelForEntityTypes(types?: MedicalEntityType[]): string {
    if (!types || types.length === 0) {
      return this.defaultModel;
    }
    
    // 각 모델이 지원하는 요청된 엔티티 타입 수 계산
    const modelScores = new Map<string, number>();
    
    for (const [model, supportedTypes] of this.modelToTypeMap.entries()) {
      const matchingTypes = types.filter(type => supportedTypes.includes(type));
      modelScores.set(model, matchingTypes.length);
    }
    
    // 가장 많은 요청 타입을 지원하는 모델 선택
    let bestModel = this.defaultModel;
    let highestScore = 0;
    
    for (const [model, score] of modelScores.entries()) {
      if (score > highestScore) {
        highestScore = score;
        bestModel = model;
      }
    }
    
    return bestModel;
  }
  
  /**
   * 엔티티 추출 API 호출
   * @private
   */
  private async callExtractionAPI(
    text: string,
    model: string,
    options: {
      minConfidence: number;
      includePositions: boolean;
      includeNormalization: boolean;
    }
  ): Promise<MedicalEntity[]> {
    try {
      // API가 구성되지 않은 경우, 로컬 처리 시뮬레이션
      if (!this.apiEndpoint || this.apiEndpoint.includes('localhost')) {
        return this.simulateLocalExtraction(text, model, options);
      }
      
      const response = await axios.post(
        this.apiEndpoint,
        {
          text,
          model,
          min_confidence: options.minConfidence,
          include_positions: options.includePositions,
          include_normalization: options.includeNormalization
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
          }
        }
      );
      
      if (response.status === 200 && response.data.entities) {
        return response.data.entities.map((entity: any) => ({
          text: entity.text,
          type: entity.type as MedicalEntityType,
          startPosition: entity.start_position,
          endPosition: entity.end_position,
          confidence: entity.confidence,
          normalizedText: entity.normalized_text,
          id: entity.id
        }));
      }
      
      return [];
    } catch (error) {
      monitoring.log('ai', 'error', `엔티티 추출 API 호출 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 로컬에서 간단한 엔티티 추출 시뮬레이션 (테스트용/폴백)
   * 실제 구현에서는 Python SciSpaCy 모듈 호출 등으로 대체
   * @private
   */
  private simulateLocalExtraction(
    text: string,
    model: string,
    options: {
      minConfidence: number;
      includePositions: boolean;
      includeNormalization: boolean;
    }
  ): MedicalEntity[] {
    const entities: MedicalEntity[] = [];
    const modelTypes = this.modelToTypeMap.get(model) || [];
    
    // 샘플 질병 단어
    const diseaseTerms = ['cancer', 'diabetes', 'asthma', 'hypertension', 'covid', 'alzheimer'];
    // 샘플 화학물질/약물 단어
    const chemicalTerms = ['aspirin', 'ibuprofen', 'paracetamol', 'metformin', 'insulin'];
    // 샘플 유전자 단어
    const geneTerms = ['BRCA1', 'BRCA2', 'TP53', 'EGFR', 'HER2'];
    
    // 텍스트에서 간단한 단어 매칭 (실제 구현에서는 NLP 모델을 사용)
    const words = text.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      const cleanWord = word.replace(/[.,;:?!()]/g, '');
      
      if (diseaseTerms.includes(cleanWord) && modelTypes.includes(MedicalEntityType.DISEASE)) {
        const index = text.toLowerCase().indexOf(cleanWord);
        entities.push({
          text: cleanWord,
          type: MedicalEntityType.DISEASE,
          startPosition: options.includePositions ? index : undefined,
          endPosition: options.includePositions ? index + cleanWord.length : undefined,
          confidence: 0.8 + Math.random() * 0.2,
          normalizedText: options.includeNormalization ? cleanWord : undefined
        });
      } else if (chemicalTerms.includes(cleanWord) && 
                (modelTypes.includes(MedicalEntityType.CHEMICAL) || modelTypes.includes(MedicalEntityType.DRUG))) {
        const index = text.toLowerCase().indexOf(cleanWord);
        entities.push({
          text: cleanWord,
          type: MedicalEntityType.CHEMICAL,
          startPosition: options.includePositions ? index : undefined,
          endPosition: options.includePositions ? index + cleanWord.length : undefined,
          confidence: 0.8 + Math.random() * 0.2,
          normalizedText: options.includeNormalization ? cleanWord : undefined
        });
      } else if (geneTerms.includes(cleanWord) && modelTypes.includes(MedicalEntityType.GENE)) {
        const index = text.toLowerCase().indexOf(cleanWord);
        entities.push({
          text: cleanWord,
          type: MedicalEntityType.GENE,
          startPosition: options.includePositions ? index : undefined,
          endPosition: options.includePositions ? index + cleanWord.length : undefined,
          confidence: 0.8 + Math.random() * 0.2,
          normalizedText: options.includeNormalization ? cleanWord : undefined
        });
      }
    }
    
    // 신뢰도 필터링
    return entities.filter(entity => entity.confidence! >= options.minConfidence);
  }
  
  /**
   * 두 텍스트 간의 의학 엔티티 비교
   * @param text1 첫 번째 텍스트
   * @param text2 두 번째 텍스트
   * @returns 공통 엔티티 및 고유 엔티티 정보
   */
  public async compareEntities(text1: string, text2: string): Promise<{
    common: MedicalEntity[];
    uniqueToFirst: MedicalEntity[];
    uniqueToSecond: MedicalEntity[];
  }> {
    try {
      // 양쪽 텍스트에서 엔티티 추출
      const [entities1, entities2] = await Promise.all([
        this.extractEntities({ text: text1 }),
        this.extractEntities({ text: text2 })
      ]);
      
      // 텍스트 기반으로 엔티티 비교
      const common: MedicalEntity[] = [];
      const uniqueToFirst: MedicalEntity[] = [];
      const uniqueToSecond: MedicalEntity[] = [];
      
      // 첫 번째 텍스트의 엔티티 분류
      for (const entity1 of entities1) {
        const matchInSecond = entities2.find(entity2 => 
          entity2.text.toLowerCase() === entity1.text.toLowerCase() && 
          entity2.type === entity1.type
        );
        
        if (matchInSecond) {
          common.push(entity1);
        } else {
          uniqueToFirst.push(entity1);
        }
      }
      
      // 두 번째 텍스트의 고유 엔티티 찾기
      for (const entity2 of entities2) {
        const matchInFirst = entities1.find(entity1 => 
          entity1.text.toLowerCase() === entity2.text.toLowerCase() && 
          entity1.type === entity2.type
        );
        
        if (!matchInFirst) {
          uniqueToSecond.push(entity2);
        }
      }
      
      return { common, uniqueToFirst, uniqueToSecond };
    } catch (error) {
      monitoring.log('ai', 'error', `엔티티 비교 오류: ${error.message}`);
      return { common: [], uniqueToFirst: [], uniqueToSecond: [] };
    }
  }
  
  /**
   * 텍스트에서 가장 중요한 의학 엔티티 추출
   * @param text 분석할 텍스트
   * @param limit 반환할 최대 엔티티 수
   * @returns 중요도 순으로 정렬된 엔티티
   */
  public async extractKeyEntities(text: string, limit: number = 5): Promise<MedicalEntity[]> {
    try {
      // 모든 엔티티 추출
      const allEntities = await this.extractEntities({
        text,
        minConfidence: 0.6,
        includeNormalization: true
      });
      
      // 빈도 및 신뢰도 기반 중요도 계산
      const entityMap = new Map<string, { entity: MedicalEntity; frequency: number }>();
      
      for (const entity of allEntities) {
        const key = `${entity.text.toLowerCase()}:${entity.type}`;
        
        if (entityMap.has(key)) {
          const current = entityMap.get(key)!;
          current.frequency += 1;
          
          // 더 높은 신뢰도 값으로 업데이트
          if (entity.confidence! > current.entity.confidence!) {
            current.entity = entity;
          }
        } else {
          entityMap.set(key, { entity, frequency: 1 });
        }
      }
      
      // 빈도와 신뢰도를 조합한 점수로 정렬
      const scoredEntities = Array.from(entityMap.values())
        .map(item => ({
          ...item.entity,
          score: item.frequency * (item.entity.confidence || 0.5)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ score, ...entity }) => entity);
      
      return scoredEntities;
    } catch (error) {
      monitoring.log('ai', 'error', `핵심 엔티티 추출 오류: ${error.message}`);
      return [];
    }
  }
}

export const medicalEntityExtractor = MedicalEntityExtractor.getInstance(); 