# Phase 4: 公開システム

## 概要
検証済みの記事を公開し、フロントエンドと連携させます。
Next.js App RouterのISR（Incremental Static Regeneration）を活用し、
パフォーマンスとリアルタイム性を両立させます。

## 前提条件
- Phase 3が完了していること
- 検証済み記事がSupabaseに保存されていること
- フロントエンドの基本実装が完了していること

## 実装タスク

### 4.1 記事公開フロー

#### 4.1.1 公開処理スクリプト（scripts/publish_local.ts）
```typescript
import { supabaseAdmin } from '../src/lib/supabase';
import { revalidatePath } from 'next/cache';

const publishArticles = async () => {
  console.log('記事の公開処理を開始...');
  
  // 検証済み記事を取得
  const { data: articles, error } = await supabaseAdmin
    .from('articles')
    .select('*')
    .eq('status', 'VERIFIED')
    .order('created_at', { ascending: true })
    .limit(5); // 一度に公開する記事数を制限

  if (error || !articles?.length) {
    console.log('公開対象の記事がありません');
    return;
  }

  const publishedArticles: string[] = [];

  for (const article of articles) {
    try {
      // 公開処理
      const { error: updateError } = await supabaseAdmin
        .from('articles')
        .update({
          status: 'PUBLISHED',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', article.id);

      if (updateError) {
        console.error(`公開エラー (${article.title}):`, updateError);
        continue;
      }

      // 関連トピックも更新
      await supabaseAdmin
        .from('topics')
        .update({ status: 'PUBLISHED' })
        .eq('id', article.topic_id);

      publishedArticles.push(article.slug);
      console.log(`公開完了: ${article.title}`);
      
    } catch (error) {
      console.error(`公開処理エラー (${article.title}):`, error);
    }
  }

  // ISR再検証をトリガー
  if (publishedArticles.length > 0) {
    await triggerRevalidation(publishedArticles);
  }

  console.log(`${publishedArticles.length}件の記事を公開しました`);
};

const triggerRevalidation = async (slugs: string[]) => {
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  
  try {
    // ホームページの再検証
    await fetch(`${siteUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        paths: [
          '/',
          ...slugs.map(slug => `/news/${slug}`)
        ]
      }),
    });
    
    console.log('キャッシュの再検証を実行しました');
  } catch (error) {
    console.error('再検証エラー:', error);
  }
};

// 実行
publishArticles();
```

### 4.2 APIルートの実装

#### 4.2.1 記事取得API（src/app/api/articles/route.ts）
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 12;
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('status', 'PUBLISHED')
      .order('published_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: articles, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      articles,
      totalCount: count,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 4.2.2 単一記事取得API（src/app/api/articles/[slug]/route.ts）
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { data: article, error } = await supabase
      .from('articles')
      .select(`
        *,
        topics (
          title as original_title,
          url as original_url,
          published_at as original_published_at
        )
      `)
      .eq('slug', params.slug)
      .eq('status', 'PUBLISHED')
      .single();

    if (error || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // 関連記事を取得
    const { data: related } = await supabase
      .from('articles')
      .select('slug, title, summary, category')
      .eq('status', 'PUBLISHED')
      .neq('id', article.id)
      .contains('tags', article.tags.slice(0, 3))
      .limit(5);

    return NextResponse.json({
      article,
      related: related || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 4.2.3 再検証API（src/app/api/revalidate/route.ts）
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paths, tags } = body;

    // パスベースの再検証
    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        revalidatePath(path);
      }
    }

    // タグベースの再検証
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        revalidateTag(tag);
      }
    }

    // デフォルトでホームページを再検証
    revalidatePath('/');

    return NextResponse.json({
      revalidated: true,
      paths: paths || [],
      tags: tags || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}
```

### 4.3 フロントエンド統合

