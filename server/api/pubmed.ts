import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { db } from '../db/database';
import { monitoring } from '../utils/monitoring';
import { config } from '../config';

const parseXml = promisify(parseString);

/**
 * PubMed API 관련 인터페이스
 */
export interface PubMedArticle {
  pubmedId: string;
  title: string;
  abstract: string;
  authors: string[];
  publicationDate: Date;
  journal: string;
  doi?: string;
  keywords: string[];
  categories?: string[];
}

export interface PubMedSearchResult {
  articles: PubMedArticle[];
  total: number;
  hasMore: boolean;
  searchQuery: string;
}

export interface PubMedSearchOptions {
  query: string;
  maxResults?: number;
  startIndex?: number;
  sortBy?: 'relevance' | 'date';
  minDate?: string;
  maxDate?: string;
  fullText?: boolean;
}

/**
 * PubMed API와 상호작용하는 클래스
 */
export class PubMedAPI {
  private static instance: PubMedAPI;
  private readonly baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  private readonly apiKey: string;
  
  private constructor() {
    this.apiKey = config.apis.pubmed.apiKey;
    if (!this.apiKey) {
      monitoring.log('api', 'warn', 'PubMed API 키가 설정되지 않았습니다. 요청 제한이 적용될 수 있습니다.');
    }
  }
  
  /**
   * PubMed API 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): PubMedAPI {
    if (!PubMedAPI.instance) {
      PubMedAPI.instance = new PubMedAPI();
    }
    return PubMedAPI.instance;
  }
  
  /**
   * PubMed에서 의학 논문을 검색합니다
   * @param options 검색 옵션
   */
  public async searchArticles(options: PubMedSearchOptions): Promise<PubMedSearchResult> {
    try {
      monitoring.log('api', 'info', `PubMed 검색 시작: ${options.query}`);
      
      // 검색 ID 가져오기
      const searchIds = await this.getSearchResultIds(options);
      
      if (searchIds.ids.length === 0) {
        return {
          articles: [],
          total: 0,
          hasMore: false,
          searchQuery: options.query
        };
      }
      
      // ID로 논문 상세 정보 가져오기
      const articles = await this.fetchArticleDetails(searchIds.ids);
      
      monitoring.log('api', 'info', `PubMed 검색 완료: ${articles.length}개 논문 발견`);
      
      // 검색 기록 저장
      this.saveSearchHistory(options.query, articles.length);
      
      return {
        articles,
        total: searchIds.total,
        hasMore: searchIds.total > (options.startIndex || 0) + articles.length,
        searchQuery: options.query
      };
    } catch (error) {
      monitoring.log('api', 'error', `PubMed 검색 오류: ${error.message}`);
      throw new Error(`PubMed 검색 오류: ${error.message}`);
    }
  }
  
