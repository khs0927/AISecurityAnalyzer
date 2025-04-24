import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { Article, Author, ArticleSaveOptions } from '../models/types';
import config from '../config';
import { logger } from '../utils/logger';
import { formatDate, sleep, generateUniqueId } from '../utils/helpers';
import { DatabaseService } from './databaseService';
import { CacheService } from './cacheService';

/**
 * PubMed API 서비스
 * 의학 논문 검색 및 데이터 처리를 담당합니다.
 */
export class PubMedService {
  private readonly baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  private readonly apiKey: string;
  private readonly db: DatabaseService;
  private readonly cache: CacheService;
  private readonly parser: XMLParser;
  private readonly requestDelay: number;
  private readonly maxRetries: number;

  /**
   * PubMed 서비스 생성자
   */
  constructor(db: DatabaseService, cache: CacheService) {
    this.apiKey = config.apis.pubmed.apiKey;
    this.db = db;
    this.cache = cache;
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name, jpath) => {
        const arrayElements = [
          'PubmedArticle', 'PubmedBookArticle', 'Author', 'KeywordList', 
          'MeshHeading', 'ArticleId', 'Keyword'
        ];
        return arrayElements.includes(name);
      }
    });
    this.requestDelay = config.apis.pubmed.requestDelay || 500;
    this.maxRetries = config.apis.pubmed.maxRetries || 3;
  }

  /**
   * PubMed API 검색 기능
   * @param query 검색어
   * @param options 검색 옵션
   * @returns 검색된 논문 ID 목록
   */
  public async search(
    query: string, 
    options: { 
      maxResults?: number,
      sort?: 'relevance' | 'pub_date',
      minDate?: string,
      maxDate?: string
    } = {}
  ): Promise<string[]> {
    const cacheKey = `pubmed_search:${query}:${JSON.stringify(options)}`;
    const cachedResult = await this.cache.get<string[]>(cacheKey);
    
    if (cachedResult) {
      logger.debug(`PubMed 검색 캐시 히트: ${query}`);
      return cachedResult;
    }
    
    try {
      const { maxResults = config.apis.pubmed.defaultSearchLimit, sort, minDate, maxDate } = options;
      
      // 검색 파라미터 구성
      const params = new URLSearchParams({
        db: 'pubmed',
        term: query,
        retmax: maxResults.toString(),
        retmode: 'json',
        usehistory: 'y'
      });
      
      if (this.apiKey) {
        params.append('api_key', this.apiKey);
      }
      
      if (sort === 'relevance') {
        params.append('sort', 'relevance');
      } else if (sort === 'pub_date') {
        params.append('sort', 'pub_date');
      }
      
      if (minDate) {
        params.append('mindate', minDate);
      }
      
      if (maxDate) {
        params.append('maxdate', maxDate);
      }
      
      // ESearch API 요청
      const searchUrl = `${this.baseUrl}/esearch.fcgi`;
      const response = await this.makeRequest<any>(searchUrl, params);
      
      if (!response?.esearchresult?.idlist) {
        logger.warn(`PubMed 검색 결과가 없습니다: ${query}`);
        return [];
      }
      
      const pmids = response.esearchresult.idlist as string[];
      
      // 캐시에 검색 결과 저장 (1시간)
      await this.cache.set(cacheKey, pmids, 60 * 60);
      
      logger.info(`PubMed 검색 완료: ${query}, ${pmids.length}개 결과 발견`);
      return pmids;
      
    } catch (error) {
      logger.error(`PubMed 검색 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`PubMed 검색 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * PubMed ID로 논문 상세 정보 조회
   * @param pmids PubMed ID 목록
   * @returns 논문 정보 객체 배열
   */
  public async fetchArticles(pmids: string[]): Promise<Article[]> {
    if (!pmids.length) {
      return [];
    }
    
    // 캐시에서 이미 조회된 논문 확인
    const cachedArticles: Article[] = [];
    const missingPmids: string[] = [];
    
    for (const pmid of pmids) {
      const cacheKey = `pubmed_article:${pmid}`;
      const cachedArticle = await this.cache.get<Article>(cacheKey);
      
      if (cachedArticle) {
        cachedArticles.push(cachedArticle);
      } else {
        missingPmids.push(pmid);
      }
    }
    
    // 캐시에 없는 논문만 API에서 조회
    if (missingPmids.length === 0) {
      logger.debug(`모든 논문이 캐시에서 발견됨 (${pmids.length}개)`);
      return cachedArticles;
    }
    
    try {
      logger.debug(`PubMed에서 ${missingPmids.length}개 논문 조회 중`);
      
      // 병렬 요청 없이 한 번에 여러 ID 요청
      const params = new URLSearchParams({
        db: 'pubmed',
        id: missingPmids.join(','),
        retmode: 'xml',
        rettype: 'abstract'
      });
      
      if (this.apiKey) {
        params.append('api_key', this.apiKey);
      }
      
      // EFetch API 요청
      const fetchUrl = `${this.baseUrl}/efetch.fcgi`;
      const response = await this.makeRequest<string>(fetchUrl, params, true);
      
      if (!response) {
        logger.warn('PubMed 응답이 비어있습니다');
        return cachedArticles;
      }
      
      // XML 응답 파싱
      const result = this.parser.parse(response);
      const articles = this.parseArticles(result);
      
      // 개별 논문을 캐시에 저장 (1일)
      for (const article of articles) {
        const cacheKey = `pubmed_article:${article.pmid}`;
        await this.cache.set(cacheKey, article, 24 * 60 * 60);
      }
      
      return [...cachedArticles, ...articles];
      
    } catch (error) {
      logger.error(`PubMed 논문 조회 오류: ${error instanceof Error ? error.message : String(error)}`);
      
      // 오류 발생시에도 캐시에서 조회된 결과는 반환
      if (cachedArticles.length > 0) {
        logger.info(`캐시에서 ${cachedArticles.length}개 논문 반환`);
        return cachedArticles;
      }
      
      throw new Error(`PubMed 논문 조회 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 특정 PubMed ID의 논문 저장
   * @param pmid PubMed ID
   * @param options 저장 옵션
   * @returns 저장된 논문 ID
   */
  public async saveArticle(pmid: string, options: ArticleSaveOptions = {}): Promise<number> {
    try {
      const articles = await this.fetchArticles([pmid]);
      
      if (!articles.length) {
        throw new Error(`PubMed ID ${pmid}에 해당하는 논문을 찾을 수 없습니다`);
      }
      
      const article = articles[0];
      
      // 저널 정보 처리
      let journalId: number | null = null;
      if (article.journal) {
        journalId = await this.db.findOrCreateJournal(article.journal);
      }
      
      // 논문 저장 또는 업데이트
      const articleId = await this.db.upsertArticle({
        pmid: article.pmid,
        title: article.title,
        abstract: article.abstract || null,
        journalId,
        pubDate: article.pubDate ? new Date(article.pubDate) : null,
        doi: article.doi || null,
        url: article.url || null,
        fullTextAvailable: options.includeFullText || false,
        fullText: options.fullText || null
      });
      
      // 저자 정보 처리
      if (article.authors && article.authors.length > 0) {
        for (let i = 0; i < article.authors.length; i++) {
          const author = article.authors[i];
          const authorId = await this.db.findOrCreateAuthor({
            lastName: author.lastName,
            firstName: author.firstName || null,
            initials: author.initials || null,
            affiliation: author.affiliation || null
          });
          
          await this.db.linkArticleAuthor(articleId, authorId, i === 0, i + 1);
        }
      }
      
      // 키워드 및 MeSH 용어 처리
      if (options.includeKeywords && article.keywords && article.keywords.length > 0) {
        for (const keyword of article.keywords) {
          const keywordId = await this.db.findOrCreateKeyword(keyword);
          await this.db.linkArticleKeyword(articleId, keywordId);
        }
      }
      
      if (options.includeMeshTerms && article.meshTerms && article.meshTerms.length > 0) {
        for (const term of article.meshTerms) {
          const meshTermId = await this.db.findOrCreateMeshTerm(term.term, term.description);
          await this.db.linkArticleMeshTerm(articleId, meshTermId, term.isMajorTopic || false);
        }
      }
      
      logger.info(`논문 저장 완료: ${article.pmid}, ${article.title}`);
      return articleId;
      
    } catch (error) {
      logger.error(`논문 저장 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`논문 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 검색 결과 저장 (여러 논문)
   * @param searchId 검색 ID
   * @param pmids PubMed ID 목록
   * @param options 저장 옵션
   * @returns 저장된 논문 수
   */
  public async saveSearchResults(
    searchId: number, 
    pmids: string[], 
    options: ArticleSaveOptions & { batchSize?: number } = {}
  ): Promise<number> {
    if (!pmids.length) {
      return 0;
    }

    try {
      const { batchSize = 10, ...saveOptions } = options;
      let savedCount = 0;
      
      // 배치 처리
      for (let i = 0; i < pmids.length; i += batchSize) {
        const batch = pmids.slice(i, i + batchSize);
        const articles = await this.fetchArticles(batch);
        
        for (const article of articles) {
          const articleId = await this.saveArticle(article.pmid, saveOptions);
          await this.db.linkSearchArticle(searchId, articleId);
          savedCount++;
          
          // API 요청 제한 준수를 위한 딜레이
          await sleep(this.requestDelay);
        }
        
        logger.info(`논문 저장 진행 중: ${i + batch.length}/${pmids.length}`);
      }
      
      return savedCount;
      
    } catch (error) {
      logger.error(`검색 결과 저장 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`검색 결과 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 논문 인용 수 조회
   * @param pmid PubMed ID
   * @returns 인용 수
   */
  public async getCitationCount(pmid: string): Promise<number> {
    const cacheKey = `pubmed_citations:${pmid}`;
    const cachedCount = await this.cache.get<number>(cacheKey);
    
    if (cachedCount !== null) {
      return cachedCount;
    }
    
    try {
      // ELink API를 사용하여 인용 정보 조회
      const params = new URLSearchParams({
        db: 'pubmed',
        id: pmid,
        linkname: 'pubmed_pubmed_citedin',
        retmode: 'json'
      });
      
      if (this.apiKey) {
        params.append('api_key', this.apiKey);
      }
      
      const linkUrl = `${this.baseUrl}/elink.fcgi`;
      const response = await this.makeRequest<any>(linkUrl, params);
      
      let citationCount = 0;
      
      if (response?.linksets?.[0]?.linksetdbs?.[0]?.links) {
        citationCount = response.linksets[0].linksetdbs[0].links.length;
      }
      
      // 인용 수를 캐시에 저장 (1일)
      await this.cache.set(cacheKey, citationCount, 24 * 60 * 60);
      
      return citationCount;
      
    } catch (error) {
      logger.error(`인용 수 조회 오류: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * 관련 논문 추천
   * @param pmid PubMed ID
   * @param maxResults 최대 결과 수
   * @returns 관련 논문 ID 목록
   */
  public async getRelatedArticles(pmid: string, maxResults: number = 10): Promise<string[]> {
    const cacheKey = `pubmed_related:${pmid}:${maxResults}`;
    const cachedResult = await this.cache.get<string[]>(cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }
    
    try {
      // ELink API를 사용하여 관련 논문 조회
      const params = new URLSearchParams({
        db: 'pubmed',
        id: pmid,
        linkname: 'pubmed_pubmed',
        retmode: 'json'
      });
      
      if (this.apiKey) {
        params.append('api_key', this.apiKey);
      }
      
      const linkUrl = `${this.baseUrl}/elink.fcgi`;
      const response = await this.makeRequest<any>(linkUrl, params);
      
      let relatedPmids: string[] = [];
      
      if (response?.linksets?.[0]?.linksetdbs?.[0]?.links) {
        relatedPmids = response.linksets[0].linksetdbs[0].links
          .map((link: any) => link.id)
          .slice(0, maxResults);
      }
      
      // 관련 논문을 캐시에 저장 (1일)
      await this.cache.set(cacheKey, relatedPmids, 24 * 60 * 60);
      
      return relatedPmids;
      
    } catch (error) {
      logger.error(`관련 논문 조회 오류: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * API 요청 처리 함수
   * 재시도 로직 포함
   */
  private async makeRequest<T>(
    url: string, 
    params: URLSearchParams, 
    rawResponse: boolean = false
  ): Promise<T> {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        const response = await axios.get(url, { params });
        
        if (rawResponse) {
          return response.data as T;
        }
        
        return response.data;
        
      } catch (error) {
        retries++;
        const isLastRetry = retries >= this.maxRetries;
        const status = axios.isAxiosError(error) && error.response ? error.response.status : 'unknown';
        
        logger.warn(`PubMed API 요청 실패 (${status}), 재시도 ${retries}/${this.maxRetries}`);
        
        if (isLastRetry) {
          throw error;
        }
        
        // 재시도 전 지수 백오프 딜레이
        await sleep(this.requestDelay * Math.pow(2, retries));
      }
    }
    
    throw new Error('모든 API 요청 재시도가 실패했습니다');
  }

  /**
   * PubMed XML 응답 파싱
   */
  private parseArticles(data: any): Article[] {
    const articles: Article[] = [];
    
    if (!data?.PubmedArticleSet?.PubmedArticle) {
      return articles;
    }
    
    const pubmedArticles = Array.isArray(data.PubmedArticleSet.PubmedArticle) 
      ? data.PubmedArticleSet.PubmedArticle 
      : [data.PubmedArticleSet.PubmedArticle];
    
    for (const pubmedArticle of pubmedArticles) {
      try {
        const article = this.parseArticle(pubmedArticle);
        if (article) {
          articles.push(article);
        }
      } catch (error) {
        logger.error(`논문 파싱 오류: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return articles;
  }

  /**
   * 단일 PubMed 논문 파싱
   */
  private parseArticle(pubmedArticle: any): Article | null {
    const medlineCitation = pubmedArticle.MedlineCitation;
    const articleData = medlineCitation.Article;
    
    if (!medlineCitation || !articleData) {
      return null;
    }
    
    const pmid = medlineCitation.PMID?._text || '';
    
    if (!pmid) {
      return null;
    }
    
    // 기본 정보 추출
    const article: Article = {
      pmid,
      title: this.cleanText(articleData.ArticleTitle?._text || ''),
      abstract: this.parseAbstract(articleData.Abstract),
      authors: this.parseAuthors(articleData.AuthorList),
      journal: articleData.Journal?.Title?._text || undefined,
      pubDate: this.parsePubDate(articleData.Journal?.JournalIssue?.PubDate),
      keywords: this.parseKeywords(medlineCitation.KeywordList),
      meshTerms: this.parseMeshTerms(medlineCitation.MeshHeadingList),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
    };
    
    // DOI 추출
    if (pubmedArticle.PubmedData?.ArticleIdList?.ArticleId) {
      const articleIds = Array.isArray(pubmedArticle.PubmedData.ArticleIdList.ArticleId)
        ? pubmedArticle.PubmedData.ArticleIdList.ArticleId
        : [pubmedArticle.PubmedData.ArticleIdList.ArticleId];
      
      for (const id of articleIds) {
        if (id['@_IdType'] === 'doi') {
          article.doi = id._text;
          break;
        }
      }
    }
    
    return article;
  }

  /**
   * 초록 파싱
   */
  private parseAbstract(abstractData: any): string {
    if (!abstractData) {
      return '';
    }
    
    // 구조화된 초록 처리
    if (abstractData.AbstractText && Array.isArray(abstractData.AbstractText)) {
      return abstractData.AbstractText
        .map((section: any) => {
          const label = section['@_Label'] ? `${section['@_Label']}: ` : '';
          return `${label}${section._text || ''}`;
        })
        .join('\n\n');
    }
    
    // 일반 초록 처리
    return this.cleanText(abstractData.AbstractText?._text || '');
  }

  /**
   * 저자 정보 파싱
   */
  private parseAuthors(authorListData: any): Author[] {
    if (!authorListData?.Author) {
      return [];
    }
    
    const authors = Array.isArray(authorListData.Author)
      ? authorListData.Author
      : [authorListData.Author];
    
    return authors.map((authorData: any) => {
      const author: Author = {
        lastName: authorData.LastName?._text || '',
        firstName: authorData.ForeName?._text || '',
        initials: authorData.Initials?._text || ''
      };
      
      if (authorData.AffiliationInfo?.Affiliation?._text) {
        author.affiliation = authorData.AffiliationInfo.Affiliation._text;
      }
      
      return author;
    }).filter((author: Author) => author.lastName || author.firstName);
  }

  /**
   * 출판일 파싱
   */
  private parsePubDate(pubDateData: any): string | undefined {
    if (!pubDateData) {
      return undefined;
    }
    
    // 연도, 월, 일 조합
    const year = pubDateData.Year?._text;
    const month = pubDateData.Month?._text;
    const day = pubDateData.Day?._text;
    
    if (year && month && day) {
      try {
        return formatDate(new Date(`${year}-${this.normalizeMonth(month)}-${day}`));
      } catch (e) {
        // 날짜 변환 실패시
      }
    }
    
    // 연도와 월만 있는 경우
    if (year && month) {
      try {
        return formatDate(new Date(`${year}-${this.normalizeMonth(month)}-01`));
      } catch (e) {
        // 날짜 변환 실패시
      }
    }
    
    // 연도만 있는 경우
    if (year) {
      return formatDate(new Date(`${year}-01-01`));
    }
    
    // MedlineDate 형식 처리
    if (pubDateData.MedlineDate?._text) {
      const match = pubDateData.MedlineDate._text.match(/(\d{4})/);
      if (match && match[1]) {
        return formatDate(new Date(`${match[1]}-01-01`));
      }
    }
    
    return undefined;
  }

  /**
   * 키워드 파싱
   */
  private parseKeywords(keywordListData: any): string[] {
    if (!keywordListData?.Keyword) {
      return [];
    }
    
    const keywords = Array.isArray(keywordListData.Keyword)
      ? keywordListData.Keyword
      : [keywordListData.Keyword];
    
    return keywords
      .map((keywordData: any) => keywordData._text)
      .filter((keyword: string) => keyword && keyword.trim().length > 0);
  }

  /**
   * MeSH 용어 파싱
   */
  private parseMeshTerms(meshHeadingListData: any): { term: string; description?: string; isMajorTopic?: boolean }[] {
    if (!meshHeadingListData?.MeshHeading) {
      return [];
    }
    
    const meshHeadings = Array.isArray(meshHeadingListData.MeshHeading)
      ? meshHeadingListData.MeshHeading
      : [meshHeadingListData.MeshHeading];
    
    return meshHeadings.map((heading: any) => {
      const descriptorName = heading.DescriptorName;
      const isMajorTopic = descriptorName['@_MajorTopicYN'] === 'Y';
      
      return {
        term: descriptorName._text,
        isMajorTopic
      };
    });
  }

  /**
   * 월 이름을 숫자로 변환
   */
  private normalizeMonth(month: string): string {
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'January': '01',
      'Feb': '02', 'February': '02',
      'Mar': '03', 'March': '03',
      'Apr': '04', 'April': '04',
      'May': '05',
      'Jun': '06', 'June': '06',
      'Jul': '07', 'July': '07',
      'Aug': '08', 'August': '08',
      'Sep': '09', 'September': '09',
      'Oct': '10', 'October': '10',
      'Nov': '11', 'November': '11',
      'Dec': '12', 'December': '12'
    };
    
    // 이미 숫자인 경우
    if (/^\d+$/.test(month)) {
      return month.padStart(2, '0');
    }
    
    // 월 이름인 경우
    return monthMap[month] || '01';
  }

  /**
   * 텍스트 정리 (HTML 태그 제거 등)
   */
  private cleanText(text: string): string {
    return text
      .replace(/<\/?[^>]+(>|$)/g, '') // HTML 태그 제거
      .replace(/\s+/g, ' ')           // 연속된 공백 제거
      .trim();
  }
} 