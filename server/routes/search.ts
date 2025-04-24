import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { monitoring } from '../utils/monitoring';
import { pubmedApi } from '../api/pubmed';
import { kaggleApi } from '../api/kaggle';
import { cache } from '../utils/cache';
import { db } from '../db/database';
import { vectorStore } from '../ai/vectorStore';
import { embeddingService } from '../ai/embedding';
import { medicalVectorizer } from '../ai/medicalVectorizer';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * /search/pubmed:
 *   get:
 *     summary: PubMed 검색
 *     description: PubMed에서 의학 논문을 검색합니다
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색어
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 최대 결과 수
 *       - in: query
 *         name: startIndex
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 시작 인덱스
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, date]
 *           default: relevance
 *         description: 정렬 기준
 *       - in: query
 *         name: minDate
 *         schema:
 *           type: string
 *         description: 최소 날짜 (YYYY/MM/DD)
 *       - in: query
 *         name: maxDate
 *         schema:
 *           type: string
 *         description: 최대 날짜 (YYYY/MM/DD)
 *       - in: query
 *         name: fullText
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 전체 텍스트 제공 논문만 필터링
 *     responses:
 *       200:
 *         description: 검색 결과
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 */
router.get('/pubmed', requireAuth, validate({
  query: {
    query: { type: 'string', min: 1 },
    maxResults: { type: 'number', optional: true, min: 1, max: 100 },
    startIndex: { type: 'number', optional: true, min: 0 },
    sortBy: { type: 'string', optional: true, enum: ['relevance', 'date'] },
    minDate: { type: 'string', optional: true, format: 'date' },
    maxDate: { type: 'string', optional: true, format: 'date' },
    fullText: { type: 'boolean', optional: true }
  }
}), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const searchQuery = req.query.query as string;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 20;
    const startIndex = req.query.startIndex ? parseInt(req.query.startIndex as string, 10) : 0;
    const sortBy = req.query.sortBy as 'relevance' | 'date' || 'relevance';
    const minDate = req.query.minDate as string;
    const maxDate = req.query.maxDate as string;
    const fullText = req.query.fullText === 'true';
    
    const cacheKey = `pubmed_search:${searchQuery}:${maxResults}:${startIndex}:${sortBy}:${minDate}:${maxDate}:${fullText}`;
    const cachedResult = await cache.get(cacheKey);
    
    if (cachedResult) {
      monitoring.log('search', 'info', `캐시된 PubMed 검색 결과 반환: ${searchQuery}`);
      return res.status(200).json({
        success: true,
        ...cachedResult
      });
    }
    
    monitoring.log('search', 'info', `PubMed 검색 시작: ${searchQuery}`);
    
    const searchResults = await pubmedApi.searchArticles({
      query: searchQuery,
      maxResults,
      startIndex,
      sortBy,
      minDate,
      maxDate,
      fullText
    });
    
    // 검색 기록 저장 (PubMed API 내부에서 처리됨)
    
    // 검색 결과 캐싱 (10분)
    await cache.set(cacheKey, searchResults, { ttl: 600 });
    
    res.status(200).json({
      success: true,
      ...searchResults
    });
  } catch (error) {
    monitoring.log('search', 'error', `PubMed 검색 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '검색 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /search/pubmed/save:
 *   post:
 *     summary: PubMed 논문 저장
 *     description: 검색된 PubMed 논문을 데이터베이스에 저장합니다
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - articles
 *             properties:
 *               articles:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: 논문 저장 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 */
router.post('/pubmed/save', requireAuth, validate({
  body: {
    articles: { type: 'array', min: 1 }
  }
}), async (req: Request, res: Response) => {
  try {
    const articles = req.body.articles;
    
    monitoring.log('search', 'info', `PubMed 논문 저장 시작: ${articles.length}개`);
    
    const savedCount = await pubmedApi.saveArticlesToDatabase(articles);
    
    res.status(200).json({
      success: true,
      data: {
        savedCount,
        totalCount: articles.length
      }
    });
  } catch (error) {
    monitoring.log('search', 'error', `PubMed 논문 저장 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '논문 저장 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /search/kaggle:
 *   get:
 *     summary: Kaggle 데이터셋 검색
 *     description: Kaggle에서 의학 데이터셋을 검색합니다
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색어
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 최대 결과 수
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, published, downloadCount, voteCount]
 *           default: relevance
 *         description: 정렬 기준
 *       - in: query
 *         name: fileType
 *         schema:
 *           type: string
 *         description: 파일 타입 필터
 *       - in: query
 *         name: hasTables
 *         schema:
 *           type: boolean
 *         description: 테이블 데이터 포함 여부
 *     responses:
 *       200:
 *         description: 검색 결과
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 */
router.get('/kaggle', requireAuth, validate({
  query: {
    query: { type: 'string', min: 1 },
    maxResults: { type: 'number', optional: true, min: 1, max: 100 },
    page: { type: 'number', optional: true, min: 1 },
    sortBy: { type: 'string', optional: true, enum: ['relevance', 'published', 'downloadCount', 'voteCount'] },
    fileType: { type: 'string', optional: true },
    hasTables: { type: 'boolean', optional: true }
  }
}), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const searchQuery = req.query.query as string;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 20;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const sortBy = req.query.sortBy as 'relevance' | 'published' | 'downloadCount' | 'voteCount' || 'relevance';
    const fileType = req.query.fileType as string;
    const hasTables = req.query.hasTables === 'true';
    
    const cacheKey = `kaggle_search:${searchQuery}:${maxResults}:${page}:${sortBy}:${fileType}:${hasTables}`;
    const cachedResult = await cache.get(cacheKey);
    
    if (cachedResult) {
      monitoring.log('search', 'info', `캐시된 Kaggle 검색 결과 반환: ${searchQuery}`);
      return res.status(200).json({
        success: true,
        data: cachedResult
      });
    }
    
    // Kaggle API 인증 확인
    const isAuthenticated = await kaggleApi.validateCredentials();
    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: 'Kaggle API 인증 정보가 유효하지 않습니다'
      });
    }
    
    monitoring.log('search', 'info', `Kaggle 검색 시작: ${searchQuery}`);
    
    const datasets = await kaggleApi.searchDatasets({
      query: searchQuery,
      maxResults,
      page,
      sortBy,
      fileType,
      hasTables
    });
    
    // 검색 결과 캐싱 (1시간)
    await cache.set(cacheKey, datasets, { ttl: 3600 });
    
    res.status(200).json({
      success: true,
      data: datasets
    });
  } catch (error) {
    monitoring.log('search', 'error', `Kaggle 검색 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '검색 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /search/kaggle/save:
 *   post:
 *     summary: Kaggle 데이터셋 저장
 *     description: 검색된 Kaggle 데이터셋을 데이터베이스에 저장합니다
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - datasets
 *             properties:
 *               datasets:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: 데이터셋 저장 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 */
router.post('/kaggle/save', requireAuth, validate({
  body: {
    datasets: { type: 'array', min: 1 }
  }
}), async (req: Request, res: Response) => {
  try {
    const datasets = req.body.datasets;
    
    monitoring.log('search', 'info', `Kaggle 데이터셋 저장 시작: ${datasets.length}개`);
    
    const savedCount = await kaggleApi.saveDatasetsToDatabase(datasets);
    
    res.status(200).json({
      success: true,
      data: {
        savedCount,
        totalCount: datasets.length
      }
    });
  } catch (error) {
    monitoring.log('search', 'error', `Kaggle 데이터셋 저장 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '데이터셋 저장 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /search/history:
 *   get:
 *     summary: 검색 기록 조회
 *     description: 사용자의 검색 기록을 조회합니다
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [pubmed, kaggle, all]
 *           default: all
 *         description: 검색 유형 필터
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 최대 결과 수
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 시작 인덱스
 *     responses:
 *       200:
 *         description: 검색 기록 조회 성공
 *       401:
 *         description: 인증되지 않음
 */
router.get('/history', requireAuth, validate({
  query: {
    type: { type: 'string', optional: true, enum: ['pubmed', 'kaggle', 'all'] },
    limit: { type: 'number', optional: true, min: 1, max: 100 },
    offset: { type: 'number', optional: true, min: 0 }
  }
}), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const type = req.query.type as string || 'all';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    let query = `
      SELECT id, search_query, search_type, result_count, created_at
      FROM search_history
      WHERE user_id = $1
    `;
    
    const queryParams = [userId];
    
    if (type !== 'all') {
      query += ` AND search_type = $2`;
      queryParams.push(type);
    }
    
    // 총 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM search_history
      WHERE user_id = $1
      ${type !== 'all' ? ' AND search_type = $2' : ''}
    `;
    
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);
    
    // 검색 기록 조회
    query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const result = await db.query(query, queryParams);
    
    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + result.rows.length < total
      }
    });
  } catch (error) {
    monitoring.log('search', 'error', `검색 기록 조회 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '검색 기록 조회 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /search/combined:
 *   get:
 *     summary: 통합 검색
 *     description: PubMed와 Kaggle을 동시에 검색합니다
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색어
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 각 소스별 최대 결과 수
 *     responses:
 *       200:
 *         description: 검색 결과
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 */
router.get('/combined', requireAuth, validate({
  query: {
    query: { type: 'string', min: 1 },
    maxResults: { type: 'number', optional: true, min: 1, max: 50 }
  }
}), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const searchQuery = req.query.query as string;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 10;
    
    const cacheKey = `combined_search:${searchQuery}:${maxResults}`;
    const cachedResult = await cache.get(cacheKey);
    
    if (cachedResult) {
      monitoring.log('search', 'info', `캐시된 통합 검색 결과 반환: ${searchQuery}`);
      return res.status(200).json({
        success: true,
        data: cachedResult
      });
    }
    
    monitoring.log('search', 'info', `통합 검색 시작: ${searchQuery}`);
    
    // 병렬로 PubMed와 Kaggle 검색 수행
    const [pubmedPromise, kagglePromise] = [
      pubmedApi.searchArticles({
        query: searchQuery,
        maxResults
      }).catch(error => {
        monitoring.log('search', 'error', `통합 검색 중 PubMed 오류: ${error.message}`);
        return { articles: [], total: 0, hasMore: false, searchQuery };
      }),
      
      kaggleApi.searchDatasets({
        query: searchQuery,
        maxResults
      }).catch(error => {
        monitoring.log('search', 'error', `통합 검색 중 Kaggle 오류: ${error.message}`);
        return [];
      })
    ];
    
    const [pubmedResults, kaggleResults] = await Promise.all([pubmedPromise, kagglePromise]);
    
    // 결과 병합
    const results = {
      pubmed: pubmedResults,
      kaggle: kaggleResults,
      query: searchQuery
    };
    
    // 검색 결과 캐싱 (10분)
    await cache.set(cacheKey, results, { ttl: 600 });
    
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    monitoring.log('search', 'error', `통합 검색 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '검색 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 의미적 검색 엔드포인트
 * 벡터 검색을 사용하여 유사한 의학 논문과 데이터셋을 찾습니다
 */
router.get('/semantic', requireAuth, validate({
  query: z.object({
    query: z.string().min(3).max(500),
    types: z.string().optional(), // 'pubmed_article,kaggle_dataset' 형태로 전달
    maxResults: z.string().optional(),
    minScore: z.string().optional(),
    model: z.string().optional()
  })
}), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const searchQuery = req.query.query as string;
    const types = req.query.types ? (req.query.types as string).split(',') : undefined;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 10;
    const minScore = req.query.minScore ? parseFloat(req.query.minScore as string) : 0.7;
    const model = req.query.model as string | undefined;
    
    const cacheKey = `semantic_search:${searchQuery}:${types?.join(',') || 'all'}:${maxResults}:${minScore}:${model || 'default'}`;
    const cachedResult = await cache.get(cacheKey);
    
    if (cachedResult) {
      monitoring.log('search', 'info', `캐시된 의미적 검색 결과 반환: ${searchQuery}`);
      return res.status(200).json({
        success: true,
        data: cachedResult
      });
    }
    
    monitoring.log('search', 'info', `의미적 검색 시작: ${searchQuery}`);
    
    // 벡터 검색 수행
    const searchResults = await vectorStore.similaritySearch({
      query: searchQuery,
      objectType: types,
      maxResults,
      minScore,
      model,
      includeMetadata: true
    });
    
    // 결과가 충분하지 않은 경우, 문서 청크 검색도 수행
    let chunkResults: any = { results: [], chunks: [] };
    if (searchResults.length < maxResults) {
      chunkResults = await vectorStore.searchDocumentChunks({
        query: searchQuery,
        objectType: types,
        maxResults: maxResults - searchResults.length,
        minScore,
        model
      });
    }
    
    // 검색 기록 저장 (비동기적으로 처리하여 응답 지연 방지)
    db.query(
      `INSERT INTO search_history (user_id, search_query, search_type, result_count)
       VALUES ($1, $2, $3, $4)`,
      [userId, searchQuery, 'semantic', searchResults.length + chunkResults.results.length]
    ).catch(err => {
      monitoring.log('database', 'error', `검색 기록 저장 오류: ${err.message}`);
    });
    
    // 결과 형식화
    const formattedResults = {
      objects: searchResults.map(result => ({
        id: result.objectId,
        type: result.objectType,
        score: result.score,
        metadata: result.metadata
      })),
      chunks: chunkResults.chunks.map((chunk: any) => ({
        documentId: chunk.documentId,
        documentType: chunk.documentType,
        text: chunk.text,
        score: chunk.score
      })),
      query: searchQuery,
      totalResults: searchResults.length + chunkResults.results.length
    };
    
    // 결과 캐싱 (10분)
    await cache.set(cacheKey, formattedResults, { ttl: 600 });
    
    res.status(200).json({
      success: true,
      data: formattedResults
    });
  } catch (error) {
    monitoring.log('search', 'error', `의미적 검색 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '검색 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 특정 객체와 유사한 항목 검색
 */
router.get('/similar/:type/:id', requireAuth, validate({
  params: z.object({
    type: z.string().min(1),
    id: z.string().min(1)
  }),
  query: z.object({
    maxResults: z.string().optional(),
    minScore: z.string().optional()
  })
}), async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 5;
    const minScore = req.query.minScore ? parseFloat(req.query.minScore as string) : 0.7;
    
    const cacheKey = `similar_search:${type}:${id}:${maxResults}:${minScore}`;
    const cachedResult = await cache.get(cacheKey);
    
    if (cachedResult) {
      monitoring.log('search', 'info', `캐시된 유사 항목 검색 결과 반환: ${type}/${id}`);
      return res.status(200).json({
        success: true,
        data: cachedResult
      });
    }
    
    monitoring.log('search', 'info', `유사 항목 검색 시작: ${type}/${id}`);
    
    // 대상 객체 임베딩 가져오기
    const objectEmbedding = await db.query(
      `SELECT embedding FROM vector_embeddings 
       WHERE object_type = $1 AND object_id = $2`,
      [type, id]
    );
    
    if (objectEmbedding.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '요청한 객체의 벡터 임베딩을 찾을 수 없습니다'
      });
    }
    
    // 임베딩을 사용하여 유사 항목 검색
    const sql = `
      SELECT 
        id,
        object_id,
        object_type,
        1 - (embedding <=> $1) as score,
        metadata
      FROM vector_embeddings
      WHERE object_type = $2 AND object_id != $3
      HAVING 1 - (embedding <=> $1) >= $4
      ORDER BY score DESC
      LIMIT $5
    `;
    
    const result = await db.query(sql, [
      objectEmbedding.rows[0].embedding,
      type,
      id,
      minScore,
      maxResults
    ]);
    
    // 결과 변환
    const similarResults = result.rows.map(row => ({
      id: row.object_id,
      type: row.object_type,
      score: row.score,
      metadata: row.metadata
    }));
    
    // 결과 캐싱 (30분)
    await cache.set(cacheKey, similarResults, { ttl: 1800 });
    
    res.status(200).json({
      success: true,
      data: similarResults
    });
  } catch (error) {
    monitoring.log('search', 'error', `유사 항목 검색 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '검색 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 관리자 전용: 데이터 벡터화 작업 트리거
 */
router.post('/vectorize', requireAuth, requireRole(['admin']), validate({
  body: z.object({
    type: z.enum(['pubmed', 'kaggle', 'all']),
    batchSize: z.number().optional(),
    updateExisting: z.boolean().optional()
  })
}), async (req: Request, res: Response) => {
  try {
    const { type, batchSize, updateExisting } = req.body;
    
    monitoring.log('admin', 'info', `관리자가 데이터 벡터화 작업 요청: ${type}`);
    
    const options = {
      batchSize: batchSize || 50,
      updateExisting: updateExisting || false
    };
    
    // 백그라운드에서 작업 실행
    new Promise(async (resolve) => {
      try {
        let result: any = {};
        
        if (type === 'pubmed' || type === 'all') {
          result.pubmed = await medicalVectorizer.vectorizePubMedArticles(options);
        }
        
        if (type === 'kaggle' || type === 'all') {
          result.kaggle = await medicalVectorizer.vectorizeKaggleDatasets(options);
        }
        
        monitoring.log('admin', 'info', `데이터 벡터화 작업 완료: ${JSON.stringify(result)}`);
      } catch (error) {
        monitoring.log('admin', 'error', `데이터 벡터화 작업 실패: ${error.message}`);
      }
      resolve(true);
    });
    
    res.status(202).json({
      success: true,
      message: `${type} 데이터 벡터화 작업이 백그라운드에서 시작되었습니다.`
    });
  } catch (error) {
    monitoring.log('admin', 'error', `데이터 벡터화 작업 요청 처리 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '데이터 벡터화 작업 요청 처리 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

export default router; 