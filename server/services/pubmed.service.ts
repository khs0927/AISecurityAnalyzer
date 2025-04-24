import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { db } from '../db';
import { pubmedArticles } from '../../shared/medicalData.schema';
import { monitoring } from '../utils/monitoring';
import { env } from '../config/env';
import { delay } from '../utils/common';

export class PubmedService {
  private baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  private apiKey: string;
  private requestDelay = 500; // ms, PubMed 요청 제한 준수

  constructor() {
    this.apiKey = env.PUBMED_API_KEY || '';
    if (!this.apiKey) {
      monitoring.logMessage('warning', 'pubmed', 'PubMed API 키가 설정되지 않았습니다.');
    }
  }

  /**
   * PubMed에서 의학 용어로 검색
   */
  async searchByTerm(term: string, options: {
    maxResults?: number;
    sortBy?: 'relevance' | 'pub_date';
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ count: number; ids: string[] }> {
    const { maxResults = 100, sortBy = 'relevance', startDate, endDate } = options;
    
    try {
      monitoring.logMessage('info', 'pubmed', `키워드 "${term}"로 PubMed 검색 시작`);
      
      // 검색 요청 구성
      let searchUrl = `${this.baseUrl}/esearch.fcgi`;
      let params: any = {
        db: 'pubmed',
        term,
        retmax: maxResults,
        retmode: 'json',
        sort: sortBy === 'pub_date' ? 'pub+date' : 'relevance',
      };
      
      if (this.apiKey) {
        params.api_key = this.apiKey;
      }
      
      if (startDate) {
        params.mindate = startDate;
      }
      
      if (endDate) {
        params.maxdate = endDate;
      }
      
      // 검색 요청 실행
      const response = await axios.get(searchUrl, { params });
      const data = response.data.esearchresult;
      const count = parseInt(data.count);
      const ids = data.idlist || [];
      
      monitoring.logMessage('info', 'pubmed', `PubMed 검색 완료: ${count}개 결과 발견, ${ids.length}개 ID 반환`);
      
      return { count, ids };
    } catch (error: any) {
      monitoring.logMessage('error', 'pubmed', `PubMed 검색 오류: ${error.message}`);
      throw new Error(`PubMed 검색 오류: ${error.message}`);
    }
  }

  /**
   * 논문 ID로 상세 정보 조회
   */
  async fetchArticleDetails(pmids: string[]): Promise<any[]> {
    if (!pmids.length) return [];
    
    try {
      monitoring.logMessage('info', 'pubmed', `${pmids.length}개 논문 상세 정보 조회 시작`);
      
      // ID 목록을 쉼표로 구분
      const pmidString = pmids.join(',');
      
      // 상세 정보 요청 구성
      let fetchUrl = `${this.baseUrl}/efetch.fcgi`;
      let params: any = {
        db: 'pubmed',
        id: pmidString,
        retmode: 'xml',
      };
      
      if (this.apiKey) {
        params.api_key = this.apiKey;
      }
      
      // 상세 정보 요청 실행
      const response = await axios.get(fetchUrl, { params });
      const xmlData = response.data;
      
      // XML 파싱
      const parsedData = await parseStringPromise(xmlData);
      const articles = this.parseArticlesFromXml(parsedData);
      
      monitoring.logMessage('info', 'pubmed', `${articles.length}개 논문 상세 정보 조회 완료`);
      
      return articles;
    } catch (error: any) {
      monitoring.logMessage('error', 'pubmed', `논문 상세 정보 조회 오류: ${error.message}`);
      throw new Error(`논문 상세 정보 조회 오류: ${error.message}`);
    }
  }

  /**
   * XML 데이터에서 논문 정보 파싱
   */
  private parseArticlesFromXml(data: any): any[] {
    try {
      const articlesResult = [];
      const pubmedArticleSet = data.PubmedArticleSet;
      
      if (!pubmedArticleSet || !pubmedArticleSet.PubmedArticle) {
        return [];
      }
      
      const articles = Array.isArray(pubmedArticleSet.PubmedArticle) 
        ? pubmedArticleSet.PubmedArticle 
        : [pubmedArticleSet.PubmedArticle];
      
      for (const article of articles) {
        try {
          const medlineCitation = article.MedlineCitation[0];
          const pmid = medlineCitation.PMID[0]._;
          const articleData = medlineCitation.Article[0];
          
          // 기본 정보 추출
          const title = articleData.ArticleTitle ? articleData.ArticleTitle[0] : '';
          let abstract = '';
          
          if (articleData.Abstract && articleData.Abstract[0].AbstractText) {
            abstract = articleData.Abstract[0].AbstractText.map((text: any) => {
              return typeof text === 'string' ? text : text._;
            }).join(' ');
          }
          
          // 저자 정보 추출
          const authors = [];
          if (articleData.AuthorList && articleData.AuthorList[0].Author) {
            for (const author of articleData.AuthorList[0].Author) {
              const authorName = [];
              if (author.LastName) authorName.push(author.LastName[0]);
              if (author.ForeName) authorName.push(author.ForeName[0]);
              
              authors.push({
                name: authorName.join(' '),
                affiliation: author.AffiliationInfo ? author.AffiliationInfo[0].Affiliation[0] : '',
              });
            }
          }
          
          // 저널 정보 추출
          let journal = '';
          if (articleData.Journal && articleData.Journal[0].Title) {
            journal = articleData.Journal[0].Title[0];
          }
          
          // 키워드 추출
          const keywords = [];
          if (medlineCitation.KeywordList && medlineCitation.KeywordList[0].Keyword) {
            for (const keyword of medlineCitation.KeywordList[0].Keyword) {
              keywords.push(keyword._);
            }
          }
          
          // 출판 날짜 추출
          let publicationDate = null;
          if (articleData.Journal && articleData.Journal[0].JournalIssue && 
              articleData.Journal[0].JournalIssue[0].PubDate) {
            const pubDate = articleData.Journal[0].JournalIssue[0].PubDate[0];
            if (pubDate.Year) {
              const year = pubDate.Year[0];
              const month = pubDate.Month ? pubDate.Month[0] : '01';
              const day = pubDate.Day ? pubDate.Day[0] : '01';
              publicationDate = `${year}-${month}-${day}`;
            }
          }
          
          // DOI 추출
          let doi = '';
          if (articleData.ELocationID) {
            const doiElement = articleData.ELocationID.find((id: any) => id.$.EIdType === 'doi');
            if (doiElement) {
              doi = doiElement._;
            }
          }
          
          articlesResult.push({
            pmid,
            title,
            abstract,
            authors,
            journal,
            keywords,
            publicationDate,
            doi,
          });
        } catch (parseError) {
          monitoring.logMessage('warning', 'pubmed', `단일 논문 파싱 오류: ${parseError.message}`);
          continue;
        }
      }
      
      return articlesResult;
    } catch (error: any) {
      monitoring.logMessage('error', 'pubmed', `XML 파싱 오류: ${error.message}`);
      return [];
    }
  }

  /**
   * 검색 결과를 데이터베이스에 저장
   */
  async saveArticlesToDatabase(articles: any[]): Promise<number> {
    if (!articles.length) return 0;
    
    try {
      monitoring.logMessage('info', 'pubmed', `${articles.length}개 논문 데이터베이스 저장 시작`);
      let savedCount = 0;
      
      for (const article of articles) {
        try {
          // 이미 저장된 논문인지 확인
          const existing = await db.query.pubmedArticles.findFirst({
            where: (fields, { eq }) => eq(fields.pmid, article.pmid)
          });
          
          if (existing) {
            monitoring.logMessage('debug', 'pubmed', `논문 ID ${article.pmid} 이미 존재함, 건너뜀`);
            continue;
          }
          
          // 데이터베이스에 삽입
          await db.insert(pubmedArticles).values({
            pmid: article.pmid,
            title: article.title,
            abstract: article.abstract,
            authors: article.authors,
            journal: article.journal,
            publicationDate: article.publicationDate,
            keywords: article.keywords,
            doi: article.doi,
          });
          
          savedCount++;
        } catch (saveError: any) {
          monitoring.logMessage('warning', 'pubmed', `논문 저장 오류 (ID: ${article.pmid}): ${saveError.message}`);
          continue;
        }
        
        // API 요청 제한 준수를 위한 딜레이
        await delay(this.requestDelay);
      }
      
      monitoring.logMessage('info', 'pubmed', `${savedCount}개 논문 저장 완료`);
      return savedCount;
    } catch (error: any) {
      monitoring.logMessage('error', 'pubmed', `논문 저장 오류: ${error.message}`);
      throw new Error(`논문 저장 오류: ${error.message}`);
    }
  }

  /**
   * 키워드로 검색하고 결과를 데이터베이스에 저장
   */
  async searchAndSave(term: string, options: {
    maxResults?: number;
    sortBy?: 'relevance' | 'pub_date';
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ total: number; fetched: number; saved: number }> {
    try {
      // 검색 실행
      const { count, ids } = await this.searchByTerm(term, options);
      
      if (ids.length === 0) {
        return { total: count, fetched: 0, saved: 0 };
      }
      
      // 논문 상세 정보 조회
      const articles = await this.fetchArticleDetails(ids);
      
      // 데이터베이스에 저장
      const savedCount = await this.saveArticlesToDatabase(articles);
      
      return {
        total: count,
        fetched: articles.length,
        saved: savedCount
      };
    } catch (error: any) {
      monitoring.logMessage('error', 'pubmed', `검색 및 저장 과정 오류: ${error.message}`);
      throw new Error(`PubMed 검색 및 저장 오류: ${error.message}`);
    }
  }
}

export const pubmedService = new PubmedService(); 