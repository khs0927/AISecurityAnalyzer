/**
 * 의료 데이터 통합 시스템의 타입 정의
 */

// PubMed 논문 타입
export interface Article {
  pmid: string;
  title: string;
  abstract: string;
  authors: Author[];
  journal?: string;
  pubDate?: string;
  doi?: string;
  keywords: string[];
  meshTerms: string[];
  url?: string;
  citations?: number;
  fullTextAvailable?: boolean;
}

// 저자 타입
export interface Author {
  lastName: string;
  firstName?: string;
  initials?: string;
  affiliation?: string;
}

// Kaggle 데이터셋 타입
export interface Dataset {
  id: string;
  title: string;
  url: string;
  description: string;
  creator: string;
  lastUpdated?: string;
  downloadCount?: number;
  fileCount?: number;
  size?: number;
  tags: string[];
  license?: string;
  usability?: number;
}

// 검색 결과 타입
export interface SearchResult {
  id: number;
  query: string;
  timestamp: Date;
  articles: Article[];
  datasets: Dataset[];
  relatedTerms?: string[];
  userId?: string;
  notes?: string;
  status?: SearchStatus;
  statistics?: SearchStatistics;
}

// 검색 상태 열거형
export enum SearchStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

// 검색 통계 타입
export interface SearchStatistics {
  articleCount: number;
  datasetCount: number;
  uniqueKeywords: number;
  uniqueMeshTerms: number;
  requestDuration: number;
  cacheHit?: boolean;
}

// 논문 저장 옵션
export interface ArticleSaveOptions {
  includeFullText?: boolean;
  includeReferences?: boolean;
  includeCitations?: boolean;
  saveImages?: boolean;
  saveSupplementary?: boolean;
}

// 데이터셋 저장 옵션
export interface DatasetSaveOptions {
  downloadFiles?: boolean;
  downloadMetadata?: boolean;
  maxFileSizeMb?: number;
  fileTypes?: string[];
}

// 사용자 타입
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  preferences?: UserPreferences;
  createdAt: Date;
  lastLogin?: Date;
}

// 사용자 역할 열거형
export enum UserRole {
  ADMIN = 'admin',
  RESEARCHER = 'researcher',
  READER = 'reader'
}

// 사용자 설정 타입
export interface UserPreferences {
  defaultSearchLimit: number;
  preferredTopics?: string[];
  emailNotifications: boolean;
  exportFormat?: 'csv' | 'json' | 'bibtex';
  uiTheme?: 'light' | 'dark' | 'system';
}

// 데이터베이스 통계 타입
export interface DatabaseStatistics {
  totalArticles: number;
  totalDatasets: number;
  totalSearches: number;
  topKeywords: Array<{keyword: string, count: number}>;
  storageUsed: number;
  lastUpdate: Date;
}

// 에러 응답 타입
export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
} 