#### 4.3.1 記事一覧ページの更新（src/app/page.tsx）
```typescript
import { supabase } from '@/lib/supabase';
import { ArticleCard } from '@/components/article-card';
import { ArticleTag } from '@/components/ArticleTag';

// ISRの設定
export const revalidate = 300; // 5分ごとに再生成

async function getArticles(category?: string) {
  const query = supabase
    .from('articles')
    .select('*')
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false });

  if (category) {
    query.eq('category', category);
  }

  const { data: articles } = await query.limit(12);
  return articles || [];
}

async function getCategories() {
  const { data } = await supabase
    .from('articles')
    .select('category')
    .eq('status', 'PUBLISHED');

  const categories = new Set(data?.map(d => d.category) || []);
  return Array.from(categories);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const articles = await getArticles(searchParams.category);
  const categories = await getCategories();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* カテゴリーフィルター */}
      <div className="flex flex-wrap gap-2 mb-8">
        <ArticleTag
          name="すべて"
          href="/"
          isActive={!searchParams.category}
        />
        {categories.map(category => (
          <ArticleTag
            key={category}
            name={category}
            href={`/?category=${category}`}
            isActive={searchParams.category === category}
          />
        ))}
      </div>

      {/* 記事グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map(article => (
          <ArticleCard
            key={article.id}
            slug={article.slug}
            title={article.title}
            summary={article.summary}
            category={article.category}
            tags={article.tags}
            publishedAt={article.published_at}
            imageUrl={article.image_url}
          />
        ))}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">記事がまだありません</p>
        </div>
      )}
    </div>
  );
}
```

#### 4.3.2 記事詳細ページの更新（src/app/news/[slug]/page.tsx）
```typescript
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MarkdownContent } from '@/components/markdown-content';
import { ArticleSourceInfo } from '@/components/article-source-info';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// 動的ルートのISR設定
export const dynamicParams = true;
export const revalidate = 3600; // 1時間ごとに再生成

async function getArticle(slug: string) {
  const { data: article } = await supabase
    .from('articles')
    .select(`
      *,
      topics (
        title as original_title,
        url as original_url,
        published_at as original_published_at,
        source
      )
    `)
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .single();

  return article;
}

async function getRelatedArticles(article: any) {
  const { data: related } = await supabase
    .from('articles')
    .select('slug, title, summary, category')
    .eq('status', 'PUBLISHED')
    .neq('id', article.id)
    .contains('tags', article.tags.slice(0, 3))
    .limit(5);

  return related || [];
}

export async function generateStaticParams() {
  // ビルド時に生成するページのパラメータ
  const { data: articles } = await supabase
    .from('articles')
    .select('slug')
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false })
    .limit(50); // 最新50記事を事前生成

  return articles?.map(article => ({
    slug: article.slug,
  })) || [];
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(article);
  const topic = article.topics;

  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      {/* ヘッダー */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
        
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <time dateTime={article.published_at}>
            {format(new Date(article.published_at), 'yyyy年MM月dd日', { locale: ja })}
          </time>
          <span>•</span>
          <span>{article.category}</span>
        </div>

        {/* 出典情報 */}
        {topic && (
          <ArticleSourceInfo
            title={topic.original_title}
            url={topic.original_url}
            date={topic.original_published_at}
            provider={topic.source === 'guardian' ? 'The Guardian' : 'The New York Times'}
          />
        )}

        {/* 要点 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
          <h2 className="font-semibold mb-2">この記事のポイント</h2>
          <ul className="list-disc list-inside space-y-1">
            {article.summary.map((point: string, index: number) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      </header>

      {/* 本文 */}
      <div className="prose prose-lg max-w-none">
        <MarkdownContent content={article.body_mdx} />
      </div>

      {/* 関連記事 */}
      {relatedArticles.length > 0 && (
        <section className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-4">関連記事</h2>
          <div className="space-y-4">
            {relatedArticles.map(related => (
              <a
                key={related.slug}
                href={`/news/${related.slug}`}
                className="block hover:bg-gray-50 dark:hover:bg-gray-800 p-4 rounded-lg transition"
              >
                <h3 className="font-semibold">{related.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {related.summary[0]}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
```

### 4.4 キャッシュ戦略

