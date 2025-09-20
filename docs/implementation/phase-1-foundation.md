# Phase 1: 基盤構築

## 概要
プロジェクトの土台となるデータモデル、型定義、インフラストラクチャを整備します。
このフェーズは他のすべてのフェーズの基礎となるため、型安全性と拡張性を重視した設計を行います。

## 実装タスク

### 1.1 Supabaseセットアップ

#### 1.1.1 プロジェクト作成と環境変数設定
```bash
# .env.local に以下を追加
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### 1.1.2 テーブル設計
```sql
-- sources: APIから取得した生データの保存
CREATE TABLE sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider VARCHAR(50) NOT NULL, -- 'guardian' | 'nyt'
  provider_id TEXT NOT NULL, -- 供給元の安定識別子
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL, -- 元のAPIレスポンス
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- topics: 選定された記事トピック
CREATE TABLE topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES sources(id),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  abstract TEXT,
  section TEXT,
  score DECIMAL(3,2) NOT NULL, -- 0.00-1.00
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  genre VARCHAR(50) NOT NULL,
  canonical_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- articles: 生成された記事
CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  topic_id UUID REFERENCES topics(id),
  title TEXT NOT NULL,
  summary TEXT[] NOT NULL, -- 要点の配列
  body_mdx TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  tags TEXT[] NOT NULL,
  sources JSONB NOT NULL, -- [{name, url, date}]
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX idx_sources_provider ON sources(provider);
CREATE INDEX idx_sources_published_at ON sources(published_at DESC);
CREATE INDEX idx_topics_status ON topics(status);
CREATE INDEX idx_topics_genre ON topics(genre);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_category ON articles(category);
```

#### 1.1.3 Row Level Security (RLS) 設定
```sql
-- 読み取り専用のpublicアクセス
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public articles are viewable by everyone"
  ON articles FOR SELECT
  USING (status = 'PUBLISHED');
```

### 1.2 ドメイン層の実装

#### 1.2.1 ディレクトリ構造
```
src/
└── domain/
    ├── types.ts        # 正規化型定義
    ├── guardian.ts     # Guardian APIアダプタ
    ├── nyt.ts         # NYT APIアダプタ
    └── index.ts       # エクスポート管理
```

#### 1.2.2 型定義（src/domain/types.ts）
```typescript
// プロバイダー定義
export type Provider = 'guardian' | 'nyt' as const;

// APIから取得した生データの正規化型
export type SourceItem = {
  readonly provider: Provider;
  readonly providerId: string;
  readonly url: string;
  readonly title: string;
  readonly abstract?: string;
  readonly publishedAt: string; // ISO8601
  readonly section?: string;
  readonly subsection?: string;
  readonly byline?: string;
  readonly tags?: readonly string[];
  readonly type?: string;
  readonly wordCount?: number;
  readonly image?: {
    readonly url: string;
    readonly caption?: string;
    readonly credit?: string;
  };
  readonly sourceName: 'The Guardian' | 'The New York Times';
};

// 選定されたトピック
export type Topic = {
  readonly id: string;
  readonly source: Provider;
  readonly title: string;
  readonly url: string;
  readonly publishedAt: string;
  readonly abstract?: string;
  readonly section?: string;
  readonly score: number;
  readonly status: TopicStatus;
  readonly genre: Genre;
  readonly canonicalKey: string;
  readonly related?: readonly string[];
};

export type TopicStatus = 
  | 'NEW'
  | 'QUEUED'
  | 'REJECTED'
  | 'OUTLINED'
  | 'DRAFTED'
  | 'VERIFIED'
  | 'PUBLISHED';

export type Genre = 
  | 'news'
  | 'health'
  | 'product'
  | 'trend'
  | 'glossary'
  | 'technology'
  | 'lifestyle'
  | 'culture'
  | 'business'
  | 'science';

