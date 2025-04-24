import { pgTable, serial, timestamp, text, integer, boolean, json, varchar, date, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// 권한 수준 열거형
export const userRoleEnum = pgEnum('user_role', ['admin', 'researcher', 'viewer']);

// 데이터 소스 타입 열거형
export const dataSourceEnum = pgEnum('data_source', ['pubmed', 'kaggle', 'manual', 'other']);

// 데이터 상태 열거형
export const dataStatusEnum = pgEnum('data_status', ['pending', 'processing', 'completed', 'failed', 'archived']);

// 사용자 테이블
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  organization: text('organization'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLogin: timestamp('last_login'),
  apiKey: text('api_key').unique(),
  isActive: boolean('is_active').default(true).notNull(),
  preferences: json('preferences').default({})
});

// PubMed 논문 테이블
export const pubmedArticles = pgTable('pubmed_articles', {
  id: serial('id').primaryKey(),
  pmid: text('pmid').notNull().unique(),
  title: text('title').notNull(),
  abstract: text('abstract'),
  authors: json('authors').default([]),
  journal: text('journal'),
  publicationDate: timestamp('publication_date'),
  keywords: json('keywords').default([]),
  meshTerms: json('mesh_terms').default([]),
  doi: text('doi'),
  url: text('url'),
  citationCount: integer('citation_count').default(0),
  fullTextPath: text('full_text_path'),
  hasFullText: boolean('has_full_text').default(false),
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id),
  status: dataStatusEnum('status').default('pending'),
  relevanceScore: integer('relevance_score')
}, (table) => {
  return {
    publicationDateIdx: index('pubmed_publication_date_idx').on(table.publicationDate),
    keywordsIdx: index('pubmed_keywords_idx').on(table.keywords),
    statusIdx: index('pubmed_status_idx').on(table.status)
  };
});

// Kaggle 데이터셋 테이블
export const kaggleDatasets = pgTable('kaggle_datasets', {
  id: serial('id').primaryKey(), 
  datasetId: varchar('dataset_id', { length: 255 }).notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  owner: text('owner'),
  tags: json('tags').default([]),
  size: text('size'),
  lastUpdated: timestamp('last_updated'),
  downloadCount: integer('download_count').default(0),
  voteCount: integer('vote_count').default(0),
  fileCount: integer('file_count').default(0),
  metadata: json('metadata').default({}),
  downloadPath: text('download_path'),
  isDownloaded: boolean('is_downloaded').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id),
  status: dataStatusEnum('status').default('pending')
}, (table) => {
  return {
    tagsIdx: index('kaggle_tags_idx').on(table.tags),
    statusIdx: index('kaggle_status_idx').on(table.status)
  };
});

// 데이터셋 파일 테이블
export const datasetFiles = pgTable('dataset_files', {
  id: serial('id').primaryKey(),
  datasetId: integer('dataset_id'),
  name: text('name').notNull(),
  path: text('path').notNull(),
  size: text('size'),
  fileType: text('file_type'),
  contentType: text('content_type'),
  metadata: json('metadata').default({}),
  sourceId: text('source_id'),
  source: dataSourceEnum('source').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  status: dataStatusEnum('status').default('pending')
}, (table) => {
  return {
    sourceIdx: index('dataset_files_source_idx').on(table.source),
    statusIdx: index('dataset_files_status_idx').on(table.status)
  };
});

// 의학 용어 사전 테이블
export const medicalTerms = pgTable('medical_terms', {
  id: serial('id').primaryKey(),
  term: text('term').notNull().unique(),
  category: text('category').notNull(),
  definition: text('definition').notNull(),
  synonyms: json('synonyms').default([]),
  related: json('related').default([]),
  source: text('source'),
  meshId: text('mesh_id'),
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id)
});

// 데이터 수집 작업 테이블
export const dataCollectionJobs = pgTable('data_collection_jobs', {
  id: serial('id').primaryKey(),
  jobType: text('job_type').notNull(),
  source: dataSourceEnum('source').notNull(),
  query: text('query'),
  parameters: json('parameters').default({}),
  status: dataStatusEnum('status').default('pending'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  results: json('results').default({}),
  error: text('error'),
  itemsProcessed: integer('items_processed').default(0),
  itemsSucceeded: integer('items_succeeded').default(0),
  itemsFailed: integer('items_failed').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id)
});

// 검색 히스토리 테이블
export const searchHistory = pgTable('search_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  query: text('query').notNull(),
  source: dataSourceEnum('source').notNull(),
  parameters: json('parameters').default({}),
  resultCount: integer('result_count').default(0),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  sessionId: text('session_id'),
  userAgent: text('user_agent'),
  ip: text('ip')
});

// 데이터 분석 결과 테이블
export const dataAnalysisResults = pgTable('data_analysis_results', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  analysisType: text('analysis_type').notNull(),
  parameters: json('parameters').default({}),
  results: jsonb('results').notNull(),
  visualization: jsonb('visualization').default({}),
  sources: json('sources').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id),
  isPublic: boolean('is_public').default(false)
});

// API 키 테이블
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  service: text('service').notNull(),
  key: text('key').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastUsed: timestamp('last_used'),
  usageCount: integer('usage_count').default(0),
  limits: json('limits').default({}),
  metadata: json('metadata').default({})
});

// 시스템 설정 테이블
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: integer('updated_by').references(() => users.id)
}, (table) => {
  return {
    categoryKeyIdx: index('system_settings_category_key_idx').on(table.category, table.key)
  };
});

// 데이터 컬렉션 테이블
export const medicalDataCollections = pgTable('medical_data_collections', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  sourceType: dataSourceEnum('source_type').notNull(),
  sourceId: varchar('source_id', { length: 100 }),
  dataType: varchar('data_type', { length: 50 }).notNull(),
  tags: json('tags').default({}),
  metadata: json('metadata').default({}),
  processingStatus: varchar('processing_status', { length: 20 }).default('pending'),
  filePath: text('file_path'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 연구 프로젝트 테이블
export const researchProjects = pgTable('research_projects', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  researcherId: integer('researcher_id'),
  keywords: json('keywords').default({}),
  collections: json('collections').default({}),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 데이터 검색 쿼리 테이블
export const searchQueries = pgTable('search_queries', {
  id: serial('id').primaryKey(),
  query: text('query').notNull(),
  source: dataSourceEnum('source').notNull(),
  parameters: json('parameters').default({}),
  results: json('results').default({}),
  resultCount: integer('result_count'),
  executedAt: timestamp('executed_at').defaultNow(),
  executionTime: integer('execution_time'),
  userId: integer('user_id'),
  saved: boolean('saved').default(false),
  name: varchar('name', { length: 100 }),
});

// Zod 스키마 생성
export const insertPubmedArticleSchema = createInsertSchema(pubmedArticles);
export const selectPubmedArticleSchema = createSelectSchema(pubmedArticles);

export const insertKaggleDatasetSchema = createInsertSchema(kaggleDatasets);
export const selectKaggleDatasetSchema = createSelectSchema(kaggleDatasets);

export const insertMedicalDataCollectionSchema = createInsertSchema(medicalDataCollections);
export const selectMedicalDataCollectionSchema = createSelectSchema(medicalDataCollections);

export const insertResearchProjectSchema = createInsertSchema(researchProjects);
export const selectResearchProjectSchema = createSelectSchema(researchProjects);

export const insertSearchQuerySchema = createInsertSchema(searchQueries);
export const selectSearchQuerySchema = createSelectSchema(searchQueries); 