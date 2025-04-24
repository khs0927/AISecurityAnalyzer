import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { monitoring } from '../utils/monitoring';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 환경 변수 로드
dotenv.config();

// PubMed API 상수
const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PUBMED_API_KEY = process.env.PUBMED_API_KEY || '';
const PUBMED_TOOL = 'medical-data-integration';
const PUBMED_EMAIL = process.env.PUBMED_EMAIL || '';
const PUBMED_RATE_LIMIT_MS = 334; // 3 요청/초 (API 키 있는 경우)
const PUBMED_MAX_RETRIES = 3;
const PUBMED_RETRY_DELAY_MS = 1000;
const PUBMED_SEARCH_DELAY_MS = 3000;
const PUBMED_CACHE_DIR = path.join(process.cwd(), 'cache', 'pubmed');

// PubMed 아티클 인터페이스
export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract?: string;
  publicationDate?: Date;
  journal?: string;
  authors: string[];
  authorAffiliations?: string[];
  keywords: string[];
  doi?: string;
  url?: string;
  articleType?: string;
  citationCount?: number;
}

// PubMed 검색 매개변수
export interface PubMedSearchParams {
  term: string;
  maxResults?: number;
  sortBy?: 'relevance' | 'pub_date' | 'author' | 'journal' | 'title';
  sortOrder?: 'asc' | 'desc';
  dateRange?: {
    start: Date;
    end: Date;
  };
  articleTypes?: string[];
  journalFilter?: string;
  authorFilter?: string;
  useCache?: boolean;
  retMax?: number;
  retStart?: number;
}

// PubMed 검색 결과
export interface PubMedSearchResult {
  articles: PubMedArticle[];
  totalCount: number;
  query: string;
  hasMore: boolean;
  nextRetStart?: number;
}

// PubMed API 클래스
export class PubMedAPI {
  private parser: XMLParser;
  private lastRequestTime: number = 0;
  private isApiKeyValid: boolean = false;