// 生成された記事
export type Article = {
  readonly id: string;
  readonly slug: string;
  readonly topicId: string;
  readonly title: string;
  readonly summary: readonly string[];
  readonly bodyMdx: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly sources: readonly ArticleSource[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publishedAt?: string;
  readonly status: ArticleStatus;
};

export type ArticleSource = {
  readonly name: string;
  readonly url: string;
  readonly date?: string;
};

export type ArticleStatus = 'DRAFT' | 'VERIFIED' | 'PUBLISHED';
```

#### 1.2.3 Guardian APIアダプタ（src/domain/guardian.ts）
```typescript
import type { SourceItem } from './types';

// Guardian API レスポンス型
type GuardianApiResponse = {
  response: {
    status: string;
    results: GuardianArticle[];
    // ... その他のフィールド
  };
};

type GuardianArticle = {
  id: string;
  type: string;
  sectionId: string;
  sectionName: string;
  webPublicationDate: string;
  webTitle: string;
  webUrl: string;
  fields?: {
    headline?: string;
    trailText?: string;
    byline?: string;
    thumbnail?: string;
    wordcount?: string;
  };
  tags?: Array<{
    id: string;
    type: string;
    webTitle: string;
  }>;
};

// 正規化関数
export const normalizeGuardianItem = (item: GuardianArticle): SourceItem => ({
  provider: 'guardian',
  providerId: item.id,
  url: item.webUrl,
  title: item.fields?.headline || item.webTitle,
  abstract: item.fields?.trailText,
  publishedAt: item.webPublicationDate,
  section: item.sectionName,
  byline: item.fields?.byline,
  tags: item.tags?.map(tag => tag.webTitle),
  type: item.type,
  wordCount: item.fields?.wordcount ? parseInt(item.fields.wordcount, 10) : undefined,
  image: item.fields?.thumbnail ? {
    url: item.fields.thumbnail,
  } : undefined,
  sourceName: 'The Guardian',
});

// バッチ正規化
export const normalizeGuardianResponse = (
  response: GuardianApiResponse
): readonly SourceItem[] => 
  response.response.results.map(normalizeGuardianItem);
```

#### 1.2.4 NYT APIアダプタ（src/domain/nyt.ts）
```typescript
import type { SourceItem } from './types';

// NYT API レスポンス型
type NYTArticleSearchResponse = {
  status: string;
  response: {
    docs: NYTArticle[];
    meta: {
      hits: number;
    };
  };
};

type NYTArticle = {
  web_url: string;
  uri: string;
  pub_date: string;
  headline: {
    main: string;
  };
  abstract: string;
  byline?: {
    original?: string;
  };
  section_name?: string;
  subsection_name?: string;
  type_of_material?: string;
  word_count?: number;
  multimedia?: Array<{
    url: string;
    caption?: string;
    credit?: string;
  }>;
};

// 正規化関数
export const normalizeNYTItem = (item: NYTArticle): SourceItem => {
  const mainImage = item.multimedia?.[0];
  
  return {
    provider: 'nyt',
    providerId: item.uri,
    url: item.web_url,
    title: item.headline.main,
    abstract: item.abstract,
    publishedAt: item.pub_date,
    section: item.section_name,
    subsection: item.subsection_name,
    byline: item.byline?.original,
    type: item.type_of_material,
    wordCount: item.word_count,
    image: mainImage ? {
      url: mainImage.url.startsWith('http') 
        ? mainImage.url 
        : `https://www.nytimes.com/${mainImage.url}`,
      caption: mainImage.caption,
      credit: mainImage.credit,
    } : undefined,
    sourceName: 'The New York Times',
  };
};

// バッチ正規化
export const normalizeNYTResponse = (
  response: NYTArticleSearchResponse
): readonly SourceItem[] => 
  response.response.docs.map(normalizeNYTItem);
```

### 1.3 Supabase Client設定

#### 1.3.1 クライアント初期化（src/lib/supabase.ts）
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// サーバーサイド用（サービスロールキー使用）
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

### 1.4 テストとバリデーション

#### 1.4.1 型のテスト
```typescript
// src/domain/__tests__/guardian.test.ts
import { normalizeGuardianItem } from '../guardian';

describe('Guardian正規化', () => {
  it('記事を正しく正規化する', () => {
    const input = {
      // モックデータ
    };
    const result = normalizeGuardianItem(input);
    expect(result.provider).toBe('guardian');
    // その他のアサーション
  });
});
```

#### 1.4.2 Supabase接続テスト
```typescript
// scripts/test-supabase.ts
import { supabase } from '../src/lib/supabase';

const testConnection = async () => {
  const { data, error } = await supabase
    .from('sources')
    .select('count');
  
  if (error) {
    console.error('接続エラー:', error);
  } else {
    console.log('接続成功:', data);
  }
};

testConnection();
```

## 完了基準
- [ ] Supabaseプロジェクトが作成され、環境変数が設定されている
- [ ] すべてのテーブルが作成され、インデックスが設定されている
- [ ] RLSポリシーが適切に設定されている
- [ ] ドメイン層の型定義が完成している
- [ ] Guardian/NYTアダプタが実装され、正規化が機能している
- [ ] Supabaseクライアントが正しく初期化されている
- [ ] 基本的なテストが通過している

## 次のフェーズへの準備
Phase 1が完了したら、以下が利用可能になります：
- 型安全なデータモデル
- APIレスポンスの正規化機能
- Supabaseへのデータ保存基盤

これらを基に、Phase 2でデータ収集パイプラインを構築します。