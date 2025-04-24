-- 의료 데이터 통합 시스템 데이터베이스 스키마
-- 버전: 1.0
-- 설명: PubMed 및 Kaggle API에서 수집한 의료 데이터를 저장하는 스키마

-- 스키마 생성
CREATE SCHEMA IF NOT EXISTS medical_data;

-- 기본 스키마 설정
SET search_path TO medical_data, public;

-- 익스텐션 설정
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID 생성
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- 트라이그램 (유사 텍스트 검색)
CREATE EXTENSION IF NOT EXISTS postgis;      -- 지리 정보
CREATE EXTENSION IF NOT EXISTS hstore;       -- 키-값 쌍 저장

-----------------------------------------------------
-- 기본 테이블
-----------------------------------------------------

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'researcher',
    active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    CONSTRAINT role_check CHECK (role IN ('admin', 'researcher', 'reader'))
);

-- 논문 저자 테이블
CREATE TABLE IF NOT EXISTS authors (
    id SERIAL PRIMARY KEY,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    initials VARCHAR(20),
    affiliation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (last_name, first_name, initials)
);

-- 저널 테이블
CREATE TABLE IF NOT EXISTS journals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    publisher VARCHAR(255),
    impact_factor FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 키워드 테이블
CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    term VARCHAR(100) NOT NULL UNIQUE,
    frequency INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MeSH 용어 테이블 (Medical Subject Headings)
CREATE TABLE IF NOT EXISTS mesh_terms (
    id SERIAL PRIMARY KEY,
    term VARCHAR(255) NOT NULL UNIQUE,
    tree_number VARCHAR(50),
    description TEXT,
    frequency INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 태그 테이블 (데이터셋 태그)
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    frequency INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-----------------------------------------------------
-- 메인 데이터 테이블
-----------------------------------------------------

-- 검색 히스토리 테이블
CREATE TABLE IF NOT EXISTS searches (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    statistics JSONB DEFAULT '{}',
    notes TEXT,
    CONSTRAINT status_check CHECK (status IN ('pending', 'completed', 'failed', 'partial'))
);

-- 논문 테이블
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    pmid VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    abstract TEXT,
    journal_id INTEGER REFERENCES journals(id) ON DELETE SET NULL,
    pub_date DATE,
    doi VARCHAR(100),
    url TEXT,
    citations INTEGER DEFAULT 0,
    full_text_available BOOLEAN DEFAULT false,
    full_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 데이터셋 테이블
CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(100) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    creator VARCHAR(255),
    url TEXT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    size_bytes BIGINT,
    license VARCHAR(100),
    usability FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-----------------------------------------------------
-- 관계 테이블
-----------------------------------------------------

-- 논문과 저자의 관계
CREATE TABLE IF NOT EXISTS article_authors (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES authors(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    author_position INTEGER,
    PRIMARY KEY (article_id, author_id)
);

-- 논문과 키워드의 관계
CREATE TABLE IF NOT EXISTS article_keywords (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    keyword_id INTEGER REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, keyword_id)
);

-- 논문과 MeSH 용어의 관계
CREATE TABLE IF NOT EXISTS article_mesh_terms (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    mesh_term_id INTEGER REFERENCES mesh_terms(id) ON DELETE CASCADE,
    is_major_topic BOOLEAN DEFAULT false,
    PRIMARY KEY (article_id, mesh_term_id)
);

-- 검색과 논문의 관계
CREATE TABLE IF NOT EXISTS search_articles (
    search_id INTEGER REFERENCES searches(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    relevance_score FLOAT,
    PRIMARY KEY (search_id, article_id)
);

-- 데이터셋과 태그의 관계
CREATE TABLE IF NOT EXISTS dataset_tags (
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (dataset_id, tag_id)
);

-- 검색과 데이터셋의 관계
CREATE TABLE IF NOT EXISTS search_datasets (
    search_id INTEGER REFERENCES searches(id) ON DELETE CASCADE,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
    relevance_score FLOAT,
    PRIMARY KEY (search_id, dataset_id)
);

-----------------------------------------------------
-- 추가 기능 테이블
-----------------------------------------------------

-- 파일 저장 테이블
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    filepath TEXT NOT NULL,
    file_type VARCHAR(50),
    size_bytes BIGINT,
    checksum VARCHAR(64),
    article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT file_relation_check CHECK (
        (article_id IS NOT NULL AND dataset_id IS NULL) OR
        (article_id IS NULL AND dataset_id IS NOT NULL)
    )
);

-- 사용자 북마크 테이블
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT bookmark_relation_check CHECK (
        (article_id IS NOT NULL AND dataset_id IS NULL) OR
        (article_id IS NULL AND dataset_id IS NOT NULL)
    )
);

