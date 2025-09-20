-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- sources table: APIから取得した生データの保存
-- ========================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('newsapi')),
  provider_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- Indexes for sources
CREATE INDEX idx_sources_provider ON sources(provider);
CREATE INDEX idx_sources_published_at ON sources(published_at DESC);
CREATE INDEX idx_sources_processed_at ON sources(processed_at);
CREATE INDEX idx_sources_created_at ON sources(created_at DESC);

-- ========================================
-- topics table: 選定された記事トピック
-- ========================================
CREATE TABLE IF NOT EXISTS topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  abstract TEXT,
  section TEXT,
  subsection TEXT,
  score DECIMAL(3,2) NOT NULL CHECK (score >= 0 AND score <= 1),
  status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (
    status IN ('NEW', 'QUEUED', 'REJECTED', 'OUTLINED', 'DRAFTED', 'VERIFIED', 'PUBLISHED')
  ),
  genre VARCHAR(50) NOT NULL CHECK (
    genre IN ('news', 'health', 'product', 'trend', 'glossary', 'technology', 'lifestyle', 'culture', 'business', 'science')
  ),
  canonical_key TEXT NOT NULL UNIQUE,
  related TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for topics
CREATE INDEX idx_topics_status ON topics(status);
CREATE INDEX idx_topics_genre ON topics(genre);
CREATE INDEX idx_topics_score ON topics(score DESC);
CREATE INDEX idx_topics_published_at ON topics(published_at DESC);
CREATE INDEX idx_topics_created_at ON topics(created_at DESC);

-- ========================================
-- articles table: 生成された記事
-- ========================================
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT[] NOT NULL,
  body_mdx TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  tags TEXT[] NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'VERIFIED', 'PUBLISHED')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Indexes for articles
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);

-- ========================================
-- topic_outlines table: AIが生成した記事構成
-- ========================================
CREATE TABLE IF NOT EXISTS topic_outlines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT[] NOT NULL,
  sections JSONB NOT NULL,
  tags TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for topic_outlines
CREATE INDEX idx_topic_outlines_topic_id ON topic_outlines(topic_id);

-- ========================================
-- article_issues table: 検証で発見された問題
-- ========================================
CREATE TABLE IF NOT EXISTS article_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  issues JSONB NOT NULL,
  suggestions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for article_issues
CREATE INDEX idx_article_issues_article_id ON article_issues(article_id);

-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================

-- Enable RLS on articles table
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Public read access for published articles
CREATE POLICY "Public articles are viewable by everyone"
  ON articles FOR SELECT
  USING (status = 'PUBLISHED');

-- Enable RLS on topics table
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Public read access for published topics
CREATE POLICY "Public topics are viewable by everyone"
  ON topics FOR SELECT
  USING (status = 'PUBLISHED');

-- ========================================
-- Triggers for updated_at
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for topics table
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for articles table
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Comments for documentation
-- ========================================

COMMENT ON TABLE sources IS 'APIから取得した生データを保存';
COMMENT ON TABLE topics IS '選定された記事トピック';
COMMENT ON TABLE articles IS '生成された記事データ';
COMMENT ON TABLE topic_outlines IS 'AIが生成した記事構成';
COMMENT ON TABLE article_issues IS '検証で発見された問題';

COMMENT ON COLUMN sources.provider IS 'データ提供元 (the news api)';
COMMENT ON COLUMN sources.provider_id IS '提供元での一意識別子';
COMMENT ON COLUMN topics.canonical_key IS '重複排除用の正規化キー';
COMMENT ON COLUMN topics.score IS '記事の品質スコア (0.00-1.00)';
COMMENT ON COLUMN articles.body_mdx IS 'MDX形式の記事本文';
COMMENT ON COLUMN articles.sources IS '出典情報のJSON配列';