  /**
   * PubMed 검색 결과 ID 목록을 가져옵니다
   * @param options 검색 옵션
   */
  private async getSearchResultIds(options: PubMedSearchOptions): Promise<{ ids: string[], total: number }> {
    const params: any = {
      db: 'pubmed',
      term: options.query,
      retmode: 'json',
      retmax: options.maxResults || 20,
      retstart: options.startIndex || 0
    };
    
    if (options.sortBy) {
      params.sort = options.sortBy === 'date' ? 'pub+date' : 'relevance';
    }
    
    if (options.minDate) {
      params.mindate = options.minDate;
    }
    
    if (options.maxDate) {
      params.maxdate = options.maxDate;
    }
    
    if (options.fullText) {
      params.filter = 'free full text[filter]';
    }
    
    if (this.apiKey) {
      params.api_key = this.apiKey;
    }
    
    try {
      const response = await axios.get(`${this.baseUrl}/esearch.fcgi`, { params });
      const result = response.data.esearchresult;
      const ids = result.idlist || [];
      const total = parseInt(result.count, 10);
      
      return { ids, total };
    } catch (error) {
      monitoring.log('api', 'error', `PubMed 검색 ID 가져오기 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * PubMed 논문 상세 정보를 가져옵니다
   * @param ids PubMed ID 배열
   */
  private async fetchArticleDetails(ids: string[]): Promise<PubMedArticle[]> {
    if (ids.length === 0) {
      return [];
    }
    
    const params: any = {
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'xml',
      rettype: 'abstract'
    };
    
    if (this.apiKey) {
      params.api_key = this.apiKey;
    }
    
    try {
      const response = await axios.get(`${this.baseUrl}/efetch.fcgi`, { params });
      const result = await parseXml(response.data);
      
      return this.parseArticles(result);
    } catch (error) {
      monitoring.log('api', 'error', `PubMed 논문 상세 정보 가져오기 오류: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * XML 응답에서 논문 정보를 파싱합니다
   * @param xmlData XML 데이터
   */
  private parseArticles(xmlData: any): PubMedArticle[] {
    try {
      if (!xmlData.PubmedArticleSet || !xmlData.PubmedArticleSet.PubmedArticle) {
        return [];
      }
      
      const articles = Array.isArray(xmlData.PubmedArticleSet.PubmedArticle)
        ? xmlData.PubmedArticleSet.PubmedArticle
        : [xmlData.PubmedArticleSet.PubmedArticle];
      
      return articles.map(article => this.extractArticleData(article)).filter(Boolean);
    } catch (error) {
      monitoring.log('api', 'error', `PubMed XML 파싱 오류: ${error.message}`);
      return [];
    }
  }
  
  /**
   * 논문 데이터에서 필요한 정보를 추출합니다
   * @param article 논문 데이터
   */
  private extractArticleData(article: any): PubMedArticle | null {
    try {
      const medlineCitation = article.MedlineCitation[0];
      const pubmedData = article.PubmedData?.[0];
      
      if (!medlineCitation || !medlineCitation.Article) {
        return null;
      }
      
      const articleData = medlineCitation.Article[0];
      const pubmedId = medlineCitation.PMID?.[0]._ || '';
      
      // 제목 추출
      let title = '';
      if (articleData.ArticleTitle?.[0]) {
        title = typeof articleData.ArticleTitle[0] === 'string'
          ? articleData.ArticleTitle[0]
          : articleData.ArticleTitle[0]._ || '';
      }
      
      // 초록 추출
      let abstract = '';
      if (articleData.Abstract?.[0]?.AbstractText) {
        abstract = articleData.Abstract[0].AbstractText.map((text: any) => {
          return typeof text === 'string' ? text : text._ || '';
        }).join(' ');
      }
      
      // 저자 추출
      const authors: string[] = [];
      if (articleData.AuthorList?.[0]?.Author) {
        articleData.AuthorList[0].Author.forEach((author: any) => {
          const lastName = author.LastName?.[0] || '';
          const foreName = author.ForeName?.[0] || '';
          if (lastName || foreName) {
            authors.push(`${lastName}${foreName ? ', ' + foreName : ''}`);
          }
        });
      }
      
      // 저널 정보 추출
      const journal = articleData.Journal?.[0]?.Title?.[0] || '';
      
      // 발행일 추출
      let publicationDate = new Date();
      if (articleData.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0]) {
        const pubDateData = articleData.Journal[0].JournalIssue[0].PubDate[0];
        const year = pubDateData.Year?.[0] || '';
        const month = pubDateData.Month?.[0] || '01';
        const day = pubDateData.Day?.[0] || '01';
        
        if (year) {
          publicationDate = new Date(`${year}-${this.mapMonth(month)}-${day}`);
        }
      }
      
      // DOI 추출
      let doi = '';
      if (articleData.ELocationID) {
        const doiElement = articleData.ELocationID.find((id: any) => id.$?.EIdType === 'doi');
        if (doiElement) {
          doi = doiElement._ || '';
        }
      }
      
      // 키워드 추출
      const keywords: string[] = [];
      if (medlineCitation.MeshHeadingList?.[0]?.MeshHeading) {
        medlineCitation.MeshHeadingList[0].MeshHeading.forEach((mesh: any) => {
          if (mesh.DescriptorName?.[0]?._) {
            keywords.push(mesh.DescriptorName[0]._);
          }
        });
      }
      
      // 카테고리 추출
      const categories: string[] = [];
      if (medlineCitation.Article?.[0]?.PublicationTypeList?.[0]?.PublicationType) {
        medlineCitation.Article[0].PublicationTypeList[0].PublicationType.forEach((type: any) => {
          if (type._) {
            categories.push(type._);
          }
        });
      }
      
      return {
        pubmedId,
        title,
        abstract,
        authors,
        publicationDate,
        journal,
        doi,
        keywords,
        categories
      };
    } catch (error) {
      monitoring.log('api', 'error', `PubMed 논문 데이터 추출 오류: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 월 이름을 숫자로 변환합니다
   * @param month 월 이름 또는 숫자
   */
  private mapMonth(month: string): string {
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    // 이미 숫자인 경우
    if (/^\d+$/.test(month)) {
      const num = parseInt(month, 10);
      return num < 10 ? `0${num}` : `${num}`;
    }
    
    // 월 이름인 경우
    return monthMap[month] || '01';
  }
  
  /**
   * 검색 기록을 데이터베이스에 저장합니다
   * @param query 검색 쿼리
   * @param resultCount 결과 수
   * @param userId 사용자 ID (선택사항)
   */
  private async saveSearchHistory(query: string, resultCount: number, userId?: number): Promise<void> {
    try {
      await db.query(
        `INSERT INTO search_history (user_id, search_query, search_type, result_count)
         VALUES ($1, $2, $3, $4)`,
        [userId, query, 'pubmed', resultCount]
      );
    } catch (error) {
      monitoring.log('database', 'error', `검색 기록 저장 오류: ${error.message}`);
      // 검색 기록 저장 실패는 전체 작업을 중단시키지 않음
    }
  }
  
  /**
   * 논문 정보를 데이터베이스에 저장합니다
   * @param articles 논문 목록
   */
  public async saveArticlesToDatabase(articles: PubMedArticle[]): Promise<number> {
    if (articles.length === 0) {
      return 0;
    }
    
    let savedCount = 0;
    const client = await db.beginTransaction();
    
    try {
      for (const article of articles) {
        // 이미 존재하는 논문인지 확인
        const existingResult = await db.queryWithTransaction(
          client,
          'SELECT id FROM medical_papers WHERE pubmed_id = $1',
          [article.pubmedId]
        );
        
        if (existingResult.rows.length > 0) {
          // 이미 존재하면 업데이트
          await db.queryWithTransaction(
            client,
            `UPDATE medical_papers
             SET 
               title = $1,
               abstract = $2,
               authors = $3,
               publication_date = $4,
               journal = $5,
               doi = $6,
               keywords = $7,
               categories = $8,
               updated_at = CURRENT_TIMESTAMP
             WHERE pubmed_id = $9`,
            [
              article.title,
              article.abstract,
              article.authors,
              article.publicationDate,
              article.journal,
              article.doi || null,
              article.keywords,
              article.categories || [],
              article.pubmedId
            ]
          );
        } else {
          // 새로운 논문 삽입
          await db.queryWithTransaction(
            client,
            `INSERT INTO medical_papers (
               pubmed_id, title, abstract, authors, publication_date,
               journal, doi, keywords, categories
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              article.pubmedId,
              article.title,
              article.abstract,
              article.authors,
              article.publicationDate,
              article.journal,
              article.doi || null,
              article.keywords,
              article.categories || []
            ]
          );
          savedCount++;
        }
      }
      
      await db.commitTransaction(client);
      monitoring.log('database', 'info', `${savedCount}개의 새로운 논문이 데이터베이스에 저장되었습니다`);
      return savedCount;
    } catch (error) {
      await db.rollbackTransaction(client);
      monitoring.log('database', 'error', `논문 저장 오류: ${error.message}`);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
export const pubmedApi = PubMedAPI.getInstance(); 