#### 4.4.1 Next.js設定（next.config.ts）
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ISR設定
  experimental: {
    incrementalCacheHandlerPath: process.env.NODE_ENV === 'production'
      ? require.resolve('./cache-handler.js')
      : undefined,
  },
  
  // 画像最適化
  images: {
    domains: [
      'media.guim.co.uk',
      'static01.nyt.com',
      'www.nytimes.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // ヘッダー設定
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

#### 4.4.2 Supabaseキャッシュ（src/lib/supabase-cached.ts）
```typescript
import { unstable_cache } from 'next/cache';
import { supabase } from './supabase';

// キャッシュ付き記事取得
export const getCachedArticles = unstable_cache(
  async (category?: string, limit: number = 12) => {
    const query = supabase
      .from('articles')
      .select('*')
      .eq('status', 'PUBLISHED')
      .order('published_at', { ascending: false });

    if (category) {
      query.eq('category', category);
    }

    const { data } = await query.limit(limit);
    return data || [];
  },
  ['articles'],
  {
    revalidate: 300, // 5分
    tags: ['articles'],
  }
);

// キャッシュ付き単一記事取得
export const getCachedArticle = unstable_cache(
  async (slug: string) => {
    const { data } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'PUBLISHED')
      .single();

    return data;
  },
  ['article'],
  {
    revalidate: 3600, // 1時間
    tags: ['article'],
  }
);
```

### 4.5 SEOとOGP対応

#### 4.5.1 メタデータ生成（src/app/news/[slug]/page.tsx に追加）
```typescript
import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticle(params.slug);

  if (!article) {
    return {
      title: '記事が見つかりません',
    };
  }

  const description = article.summary.join(' ');
  const imageUrl = article.image_url || '/default-og-image.png';

  return {
    title: `${article.title} | World News Reader`,
    description: description.substring(0, 160),
    openGraph: {
      title: article.title,
      description: description.substring(0, 160),
      type: 'article',
      publishedTime: article.published_at,
      authors: ['World News Reader'],
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: description.substring(0, 160),
      images: [imageUrl],
    },
  };
}
```

## テストとバリデーション

### 4.6.1 公開フローテスト
```typescript
// scripts/test-publishing.ts
const testPublishing = async () => {
  // テスト記事を作成
  const testArticle = {
    slug: 'test-article-' + Date.now(),
    title: 'テスト記事',
    summary: ['テスト要点1', 'テスト要点2'],
    body_mdx: '# テスト記事\n\nこれはテスト記事です。',
    category: 'test',
    tags: ['test'],
    sources: [{ name: 'Test Source', url: 'https://example.com' }],
    status: 'VERIFIED',
  };

  // 記事を保存
  const { data, error } = await supabaseAdmin
    .from('articles')
    .insert(testArticle)
    .select()
    .single();

  if (error) {
    console.error('テスト記事の作成に失敗:', error);
    return;
  }

  // 公開処理を実行
  await publishArticles();

  // 公開確認
  const { data: published } = await supabaseAdmin
    .from('articles')
    .select('status')
    .eq('id', data.id)
    .single();

  assert(published.status === 'PUBLISHED', '記事が公開されていません');
  console.log('公開フローテスト: 成功');
};
```

### 4.6.2 パフォーマンステスト
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun --config=lighthouserc.js

# ビルド時間測定
time npm run build

# ページロード時間測定
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000"
```

## 完了基準
- [ ] 記事公開スクリプトが正常に動作する
- [ ] APIルートが実装され、記事データを提供できる
- [ ] フロントエンドがSupabaseから記事を取得できる
- [ ] ISRが正しく設定され、キャッシュが機能している
- [ ] SEOメタデータとOGPが適切に生成される
- [ ] パフォーマンスが要件を満たしている（LCP < 2.5s）
- [ ] エラーハンドリングが適切に実装されている

## 運用上の注意
- ISRの再検証間隔を適切に設定（コストとリアルタイム性のバランス）
- Supabaseの接続数制限に注意
- CDNキャッシュの活用（Vercel Edge Network）
- 画像最適化の設定
- データベースクエリの最適化（N+1問題の回避）

## 次のフェーズへの準備
Phase 4が完了すると、以下が利用可能になります：
- 記事の自動公開システム
- フロントエンドとの完全な統合
- 最適化されたキャッシュシステム

これらを基に、Phase 5で自動化と運用体制を構築します。