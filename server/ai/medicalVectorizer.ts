import { db } from '../db/database';
import { monitoring } from '../utils/monitoring';
import { vectorStore, VectorizeResult } from './vectorStore';
import { embeddingService } from './embedding';
import { PubMedAPI, PubMedArticle } from '../api/pubmed';
import { KaggleAPI, KaggleDataset } from '../api/kaggle';
import { cache } from '../utils/cache';

/**
 * 의료 데이터 벡터화 옵션 인터페이스
 */
export interface MedicalVectorizationOptions {
  batchSize?: number;
  concurrentLimit?: number;
  metadataFields?: Record<string, string[]>;
  model?: string;
  skipExisting?: boolean;
  updateExisting?: boolean;
}

/**
 * 의료 데이터 벡터화 결과 인터페이스
 */
export interface MedicalVectorizationResult {
  type: string;
  total: number;
  processed: number;
  success: number;
  failed: number;
  skipped: number;
  errors: { id: string; error: string }[];
}

/**
 * 의료 데이터 자동 벡터화 서비스
 */
export class MedicalDataVectorizer {
  private static instance: MedicalDataVectorizer;
  private pubmedApi: PubMedAPI;
  private kaggleApi: KaggleAPI;
  private defaultModel: string;
  private maxConcurrent: number;
  private defaultBatchSize: number;
  
  /**
   * 생성자
   * @private
   */
  private constructor() {
    this.pubmedApi = PubMedAPI.getInstance();
    this.kaggleApi = KaggleAPI.getInstance();
    this.defaultModel = 'pritamdeka/S-PubMedBert-MS-MARCO'; // 의학 도메인 특화 모델
    this.maxConcurrent = 5; // 기본 동시 처리 제한 (API 요청 제한 고려)
    this.defaultBatchSize = 20; // 기본 배치 크기
    
    monitoring.log('ai', 'info', `의료 데이터 벡터화 서비스 초기화 완료 (기본 모델: ${this.defaultModel})`);
  }
  