-- 메타데이터 테이블 (유연한 추가 메타데이터 저장)
CREATE TABLE IF NOT EXISTS metadata (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    metadata_key VARCHAR(100) NOT NULL,
    metadata_value TEXT,
    UNIQUE (entity_type, entity_id, metadata_key)
);

-----------------------------------------------------
-- 인덱스
-----------------------------------------------------

-- 검색 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_articles_title ON articles USING gin (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_articles_abstract ON articles USING gin (to_tsvector('english', abstract));
CREATE INDEX IF NOT EXISTS idx_articles_pmid ON articles (pmid);
CREATE INDEX IF NOT EXISTS idx_articles_doi ON articles (doi);
CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles (pub_date);

CREATE INDEX IF NOT EXISTS idx_datasets_title ON datasets USING gin (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_datasets_description ON datasets USING gin (to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_datasets_external_id ON datasets (external_id);
CREATE INDEX IF NOT EXISTS idx_datasets_creator ON datasets (creator);

CREATE INDEX IF NOT EXISTS idx_searches_query ON searches USING gin (to_tsvector('english', query));
CREATE INDEX IF NOT EXISTS idx_searches_timestamp ON searches (timestamp);
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches (user_id);

CREATE INDEX IF NOT EXISTS idx_keywords_term ON keywords USING gin (to_tsvector('english', term));
CREATE INDEX IF NOT EXISTS idx_mesh_terms_term ON mesh_terms USING gin (to_tsvector('english', term));
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags USING gin (to_tsvector('english', name));

-----------------------------------------------------
-- 뷰
-----------------------------------------------------

-- 검색 결과 요약 뷰
CREATE OR REPLACE VIEW search_summary AS
SELECT 
    s.id AS search_id,
    s.query,
    s.timestamp,
    s.status,
    u.username,
    COUNT(DISTINCT sa.article_id) AS article_count,
    COUNT(DISTINCT sd.dataset_id) AS dataset_count,
    s.statistics
FROM searches s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN search_articles sa ON s.id = sa.search_id
LEFT JOIN search_datasets sd ON s.id = sd.search_id
GROUP BY s.id, s.query, s.timestamp, s.status, u.username, s.statistics;

-- 논문 상세 정보 뷰
CREATE OR REPLACE VIEW article_details AS
SELECT 
    a.id,
    a.pmid,
    a.title,
    a.abstract,
    a.pub_date,
    a.doi,
    a.url,
    a.citations,
    j.name AS journal_name,
    j.impact_factor,
    array_agg(DISTINCT concat(au.last_name, ', ', COALESCE(au.first_name, ''), ' ', COALESCE(au.initials, ''))) AS authors,
    array_agg(DISTINCT k.term) AS keywords,
    array_agg(DISTINCT mt.term) AS mesh_terms
FROM articles a
LEFT JOIN journals j ON a.journal_id = j.id
LEFT JOIN article_authors aa ON a.id = aa.article_id
LEFT JOIN authors au ON aa.author_id = au.id
LEFT JOIN article_keywords ak ON a.id = ak.article_id
LEFT JOIN keywords k ON ak.keyword_id = k.id
LEFT JOIN article_mesh_terms amt ON a.id = amt.article_id
LEFT JOIN mesh_terms mt ON amt.mesh_term_id = mt.id
GROUP BY a.id, a.pmid, a.title, a.abstract, a.pub_date, a.doi, a.url, a.citations, j.name, j.impact_factor;

-- 데이터셋 상세 정보 뷰
CREATE OR REPLACE VIEW dataset_details AS
SELECT 
    d.id,
    d.external_id,
    d.title,
    d.description,
    d.creator,
    d.url,
    d.last_updated,
    d.download_count,
    d.file_count,
    d.size_bytes,
    d.license,
    d.usability,
    array_agg(DISTINCT t.name) AS tags
FROM datasets d
LEFT JOIN dataset_tags dt ON d.id = dt.dataset_id
LEFT JOIN tags t ON dt.tag_id = t.id
GROUP BY d.id, d.external_id, d.title, d.description, d.creator, d.url, d.last_updated, d.download_count, d.file_count, d.size_bytes, d.license, d.usability;

-----------------------------------------------------
-- 함수 및 트리거
-----------------------------------------------------

-- 논문 추가/업데이트 함수
CREATE OR REPLACE FUNCTION upsert_article(
    _pmid VARCHAR(20),
    _title TEXT,
    _abstract TEXT,
    _journal_name VARCHAR(255),
    _pub_date DATE,
    _doi VARCHAR(100) DEFAULT NULL,
    _url TEXT DEFAULT NULL,
    _citations INTEGER DEFAULT 0,
    _full_text_available BOOLEAN DEFAULT false,
    _full_text TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    _journal_id INTEGER;
    _article_id INTEGER;
BEGIN
    -- 저널 ID 찾기 또는 생성
    IF _journal_name IS NOT NULL THEN
        SELECT id INTO _journal_id FROM journals WHERE name = _journal_name;
        IF _journal_id IS NULL THEN
            INSERT INTO journals (name) VALUES (_journal_name) RETURNING id INTO _journal_id;
        END IF;
    END IF;

    -- 논문 업서트
    INSERT INTO articles (
        pmid, title, abstract, journal_id, pub_date, doi, url, citations, full_text_available, full_text, updated_at
    ) VALUES (
        _pmid, _title, _abstract, _journal_id, _pub_date, _doi, _url, _citations, _full_text_available, _full_text, NOW()
    )
    ON CONFLICT (pmid) DO UPDATE SET
        title = _title,
        abstract = _abstract,
        journal_id = _journal_id,
        pub_date = _pub_date,
        doi = _doi,
        url = _url,
        citations = _citations,
        full_text_available = _full_text_available,
        full_text = COALESCE(_full_text, articles.full_text),
        updated_at = NOW()
    RETURNING id INTO _article_id;

    RETURN _article_id;
END;
$$ LANGUAGE plpgsql;

-- 키워드 카운트 업데이트 트리거
CREATE OR REPLACE FUNCTION update_keyword_frequency() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE keywords SET frequency = frequency + 1 WHERE id = NEW.keyword_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE keywords SET frequency = frequency - 1 WHERE id = OLD.keyword_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_article_keyword_change
AFTER INSERT OR DELETE ON article_keywords
FOR EACH ROW
EXECUTE FUNCTION update_keyword_frequency();

-- MeSH 용어 카운트 업데이트 트리거
CREATE OR REPLACE FUNCTION update_mesh_term_frequency() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE mesh_terms SET frequency = frequency + 1 WHERE id = NEW.mesh_term_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE mesh_terms SET frequency = frequency - 1 WHERE id = OLD.mesh_term_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_article_mesh_term_change
AFTER INSERT OR DELETE ON article_mesh_terms
FOR EACH ROW
EXECUTE FUNCTION update_mesh_term_frequency();

-- 태그 카운트 업데이트 트리거
CREATE OR REPLACE FUNCTION update_tag_frequency() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET frequency = frequency + 1 WHERE id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET frequency = frequency - 1 WHERE id = OLD.tag_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_dataset_tag_change
AFTER INSERT OR DELETE ON dataset_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_frequency();

-----------------------------------------------------
-- 역할 및 권한
-----------------------------------------------------

-- 역할 생성
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'medical_data_admin') THEN
        CREATE ROLE medical_data_admin;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'medical_data_researcher') THEN
        CREATE ROLE medical_data_researcher;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'medical_data_reader') THEN
        CREATE ROLE medical_data_reader;
    END IF;
END
$$;

-- 관리자 권한
GRANT ALL PRIVILEGES ON SCHEMA medical_data TO medical_data_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA medical_data TO medical_data_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA medical_data TO medical_data_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA medical_data TO medical_data_admin;

-- 연구자 권한
GRANT USAGE ON SCHEMA medical_data TO medical_data_researcher;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA medical_data TO medical_data_researcher;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA medical_data TO medical_data_researcher;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA medical_data TO medical_data_researcher;

-- 독자 권한
GRANT USAGE ON SCHEMA medical_data TO medical_data_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA medical_data TO medical_data_reader;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA medical_data TO medical_data_reader;

-- 테이블 권한 제한
REVOKE INSERT, UPDATE, DELETE ON TABLE users FROM medical_data_researcher;
REVOKE ALL ON TABLE users FROM medical_data_reader;
GRANT SELECT (id, username, email, role, active, created_at, last_login) ON TABLE users TO medical_data_reader; 