  constructor() {
    // XML 파서 설정
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) => ['ArticleId', 'Author', 'MeshHeading', 'Keyword', 'PublicationType'].includes(name)
    });

    // 캐시 디렉토리 생성
    if (!fs.existsSync(PUBMED_CACHE_DIR)) {
      fs.mkdirSync(PUBMED_CACHE_DIR, { recursive: true });
    }

    // API 키 유효성 검사
    this.validateApiKey();

    monitoring.log('info', 'PubMed API 클라이언트 초기화됨', {
      apiKeyPresent: !!PUBMED_API_KEY,
      category: 'api'
    });
  }

  /**
   * API 키 유효성 검사
   */
  private async validateApiKey(): Promise<void> {
    if (!PUBMED_API_KEY) {
      this.isApiKeyValid = false;
      monitoring.log('warn', 'PubMed API 키가 설정되지 않았습니다. 요청 제한이 적용됩니다.', {
        category: 'api'
      });
      return;
    }

    try {
      const testUrl = `${PUBMED_BASE_URL}/esearch.fcgi?db=pubmed&term=covid&retmax=1&api_key=${PUBMED_API_KEY}&tool=${PUBMED_TOOL}&email=${PUBMED_EMAIL}`;
      await axios.get(testUrl);
      this.isApiKeyValid = true;
      
      monitoring.log('info', 'PubMed API 키 유효성 검사 완료', {
        valid: true,
        category: 'api'
      });
    } catch (error: any) {
      this.isApiKeyValid = false;
      
      monitoring.log('error', 'PubMed API 키 유효성 검사 실패', {
        error: error.message,
        valid: false,
        category: 'api'
      });
    }
  }

  /**
   * PubMed API 사용 가능 여부 확인
   */
  isAvailable(): boolean {
    return true; // API 키가 없어도 요청은 가능 (요청 제한만 다름)
  }

  /**
   * API 요청 비율 제한 준수
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const delay = PUBMED_RATE_LIMIT_MS - elapsed;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * 검색 쿼리 캐시 키 생성
   */
  private getCacheKey(params: PubMedSearchParams): string {
    const key = `${params.term}_${params.retMax || 20}_${params.retStart || 0}`;
    return path.join(PUBMED_CACHE_DIR, `search_${key.replace(/[^a-z0-9_]/gi, '_')}.json`);
  }

  /**
   * 아티클 캐시 키 생성
   */
  private getArticleCacheKey(pmid: string): string {
    return path.join(PUBMED_CACHE_DIR, `article_${pmid}.json`);
  }

  /**
   * 캐시에서 검색 결과 로드
   */
  private loadFromCache(cacheKey: string): PubMedSearchResult | null {
    try {
      if (fs.existsSync(cacheKey)) {
        const cachedData = fs.readFileSync(cacheKey, 'utf-8');
        const result = JSON.parse(cachedData) as PubMedSearchResult;
        
        monitoring.log('debug', 'PubMed 검색 결과 캐시에서 로드됨', {
          query: result.query,
          count: result.articles.length,
          category: 'api'
        });
        
        return result;
      }
    } catch (error: any) {
      monitoring.log('warn', 'PubMed 캐시 로드 오류', {
        error: error.message,
        cacheKey,
        category: 'api'
      });
    }
    
    return null;
  }

  /**
   * 캐시에 검색 결과 저장
   */
  private saveToCache(cacheKey: string, result: PubMedSearchResult): void {
    try {
      fs.writeFileSync(cacheKey, JSON.stringify(result, null, 2));
      
      monitoring.log('debug', 'PubMed 검색 결과 캐시에 저장됨', {
        query: result.query,
        count: result.articles.length,
        category: 'api'
      });
    } catch (error: any) {
      monitoring.log('warn', 'PubMed 캐시 저장 오류', {
        error: error.message,
        cacheKey,
        category: 'api'
      });
    }
  }

  /**
   * 논문 검색
   */
  async searchArticles(params: PubMedSearchParams): Promise<PubMedSearchResult> {
    const {
      term,
      maxResults = 100,
      sortBy = 'relevance',
      sortOrder = 'desc',
      dateRange,
      articleTypes,
      journalFilter,
      authorFilter,
      useCache = true,
      retMax = 20,
      retStart = 0
    } = params;

    // 검색어 검증
    if (!term || term.trim().length === 0) {
      throw new Error('검색어가 필요합니다.');
    }

    // 캐시 확인
    const cacheKey = this.getCacheKey(params);
    if (useCache) {
      const cachedResult = this.loadFromCache(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    try {
      // 검색 쿼리 구성
      let query = term;
      
      // 날짜 범위 추가
      if (dateRange) {
        const startDate = this.formatDate(dateRange.start);
        const endDate = this.formatDate(dateRange.end);
        query += ` AND (${startDate}[Date - Publication] : ${endDate}[Date - Publication])`;
      }
      
      // 저널 필터 추가
      if (journalFilter) {
        query += ` AND "${journalFilter}"[Journal]`;
      }
      
      // 저자 필터 추가
      if (authorFilter) {
        query += ` AND "${authorFilter}"[Author]`;
      }
      
      // 아티클 타입 필터 추가
      if (articleTypes && articleTypes.length > 0) {
        const typeFilter = articleTypes.map(type => `"${type}"[Publication Type]`).join(' OR ');
        query += ` AND (${typeFilter})`;
      }
      
      // 정렬 설정
      let sortParam = '';
      if (sortBy === 'pub_date') {
        sortParam = sortOrder === 'desc' ? 'pub+date+desc' : 'pub+date';
      } else if (sortBy === 'author') {
        sortParam = sortOrder === 'desc' ? 'author+desc' : 'author';
      } else if (sortBy === 'journal') {
        sortParam = sortOrder === 'desc' ? 'journal+desc' : 'journal';
      } else if (sortBy === 'title') {
        sortParam = sortOrder === 'desc' ? 'title+desc' : 'title';
      }
      
      // API 요청 준비
      await this.respectRateLimit();
      
      // ESearch 요청 URL 구성
      const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${retMax}&retstart=${retStart}&retmode=json${sortParam ? `&sort=${sortParam}` : ''}${this.isApiKeyValid ? `&api_key=${PUBMED_API_KEY}` : ''}&tool=${PUBMED_TOOL}&email=${PUBMED_EMAIL}`;
      
      // ESearch 요청
      const searchResponse = await this.makeHttpRequest(searchUrl);
      const searchData = searchResponse.data;
      
      // 검색 결과 확인
      if (!searchData.esearchresult || !searchData.esearchresult.idlist) {
        return {
          articles: [],
          totalCount: 0,
          query: term,
          hasMore: false
        };
      }
      
      const idList = searchData.esearchresult.idlist as string[];
      const totalCount = parseInt(searchData.esearchresult.count) || 0;
      
      // 검색 결과가 없는 경우
      if (idList.length === 0) {
        const emptyResult = {
          articles: [],
          totalCount,
          query: term,
          hasMore: false
        };
        
        if (useCache) {
          this.saveToCache(cacheKey, emptyResult);
        }
        
        return emptyResult;
      }
      
      // ID 목록으로 아티클 상세 정보 가져오기
      const articles = await this.fetchArticleDetails(idList);
      
      // 결과 구성
      const result: PubMedSearchResult = {
        articles,
        totalCount,
        query: term,
        hasMore: totalCount > (retStart + articles.length),
        nextRetStart: retStart + articles.length
      };
      
      // 캐시에 저장
      if (useCache) {
        this.saveToCache(cacheKey, result);
      }
      
      return result;
    } catch (error: any) {
      monitoring.log('error', 'PubMed 검색 오류', {
        error: error.message,
        term,
        stack: error.stack,
        category: 'api'
      });
      
      throw new Error(`PubMed 검색 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * ID 목록으로 아티클 상세 정보 가져오기
   */
  private async fetchArticleDetails(pmids: string[]): Promise<PubMedArticle[]> {
    // 캐시에서 먼저 가져오기
    const articles: PubMedArticle[] = [];
    const notCachedIds: string[] = [];
    
    for (const pmid of pmids) {
      const cacheKey = this.getArticleCacheKey(pmid);
      
      try {
        if (fs.existsSync(cacheKey)) {
          const cachedData = fs.readFileSync(cacheKey, 'utf-8');
          const article = JSON.parse(cachedData) as PubMedArticle;
          articles.push(article);
        } else {
          notCachedIds.push(pmid);
        }
      } catch (error) {
        notCachedIds.push(pmid);
      }
    }
    
    // 캐시에 없는 아티클만 가져오기
    if (notCachedIds.length > 0) {
      await this.respectRateLimit();
      
      // EFetch 요청 URL 구성
      const fetchUrl = `${PUBMED_BASE_URL}/efetch.fcgi?db=pubmed&id=${notCachedIds.join(',')}&retmode=xml${this.isApiKeyValid ? `&api_key=${PUBMED_API_KEY}` : ''}&tool=${PUBMED_TOOL}&email=${PUBMED_EMAIL}`;
      
      // EFetch 요청
      const fetchResponse = await this.makeHttpRequest(fetchUrl);
      const xmlData = fetchResponse.data;
      
      // XML 파싱
      const parsedData = this.parser.parse(xmlData);
      
      if (parsedData?.PubmedArticleSet?.PubmedArticle) {
        const parsedArticles = Array.isArray(parsedData.PubmedArticleSet.PubmedArticle) 
          ? parsedData.PubmedArticleSet.PubmedArticle 
          : [parsedData.PubmedArticleSet.PubmedArticle];
        
        // 아티클 정보 추출
        for (const article of parsedArticles) {
          try {
            const parsedArticle = this.extractArticleData(article);
            
            // 아티클이 정상적으로 추출되었다면 캐시에 저장하고 결과에 추가
            if (parsedArticle) {
              const cacheKey = this.getArticleCacheKey(parsedArticle.pmid);
              fs.writeFileSync(cacheKey, JSON.stringify(parsedArticle, null, 2));
              articles.push(parsedArticle);
            }
          } catch (error: any) {
            monitoring.log('warn', 'PubMed 아티클 정보 추출 오류', {
              error: error.message,
              category: 'api'
            });
          }
        }
      }
    }
    
    // PMID 순서에 맞게 정렬
    return pmids
      .map(pmid => articles.find(a => a.pmid === pmid))
      .filter((article): article is PubMedArticle => article !== undefined);
  }

  /**
   * 아티클 ID로 상세 정보 가져오기
   */
  async getArticleById(pmid: string, useCache: boolean = true): Promise<PubMedArticle | null> {
    const cacheKey = this.getArticleCacheKey(pmid);
    
    // 캐시에서 확인
    if (useCache) {
      try {
        if (fs.existsSync(cacheKey)) {
          const cachedData = fs.readFileSync(cacheKey, 'utf-8');
          const article = JSON.parse(cachedData) as PubMedArticle;
          
          monitoring.log('debug', 'PubMed 아티클 캐시에서 로드됨', {
            pmid,
            category: 'api'
          });
          
          return article;
        }
      } catch (error) {
        // 캐시 로드 실패 시 API 요청
      }
    }
    
    try {
      await this.respectRateLimit();
      
      // EFetch 요청 URL 구성
      const fetchUrl = `${PUBMED_BASE_URL}/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml${this.isApiKeyValid ? `&api_key=${PUBMED_API_KEY}` : ''}&tool=${PUBMED_TOOL}&email=${PUBMED_EMAIL}`;
      
      // EFetch 요청
      const fetchResponse = await this.makeHttpRequest(fetchUrl);
      const xmlData = fetchResponse.data;
      
      // XML 파싱
      const parsedData = this.parser.parse(xmlData);
      
      if (parsedData?.PubmedArticleSet?.PubmedArticle) {
        const parsedArticle = Array.isArray(parsedData.PubmedArticleSet.PubmedArticle) 
          ? parsedData.PubmedArticleSet.PubmedArticle[0]
          : parsedData.PubmedArticleSet.PubmedArticle;
        
        // 아티클 정보 추출
        const articleData = this.extractArticleData(parsedArticle);
        
        // 캐시에 저장
        if (articleData && useCache) {
          fs.writeFileSync(cacheKey, JSON.stringify(articleData, null, 2));
        }
        
        return articleData;
      }
      
      return null;
    } catch (error: any) {
      monitoring.log('error', 'PubMed 아티클 조회 오류', {
        error: error.message,
        pmid,
        stack: error.stack,
        category: 'api'
      });
      
      throw new Error(`PubMed 아티클 조회 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * 인용 수 가져오기
   */
  async getCitationCount(pmid: string): Promise<number> {
    try {
      await this.respectRateLimit();
      
      // ELink 요청 URL 구성
      const linkUrl = `${PUBMED_BASE_URL}/elink.fcgi?dbfrom=pubmed&db=pubmed&id=${pmid}&linkname=pubmed_pubmed_citedin&retmode=json${this.isApiKeyValid ? `&api_key=${PUBMED_API_KEY}` : ''}&tool=${PUBMED_TOOL}&email=${PUBMED_EMAIL}`;
      
      // ELink 요청
      const linkResponse = await this.makeHttpRequest(linkUrl);
      const linkData = linkResponse.data;
      
      // 인용 정보 추출
      if (
        linkData.linksets && 
        linkData.linksets[0] && 
        linkData.linksets[0].linksetdbs && 
        linkData.linksets[0].linksetdbs[0] && 
        linkData.linksets[0].linksetdbs[0].links
      ) {
        return linkData.linksets[0].linksetdbs[0].links.length;
      }
      
      return 0;
    } catch (error: any) {
      monitoring.log('warn', 'PubMed 인용 수 조회 오류', {
        error: error.message,
        pmid,
        category: 'api'
      });
      
      return 0;
    }
  }

  /**
   * 관련 아티클 가져오기
   */
  async getRelatedArticles(pmid: string, maxResults: number = 10): Promise<PubMedArticle[]> {
    try {
      await this.respectRateLimit();
      
      // ELink 요청 URL 구성
      const linkUrl = `${PUBMED_BASE_URL}/elink.fcgi?dbfrom=pubmed&db=pubmed&id=${pmid}&linkname=pubmed_pubmed&retmode=json${this.isApiKeyValid ? `&api_key=${PUBMED_API_KEY}` : ''}&tool=${PUBMED_TOOL}&email=${PUBMED_EMAIL}`;
      
      // ELink 요청
      const linkResponse = await this.makeHttpRequest(linkUrl);
      const linkData = linkResponse.data;
      
      // 관련 아티클 ID 추출
      const relatedIds: string[] = [];
      
      if (
        linkData.linksets && 
        linkData.linksets[0] && 
        linkData.linksets[0].linksetdbs
      ) {
        for (const linksetdb of linkData.linksets[0].linksetdbs) {
          if (linksetdb.links) {
            for (const link of linksetdb.links) {
              if (link.id && link.id !== pmid) {
                relatedIds.push(link.id);
              }
              
              // 최대 결과 수 제한
              if (relatedIds.length >= maxResults) {
                break;
              }
            }
          }
          
          // 최대 결과 수 제한
          if (relatedIds.length >= maxResults) {
            break;
          }
        }
      }
      
      // 관련 아티클 정보 가져오기
      if (relatedIds.length > 0) {
        return await this.fetchArticleDetails(relatedIds);
      }
      
      return [];
    } catch (error: any) {
      monitoring.log('error', 'PubMed 관련 아티클 조회 오류', {
        error: error.message,
        pmid,
        stack: error.stack,
        category: 'api'
      });
      
      throw new Error(`PubMed 관련 아티클 조회 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * 최신 아티클 가져오기
   */
  async getRecentArticles(topic: string, days: number = 30, maxResults: number = 20): Promise<PubMedArticle[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const searchParams: PubMedSearchParams = {
      term: topic,
      maxResults,
      sortBy: 'pub_date',
      sortOrder: 'desc',
      dateRange: {
        start: startDate,
        end: endDate
      },
      retMax: maxResults
    };
    
    const result = await this.searchArticles(searchParams);
    return result.articles;
  }

  /**
   * 키워드 기반 인기 주제 가져오기
   */
  async getPopularTopics(keyword: string, maxResults: number = 10): Promise<string[]> {
    try {
      await this.respectRateLimit();
      
      // ESearch 요청 URL 구성
      const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(keyword)}&retmax=100&retmode=json${this.isApiKeyValid ? `&api_key=${PUBMED_API_KEY}` : ''}&tool=${PUBMED_TOOL}&email=${PUBMED_EMAIL}`;
      
      // ESearch 요청
      const searchResponse = await this.makeHttpRequest(searchUrl);
      const searchData = searchResponse.data;
      
      // 검색 결과 확인
      if (!searchData.esearchresult || !searchData.esearchresult.idlist) {
        return [];
      }
      
      const idList = searchData.esearchresult.idlist as string[];
      
      // 검색 결과가 없는 경우
      if (idList.length === 0) {
        return [];
      }
      
      // 최대 20개 ID만 사용
      const limitedIds = idList.slice(0, 20);
      
      // 아티클 정보 가져오기
      const articles = await this.fetchArticleDetails(limitedIds);
      
      // 키워드 추출 및 빈도 계산
      const keywordCounts: Record<string, number> = {};
      
      for (const article of articles) {
        for (const keyword of article.keywords) {
          if (keyword.length > 3) {  // 너무 짧은 키워드 제외
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
          }
        }
      }
      
      // 빈도별로 정렬하여 반환
      return Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxResults)
        .map(entry => entry[0]);
    } catch (error: any) {
      monitoring.log('error', 'PubMed 인기 주제 조회 오류', {
        error: error.message,
        keyword,
        stack: error.stack,
        category: 'api'
      });
      
      throw new Error(`PubMed 인기 주제 조회 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * XML 데이터에서 아티클 정보 추출
   */
  private extractArticleData(articleData: any): PubMedArticle | null {
    try {
      if (!articleData || !articleData.MedlineCitation || !articleData.MedlineCitation.Article) {
        return null;
      }
      
      const citation = articleData.MedlineCitation;
      const article = citation.Article;
      const pmid = citation.PMID?._text || '';
      
      // 제목 추출
      let title = '';
      if (article.ArticleTitle) {
        title = typeof article.ArticleTitle === 'string' 
          ? article.ArticleTitle 
          : article.ArticleTitle._text || '';
      }
      
      // 초록 추출
      let abstract = '';
      if (article.Abstract && article.Abstract.AbstractText) {
        if (Array.isArray(article.Abstract.AbstractText)) {
          abstract = article.Abstract.AbstractText
            .map((absText: any) => {
              const label = absText['@_Label'] ? `${absText['@_Label']}: ` : '';
              return `${label}${absText._text || absText || ''}`;
            })
            .join('\n');
        } else {
          abstract = article.Abstract.AbstractText._text || article.Abstract.AbstractText || '';
        }
      }
      
      // 발행일 추출
      let publicationDate: Date | undefined;
      if (article.Journal && article.Journal.JournalIssue && article.Journal.JournalIssue.PubDate) {
        const pubDate = article.Journal.JournalIssue.PubDate;
        const year = pubDate.Year?._text || pubDate.Year || '';
        const month = pubDate.Month?._text || pubDate.Month || '01';
        const day = pubDate.Day?._text || pubDate.Day || '01';
        
        // 월 이름을 숫자로 변환
        let monthNum = month;
        if (isNaN(parseInt(month))) {
          const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
          ];
          const monthIndex = monthNames.findIndex(m => month.startsWith(m));
          monthNum = monthIndex !== -1 ? `${monthIndex + 1}` : '01';
        }
        
        // 날짜가 유효한지 확인
        if (year) {
          publicationDate = new Date(`${year}-${monthNum.padStart(2, '0')}-${day.padStart(2, '0')}`);
          
          // 유효하지 않은 날짜인 경우
          if (isNaN(publicationDate.getTime())) {
            publicationDate = new Date(`${year}-01-01`);
          }
        }
      }
      
      // 저널 이름 추출
      let journal = '';
      if (article.Journal && article.Journal.Title) {
        journal = article.Journal.Title._text || article.Journal.Title || '';
      }
      
      // 저자 추출
      const authors: string[] = [];
      const authorAffiliations: string[] = [];
      
      if (article.AuthorList && article.AuthorList.Author) {
        const authorList = Array.isArray(article.AuthorList.Author) 
          ? article.AuthorList.Author 
          : [article.AuthorList.Author];
        
        for (const author of authorList) {
          // 저자 이름 구성
          let lastName = author.LastName?._text || author.LastName || '';
          let foreName = author.ForeName?._text || author.ForeName || '';
          let initials = author.Initials?._text || author.Initials || '';
          
          if (lastName || foreName || initials) {
            const authorName = [lastName, initials ? initials : foreName].filter(Boolean).join(' ');
            authors.push(authorName);
          } else if (author.CollectiveName) {
            authors.push(author.CollectiveName._text || author.CollectiveName || '');
          }
          
          // 소속 추출
          if (author.AffiliationInfo && author.AffiliationInfo.Affiliation) {
            if (Array.isArray(author.AffiliationInfo.Affiliation)) {
              for (const affiliation of author.AffiliationInfo.Affiliation) {
                const affiliationText = affiliation._text || affiliation || '';
                if (affiliationText && !authorAffiliations.includes(affiliationText)) {
                  authorAffiliations.push(affiliationText);
                }
              }
            } else {
              const affiliationText = author.AffiliationInfo.Affiliation._text || author.AffiliationInfo.Affiliation || '';
              if (affiliationText && !authorAffiliations.includes(affiliationText)) {
                authorAffiliations.push(affiliationText);
              }
            }
          }
        }
      }
      
      // 키워드 추출
      const keywords: string[] = [];
      
      // MeSH 용어 추출
      if (citation.MeshHeadingList && citation.MeshHeadingList.MeshHeading) {
        const meshHeadings = Array.isArray(citation.MeshHeadingList.MeshHeading)
          ? citation.MeshHeadingList.MeshHeading
          : [citation.MeshHeadingList.MeshHeading];
        
        for (const mesh of meshHeadings) {
          if (mesh.DescriptorName) {
            const descriptorName = mesh.DescriptorName._text || mesh.DescriptorName || '';
            if (descriptorName && !keywords.includes(descriptorName)) {
              keywords.push(descriptorName);
            }
          }
        }
      }
      
      // 키워드 리스트 추출
      if (citation.KeywordList && citation.KeywordList.Keyword) {
        const keywordList = Array.isArray(citation.KeywordList.Keyword)
          ? citation.KeywordList.Keyword
          : [citation.KeywordList.Keyword];
        
        for (const keyword of keywordList) {
          const keywordText = keyword._text || keyword || '';
          if (keywordText && !keywords.includes(keywordText)) {
            keywords.push(keywordText);
          }
        }
      }
      
      // DOI 및 URL 추출
      let doi = '';
      let url = '';
      
      if (articleData.PubmedData && articleData.PubmedData.ArticleIdList && articleData.PubmedData.ArticleIdList.ArticleId) {
        const articleIds = Array.isArray(articleData.PubmedData.ArticleIdList.ArticleId)
          ? articleData.PubmedData.ArticleIdList.ArticleId
          : [articleData.PubmedData.ArticleIdList.ArticleId];
        
        for (const id of articleIds) {
          if (id['@_IdType'] === 'doi') {
            doi = id._text || id || '';
          }
        }
      }
      
      // URL 구성
      url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
      
      // 아티클 타입 추출
      let articleType = '';
      
      if (article.PublicationTypeList && article.PublicationTypeList.PublicationType) {
        const types = Array.isArray(article.PublicationTypeList.PublicationType)
          ? article.PublicationTypeList.PublicationType
          : [article.PublicationTypeList.PublicationType];
        
        for (const type of types) {
          const typeText = type._text || type || '';
          if (typeText && typeText !== 'Journal Article') {
            articleType = typeText;
            break;
          }
        }
        
        if (!articleType && types.length > 0) {
          articleType = types[0]._text || types[0] || 'Journal Article';
        }
      }
      
      // 아티클 데이터 구성
      return {
        pmid,
        title,
        abstract,
        publicationDate,
        journal,
        authors,
        authorAffiliations,
        keywords,
        doi,
        url,
        articleType: articleType || 'Journal Article',
        citationCount: 0
      };
    } catch (error: any) {
      monitoring.log('warn', 'PubMed 아티클 데이터 추출 오류', {
        error: error.message,
        category: 'api'
      });
      
      return null;
    }
  }

  /**
   * HTTP 요청 실행 (재시도 로직 포함)
   */
  private async makeHttpRequest(url: string, retries: number = PUBMED_MAX_RETRIES): Promise<any> {
    try {
      return await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': `${PUBMED_TOOL}/1.0 (${PUBMED_EMAIL})`
        }
      });
    } catch (error: any) {
      // 429 오류 또는 네트워크 오류인 경우 재시도
      if (
        (error.response && error.response.status === 429) || 
        error.code === 'ECONNABORTED' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND'
      ) {
        if (retries > 0) {
          // 재시도 전 대기
          const delay = PUBMED_RETRY_DELAY_MS * (PUBMED_MAX_RETRIES - retries + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // 재귀적으로 재시도
          return this.makeHttpRequest(url, retries - 1);
        }
      }
      
      throw error;
    }
  }

  /**
   * 날짜를 YYYY/MM/DD 형식으로 포맷
   */
  private formatDate(date: Date): string {
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  }
}

// 싱글톤 인스턴스 생성
export const pubmedAPI = new PubMedAPI();
export default pubmedAPI; 