  /**
   * MedicalDataVectorizer 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): MedicalDataVectorizer {
    if (!MedicalDataVectorizer.instance) {
      MedicalDataVectorizer.instance = new MedicalDataVectorizer();
    }
    return MedicalDataVectorizer.instance;
  }
  
  /**
   * 데이터베이스에서 PubMed 논문 목록을 가져옵니다
   * @param limit 최대 가져올 논문 수
   * @param offset 건너뛸 논문 수
   * @param filter 필터링 조건
   */
  private async getPubMedArticles(
    limit: number = 100,
    offset: number = 0,
    filter: string = ''
  ): Promise<{ articles: PubMedArticle[]; total: number }> {
    try {
      let query = `
        SELECT 
          pubmed_id as "pubmedId",
          title,
          abstract,
          authors,
          publication_date as "publicationDate",
          journal,
          doi,
          keywords,
          categories
        FROM medical_papers
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (filter) {
        query += ` AND ${filter}`;
      }
      
      query += ' ORDER BY publication_date DESC LIMIT $1 OFFSET $2';
      params.push(limit, offset);
      
      const result = await db.query(query, params);
      
      // 총 논문 수 조회
      let countQuery = 'SELECT COUNT(*) FROM medical_papers';
      if (filter) {
        countQuery += ` WHERE ${filter}`;
      }
      
      const countResult = await db.query(countQuery);
      
      return {
        articles: result.rows,
        total: parseInt(countResult.rows[0].count, 10)
      };
    } catch (error) {
      monitoring.log('database', 'error', `PubMed 논문 조회 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 데이터베이스에서 Kaggle 데이터셋 목록을 가져옵니다
   * @param limit 최대 가져올 데이터셋 수
   * @param offset 건너뛸 데이터셋 수
   * @param filter 필터링 조건
   */
  private async getKaggleDatasets(
    limit: number = 100,
    offset: number = 0,
    filter: string = ''
  ): Promise<{ datasets: KaggleDataset[]; total: number }> {
    try {
      let query = `
        SELECT 
          kaggle_id as "id",
          title,
          description,
          owner as "ownerName",
          tags,
          last_updated as "lastUpdated",
          download_count as "downloadCount",
          file_size_bytes as "totalSize",
          file_formats as "fileTypes",
          license_name as "licenseName",
          url
        FROM medical_datasets
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (filter) {
        query += ` AND ${filter}`;
      }
      
      query += ' ORDER BY last_updated DESC LIMIT $1 OFFSET $2';
      params.push(limit, offset);
      
      const result = await db.query(query, params);
      
      // 총 데이터셋 수 조회
      let countQuery = 'SELECT COUNT(*) FROM medical_datasets';
      if (filter) {
        countQuery += ` WHERE ${filter}`;
      }
      
      const countResult = await db.query(countQuery);
      
      return {
        datasets: result.rows,
        total: parseInt(countResult.rows[0].count, 10)
      };
    } catch (error) {
      monitoring.log('database', 'error', `Kaggle 데이터셋 조회 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * PubMed 논문 벡터화
   * @param article PubMed 논문
   * @param options 벡터화 옵션
   */
  private async vectorizePubMedArticle(
    article: PubMedArticle,
    options: MedicalVectorizationOptions = {}
  ): Promise<VectorizeResult> {
    try {
      const { model = this.defaultModel, metadataFields } = options;
      
      // 메타데이터 추출
      const metadata: Record<string, any> = {};
      
      if (metadataFields?.pubmed) {
        for (const field of metadataFields.pubmed) {
          if (field in article) {
            metadata[field] = article[field as keyof PubMedArticle];
          }
        }
      }
      
      // 임베딩을 위한 텍스트 준비 (제목 + 초록)
      const text = `${article.title || ''}\n\n${article.abstract || ''}`.trim();
      
      if (!text) {
        return {
          objectId: article.pubmedId,
          objectType: 'pubmed_article',
          success: false,
          error: '벡터화할 텍스트가 없습니다'
        };
      }
      
      // 벡터화 요청
      return await vectorStore.vectorizeObject(
        article.pubmedId,
        'pubmed_article',
        text,
        {
          title: article.title,
          authors: article.authors,
          journal: article.journal,
          publicationDate: article.publicationDate,
          ...metadata
        },
        model
      );
    } catch (error) {
      monitoring.log('ai', 'error', `PubMed 논문 벡터화 오류 (${article.pubmedId}): ${error.message}`);
      
      return {
        objectId: article.pubmedId,
        objectType: 'pubmed_article',
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Kaggle 데이터셋 벡터화
   * @param dataset Kaggle 데이터셋
   * @param options 벡터화 옵션
   */
  private async vectorizeKaggleDataset(
    dataset: KaggleDataset,
    options: MedicalVectorizationOptions = {}
  ): Promise<VectorizeResult> {
    try {
      const { model = this.defaultModel, metadataFields } = options;
      
      // 메타데이터 추출
      const metadata: Record<string, any> = {};
      
      if (metadataFields?.kaggle) {
        for (const field of metadataFields.kaggle) {
          if (field in dataset) {
            metadata[field] = dataset[field as keyof KaggleDataset];
          }
        }
      }
      
      // 임베딩을 위한 텍스트 준비 (제목 + 설명)
      const text = `${dataset.title || ''}\n\n${dataset.description || ''}`.trim();
      
      if (!text) {
        return {
          objectId: dataset.id,
          objectType: 'kaggle_dataset',
          success: false,
          error: '벡터화할 텍스트가 없습니다'
        };
      }
      
      // 벡터화 요청
      return await vectorStore.vectorizeObject(
        dataset.id,
        'kaggle_dataset',
        text,
        {
          title: dataset.title,
          owner: dataset.ownerName,
          tags: dataset.tags,
          lastUpdated: dataset.lastUpdated,
          ...metadata
        },
        model
      );
    } catch (error) {
      monitoring.log('ai', 'error', `Kaggle 데이터셋 벡터화 오류 (${dataset.id}): ${error.message}`);
      
      return {
        objectId: dataset.id,
        objectType: 'kaggle_dataset',
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 배열을 지정된 크기의 청크로 분할
   * @private
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * 비동기 작업을 동시성 제한과 함께 병렬 처리
   * @private
   */
  private async processInBatches<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrentLimit: number
  ): Promise<R[]> {
    const results: R[] = [];
    const chunks = this.chunk(items, concurrentLimit);
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk.map(item => fn(item)));
      results.push(...chunkResults);
    }
    
    return results;
  }
  
  /**
   * PubMed 논문 벡터화 실행
   * @param options 벡터화 옵션
   */
  public async vectorizePubMedArticles(
    options: MedicalVectorizationOptions = {}
  ): Promise<MedicalVectorizationResult> {
    try {
      const {
        batchSize = this.defaultBatchSize,
        concurrentLimit = this.maxConcurrent,
        skipExisting = true,
        updateExisting = false,
        ...vectorizeOptions
      } = options;
      
      const result: MedicalVectorizationResult = {
        type: 'pubmed_article',
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
      };
      
      // 마지막 처리 위치 가져오기
      const lastProcessedKey = 'pubmed_vectorize_last_offset';
      let offset = 0;
      
      if (skipExisting) {
        const lastOffset = await cache.get<number>(lastProcessedKey);
        if (lastOffset) {
          offset = lastOffset;
        }
      }
      
      // 필터 구성 (updateExisting이 false인 경우 벡터화되지 않은 문서만 선택)
      let filter = '';
      if (!updateExisting) {
        filter = `NOT EXISTS (
          SELECT 1 FROM vector_embeddings 
          WHERE object_type = 'pubmed_article' AND object_id = pubmed_id
        )`;
      }
      
      // 총 논문 수 및 대상 논문 목록 가져오기
      const { articles, total } = await this.getPubMedArticles(batchSize, offset, filter);
      result.total = total;
      
      if (articles.length === 0) {
        monitoring.log('ai', 'info', '벡터화할 PubMed 논문이 없습니다');
        return result;
      }
      
      monitoring.log('ai', 'info', `PubMed 논문 벡터화 시작: 총 ${total}개 중 ${offset} ~ ${offset + articles.length}`);
      
      // 논문 벡터화 처리
      const vectorizeResults = await this.processInBatches(
        articles,
        article => this.vectorizePubMedArticle(article, vectorizeOptions),
        concurrentLimit
      );
      
      // 결과 집계
      result.processed = vectorizeResults.length;
      
      for (const vr of vectorizeResults) {
        if (vr.success) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push({
            id: vr.objectId,
            error: vr.error || '알 수 없는 오류'
          });
        }
      }
      
      // 처리 위치 저장 (스킵된 항목 포함)
      await cache.set(lastProcessedKey, offset + articles.length, { ttl: 86400 * 30 }); // 30일 캐싱
      
      monitoring.log('ai', 'info', `PubMed 논문 벡터화 완료: 처리 ${result.processed}개, 성공 ${result.success}개, 실패 ${result.failed}개`);
      
      return result;
    } catch (error) {
      monitoring.log('ai', 'error', `PubMed 논문 벡터화 작업 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Kaggle 데이터셋 벡터화 실행
   * @param options 벡터화 옵션
   */
  public async vectorizeKaggleDatasets(
    options: MedicalVectorizationOptions = {}
  ): Promise<MedicalVectorizationResult> {
    try {
      const {
        batchSize = this.defaultBatchSize,
        concurrentLimit = this.maxConcurrent,
        skipExisting = true,
        updateExisting = false,
        ...vectorizeOptions
      } = options;
      
      const result: MedicalVectorizationResult = {
        type: 'kaggle_dataset',
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
      };
      
      // 마지막 처리 위치 가져오기
      const lastProcessedKey = 'kaggle_vectorize_last_offset';
      let offset = 0;
      
      if (skipExisting) {
        const lastOffset = await cache.get<number>(lastProcessedKey);
        if (lastOffset) {
          offset = lastOffset;
        }
      }
      
      // 필터 구성 (updateExisting이 false인 경우 벡터화되지 않은 문서만 선택)
      let filter = '';
      if (!updateExisting) {
        filter = `NOT EXISTS (
          SELECT 1 FROM vector_embeddings 
          WHERE object_type = 'kaggle_dataset' AND object_id = kaggle_id
        )`;
      }
      
      // 총 데이터셋 수 및 대상 데이터셋 목록 가져오기
      const { datasets, total } = await this.getKaggleDatasets(batchSize, offset, filter);
      result.total = total;
      
      if (datasets.length === 0) {
        monitoring.log('ai', 'info', '벡터화할 Kaggle 데이터셋이 없습니다');
        return result;
      }
      
      monitoring.log('ai', 'info', `Kaggle 데이터셋 벡터화 시작: 총 ${total}개 중 ${offset} ~ ${offset + datasets.length}`);
      
      // 데이터셋 벡터화 처리
      const vectorizeResults = await this.processInBatches(
        datasets,
        dataset => this.vectorizeKaggleDataset(dataset, vectorizeOptions),
        concurrentLimit
      );
      
      // 결과 집계
      result.processed = vectorizeResults.length;
      
      for (const vr of vectorizeResults) {
        if (vr.success) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push({
            id: vr.objectId,
            error: vr.error || '알 수 없는 오류'
          });
        }
      }
      
      // 처리 위치 저장 (스킵된 항목 포함)
      await cache.set(lastProcessedKey, offset + datasets.length, { ttl: 86400 * 30 }); // 30일 캐싱
      
      monitoring.log('ai', 'info', `Kaggle 데이터셋 벡터화 완료: 처리 ${result.processed}개, 성공 ${result.success}개, 실패 ${result.failed}개`);
      
      return result;
    } catch (error) {
      monitoring.log('ai', 'error', `Kaggle 데이터셋 벡터화 작업 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 새로운 의학 논문 벡터화를 위한 스케줄러 작업 실행
   */
  public async scheduledVectorization(): Promise<{
    pubmed: MedicalVectorizationResult;
    kaggle: MedicalVectorizationResult;
  }> {
    monitoring.log('ai', 'info', '스케줄된 의료 데이터 벡터화 작업 시작');
    
    // 기본 벡터화 옵션
    const options: MedicalVectorizationOptions = {
      batchSize: 50,
      concurrentLimit: this.maxConcurrent,
      skipExisting: true,
      updateExisting: false,
      metadataFields: {
        pubmed: ['journal', 'authors', 'publicationDate', 'keywords'],
        kaggle: ['tags', 'ownerName', 'lastUpdated']
      }
    };
    
    try {
      // PubMed 논문 및 Kaggle 데이터셋 병렬 처리
      const [pubmedResult, kaggleResult] = await Promise.all([
        this.vectorizePubMedArticles(options),
        this.vectorizeKaggleDatasets(options)
      ]);
      
      monitoring.log('ai', 'info', '스케줄된 의료 데이터 벡터화 작업 완료');
      
      return {
        pubmed: pubmedResult,
        kaggle: kaggleResult
      };
    } catch (error) {
      monitoring.log('ai', 'error', `스케줄된 의료 데이터 벡터화 작업 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 특정 PubMed 논문 상세 청크 처리
   * @param pubmedId PubMed ID
   */
  public async processPubMedArticleChunks(pubmedId: string): Promise<{
    success: boolean;
    pubmedId: string;
    chunkCount?: number;
    error?: string;
  }> {
    try {
      // 논문 데이터 가져오기
      const article = await this.pubmedApi.getArticleById(pubmedId);
      
      if (!article) {
        return {
          success: false,
          pubmedId,
          error: '논문을 찾을 수 없습니다'
        };
      }
      
      // 논문 전체 텍스트 준비
      const fullText = [
        `Title: ${article.title || ''}`,
        `Authors: ${(article.authors || []).join(', ')}`,
        `Abstract: ${article.abstract || ''}`,
        `Journal: ${article.journal || ''}`,
        `Keywords: ${(article.keywords || []).join(', ')}`,
        `Publication Date: ${article.publicationDate ? article.publicationDate.toISOString().split('T')[0] : ''}`
      ].join('\n\n');
      
      // 청크 처리
      const result = await vectorStore.storeDocumentChunks(
        {
          id: pubmedId,
          type: 'pubmed_article',
          metadata: {
            title: article.title,
            journal: article.journal,
            publicationDate: article.publicationDate,
            doi: article.doi
          }
        },
        fullText,
        {
          chunkSize: 300,
          chunkOverlap: 50
        },
        this.defaultModel
      );
      
      return {
        success: result.success,
        pubmedId,
        chunkCount: result.chunkCount,
        error: result.error
      };
    } catch (error) {
      monitoring.log('ai', 'error', `PubMed 논문 청크 처리 오류 (${pubmedId}): ${error.message}`);
      
      return {
        success: false,
        pubmedId,
        error: error.message
      };
    }
  }
}

// 의료 데이터 벡터화 서비스 인스턴스 생성 및 내보내기
export const medicalVectorizer = MedicalDataVectorizer.getInstance(); 