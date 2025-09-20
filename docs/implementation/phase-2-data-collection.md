# Phase 2: データ収集パイプライン

## 概要
外部API（The Guardian、The New York Times）からデータを取得し、正規化してSupabaseに保存するパイプラインを構築します。
レート制限、エラーハンドリング、重複排除を考慮した堅牢な実装を行います。

## 前提条件
- Phase 1が完了していること
- APIキーが取得済みであること
  - Guardian API Key
  - NYT API Key

## 実装タスク

### 2.1 共通ユーティリティ

#### 2.1.1 HTTPクライアント（src/lib/http-client.ts）
```typescript
// 指数バックオフを実装したHTTPクライアント
export class HttpClient {
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1秒

  async fetch<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    const attempts = Array.from({ length: this.maxRetries + 1 }, (_, i) => i);
    
    const tryFetch = async (attemptNumber: number): Promise<T | { retry: true; error?: Error }> => {
      try {
        const response = await fetch(url, options);

        if (response.status === 429) {
          // レート制限
          return { retry: true };
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json() as T;
      } catch (error) {
        return { retry: true, error: error as Error };
      }
    };

    const results = await attempts.reduce(
      async (prevPromise, attempt) => {
        const prev = await prevPromise;
        if (prev.success) return prev;

        const result = await tryFetch(attempt);
        
        if ('retry' in result && attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          return { success: false, lastError: result.error };
        }
        
        if ('retry' in result) {
          return { success: false, lastError: result.error };
        }
        
        return { success: true, data: result };
      },
      Promise.resolve<{ success: boolean; data?: T; lastError?: Error }>({ success: false })
    );

    if (results.success && results.data) {
      return results.data;
    }
    
    throw results.lastError || new Error('Unknown error');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const httpClient = new HttpClient();
```

#### 2.1.2 日付ユーティリティ（src/lib/date-utils.ts）
```typescript
import { format, subDays } from 'date-fns';

// 日付範囲の生成
export const getDateRange = (daysBack: number = 1) => {
  const to = new Date();
  const from = subDays(to, daysBack);
  
  return {
    from: format(from, 'yyyy-MM-dd'),
    to: format(to, 'yyyy-MM-dd'),
    fromISO: from.toISOString(),
    toISO: to.toISOString(),
  };
};

// NYT用の日付フォーマット（YYYYMMDD）
export const formatNYTDate = (date: Date): string => 
  format(date, 'yyyyMMdd');
```

### 2.2 Guardian API連携

#### 2.2.1 APIクライアント（src/lib/api/guardian-client.ts）
```typescript
import { httpClient } from '../http-client';
import { normalizeGuardianResponse } from '../../domain/guardian';
import type { SourceItem } from '../../domain/types';

export class GuardianClient {
  private readonly baseUrl = 'https://content.guardianapis.com';
  private readonly apiKey = process.env.GUARDIAN_API_KEY!;
  private readonly pageSize = 50; // 最適なページサイズ

  async fetchRecent(
    fromDate: string,
    toDate: string,
    sections?: string[]
  ): Promise<readonly SourceItem[]> {
    const fetchPage = async (page: number): Promise<{ items: SourceItem[]; totalPages: number }> => {
      const params = new URLSearchParams({
        'api-key': this.apiKey,
        'from-date': fromDate,
        'to-date': toDate,
        'order-by': 'newest',
        'page': page.toString(),
        'page-size': this.pageSize.toString(),
        'show-fields': 'headline,trailText,byline,thumbnail,wordcount,shortUrl,lastModified',
        'show-tags': 'keyword,contributor,series,publication',
      });

      if (sections?.length) {
        params.append('section', sections.join(','));
      }

      const url = `${this.baseUrl}/search?${params}`;
      const response = await httpClient.fetch<any>(url);
      
      return {
        items: normalizeGuardianResponse(response),
        totalPages: response.response.pages || 1
      };
    };

    // 最初のページを取得して総ページ数を確認
    const firstPage = await fetchPage(1);
    const pagesToFetch = Math.min(firstPage.totalPages, 10);
    
    if (pagesToFetch === 1) {
      return firstPage.items;
    }

    // 残りのページを並列で取得（レート制限を考慮して順次実行）
    const remainingPages = Array.from({ length: pagesToFetch - 1 }, (_, i) => i + 2);
    
    const remainingResults = await remainingPages.reduce(
      async (prevPromise, page) => {
        const prev = await prevPromise;
        await this.sleep(1000); // レート制限対策
        const result = await fetchPage(page);
        return [...prev, ...result.items];
      },
      Promise.resolve<SourceItem[]>([])
    );

    return [...firstPage.items, ...remainingResults];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 2.2.2 取得スクリプト（scripts/fetch_guardian.ts）
```typescript
import { GuardianClient } from '../src/lib/api/guardian-client';
import { supabaseAdmin } from '../src/lib/supabase';
import { getDateRange } from '../src/lib/date-utils';
import type { SourceItem } from '../src/domain/types';

const SECTIONS = [
  'world',
  'technology',
  'business',
  'science',
  'environment',
  'culture',
  'lifestyle',
  'sport',
];

const fetchGuardianArticles = async () => {
  console.log('Guardian記事の取得を開始...');
  
  const client = new GuardianClient();
  const { from, to } = getDateRange(1); // 過去1日分
  
  try {
    // セクションごとに取得
    const items = await client.fetchRecent(from, to, SECTIONS);
    console.log(`${items.length}件の記事を取得しました`);

    // Supabaseに保存
    const saved = await saveToSupabase(items);
    console.log(`${saved}件の新規記事を保存しました`);
    
  } catch (error) {
    console.error('取得エラー:', error);
    process.exit(1);
  }
};

const saveToSupabase = async (
  items: readonly SourceItem[]
): Promise<number> => {
  const results = await Promise.all(
    items.map(async (item) => {
      const { error } = await supabaseAdmin
        .from('sources')
        .upsert({
          provider: item.provider,
          provider_id: item.providerId,
          url: item.url,
          title: item.title,
          abstract: item.abstract,
          published_at: item.publishedAt,
          raw_data: item,
        }, {
          onConflict: 'provider,provider_id',
        });

      if (!error) {
        return { saved: true };
      } else if (error.code !== '23505') { // 重複エラー以外
        console.error('保存エラー:', error);
        return { saved: false };
      }
      return { saved: false };
    })
  );

  return results.filter(r => r.saved).length;
};

// 実行
fetchGuardianArticles();
```

### 2.3 NYT API連携

#### 2.3.1 APIクライアント（src/lib/api/nyt-client.ts）
```typescript
import { httpClient } from '../http-client';
import { normalizeNYTResponse } from '../../domain/nyt';
import { formatNYTDate } from '../date-utils';
import type { SourceItem } from '../../domain/types';

export class NYTClient {
  private readonly baseUrl = 'https://api.nytimes.com/svc';
  private readonly apiKey = process.env.NYT_API_KEY!;

  async fetchArticleSearch(
    beginDate: Date,
    endDate: Date,
    newsDesks?: string[]
  ): Promise<readonly SourceItem[]> {
    const maxPages = 10; // APIの制限
    
    const fetchPage = async (page: number): Promise<SourceItem[]> => {
      const params = new URLSearchParams({
        'api-key': this.apiKey,
        'begin_date': formatNYTDate(beginDate),
        'end_date': formatNYTDate(endDate),
        'sort': 'newest',
        'page': page.toString(),
      });

      if (newsDesks?.length) {
        const fq = `news_desk:(${newsDesks.map(d => `"${d}"`).join(' ')})`;
        params.append('fq', fq);
      }

      const url = `${this.baseUrl}/search/v2/articlesearch.json?${params}`;
      const response = await httpClient.fetch<any>(url);
      
      return normalizeNYTResponse(response);
    };

    // 再帰的にページを取得（空の結果が返るまで）
    const fetchAllPages = async (page: number, accumulated: SourceItem[]): Promise<SourceItem[]> => {
      if (page >= maxPages) return accumulated;
      
      const items = await fetchPage(page);
      if (items.length === 0) return accumulated;
      
      // レート制限対策（NYTは厳しい）
      await this.sleep(2000);
      
      return fetchAllPages(page + 1, [...accumulated, ...items]);
    };

    return fetchAllPages(0, []);
  }

  async fetchTopStories(section: string = 'home'): Promise<readonly SourceItem[]> {
    const url = `${this.baseUrl}/topstories/v2/${section}.json?api-key=${this.apiKey}`;
    const response = await httpClient.fetch<any>(url);
    
    // Top Stories用の正規化が必要（別形式のレスポンス）
    return this.normalizeTopStories(response);
  }

  private normalizeTopStories(response: any): readonly SourceItem[] {
    return response.results.map((item: any) => ({
      provider: 'nyt' as const,
      providerId: item.uri,
      url: item.url,
      title: item.title,
      abstract: item.abstract,
      publishedAt: item.published_date,
      section: item.section,
      subsection: item.subsection,
      byline: item.byline,
      type: item.item_type,
      sourceName: 'The New York Times' as const,
      image: item.multimedia?.[0] ? {
        url: item.multimedia[0].url,
        caption: item.multimedia[0].caption,
        credit: item.multimedia[0].copyright,
      } : undefined,
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 2.3.2 取得スクリプト（scripts/fetch_nyt.ts）
```typescript
import { NYTClient } from '../src/lib/api/nyt-client';
import { supabaseAdmin } from '../src/lib/supabase';
import { subDays } from 'date-fns';
import type { SourceItem } from '../src/domain/types';

const NEWS_DESKS = [
  'Business',
  'Technology',
  'Science',
  'Health',
  'World',
  'Culture',
  'Sports',
];

const TOP_STORY_SECTIONS = [
  'home',
  'world',
  'technology',
  'business',
  'health',
  'science',
];

const fetchNYTArticles = async () => {
  console.log('NYT記事の取得を開始...');
  
  const client = new NYTClient();
  const endDate = new Date();
  const beginDate = subDays(endDate, 1);
  
  try {
    // Article Searchから取得
    const searchItems = await client.fetchArticleSearch(
      beginDate,
      endDate,
      NEWS_DESKS
    );
    console.log(`Article Search: ${searchItems.length}件`);

    // Top Storiesから取得（レート制限を考慮して順次実行）
    const topStories = await TOP_STORY_SECTIONS.reduce(
      async (prevPromise, section) => {
        const prev = await prevPromise;
        const items = await client.fetchTopStories(section);
        await sleep(1000); // レート制限対策
        return [...prev, ...items];
      },
      Promise.resolve<SourceItem[]>([])
    );
    console.log(`Top Stories: ${topStories.length}件`);

    // 統合して保存
    const allItems = [...searchItems, ...topStories];
    const saved = await saveToSupabase(allItems);
    console.log(`${saved}件の新規記事を保存しました`);
    
  } catch (error) {
    console.error('取得エラー:', error);
    process.exit(1);
  }
};

const saveToSupabase = async (
  items: readonly SourceItem[]
): Promise<number> => {
  const results = await Promise.all(
    items.map(async (item) => {
      const { error } = await supabaseAdmin
        .from('sources')
        .upsert({
          provider: item.provider,
          provider_id: item.providerId,
          url: item.url,
          title: item.title,
          abstract: item.abstract,
          published_at: item.publishedAt,
          raw_data: item,
        }, {
          onConflict: 'provider,provider_id',
        });

      if (!error) {
        return { saved: true };
      } else if (error.code !== '23505') {
        console.error('保存エラー:', error);
        return { saved: false };
      }
      return { saved: false };
    })
  );

  return results.filter(r => r.saved).length;
};

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// 実行
fetchNYTArticles();
```

### 2.4 重複排除とスコアリング

#### 2.4.1 トピック選定スクリプト（scripts/rank_topics.ts）
```typescript
import { supabaseAdmin } from '../src/lib/supabase';
import type { SourceItem, Topic, Genre } from '../src/domain/types';
import crypto from 'crypto';

// ジャンル判定
const detectGenre = (item: SourceItem): Genre => {
  const { section, tags, title, abstract } = item;
  const text = `${title} ${abstract} ${section} ${tags?.join(' ')}`.toLowerCase();

  if (text.includes('health') || text.includes('medical')) return 'health';
  if (text.includes('technology') || text.includes('ai') || text.includes('software')) return 'technology';
  if (text.includes('lifestyle') || text.includes('wellness')) return 'lifestyle';
  if (text.includes('culture') || text.includes('art')) return 'culture';
  if (text.includes('business') || text.includes('economy')) return 'business';
  if (text.includes('science') || text.includes('research')) return 'science';
  
  return 'news';
};

// スコア計算
const calculateScore = (item: SourceItem): number => {
  let score = 0.5; // 基準スコア

  // 語数による加点
  if (item.wordCount) {
    if (item.wordCount >= 500 && item.wordCount <= 2000) {
      score += 0.2; // 適切な長さ
    }
  }

  // 画像がある場合は加点
  if (item.image) {
    score += 0.1;
  }

  // 要約がある場合は加点
  if (item.abstract && item.abstract.length > 50) {
    score += 0.1;
  }

  // 最新性（24時間以内）
  const publishedDate = new Date(item.publishedAt);
  const hoursAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 24) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
};

// 正規化キーの生成
const generateCanonicalKey = (item: SourceItem): string => {
  const normalizedTitle = item.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 50);
  
  const host = new URL(item.url).hostname;
  return `${host}:${normalizedTitle}`;
};

const rankTopics = async () => {
  console.log('トピックの選定を開始...');

  // 未処理のソースを取得
  const { data: sources, error } = await supabaseAdmin
    .from('sources')
    .select('*')
    .is('processed_at', null)
    .order('published_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('ソース取得エラー:', error);
    return;
  }

  console.log(`${sources.length}件のソースを処理中...`);

  const processedKeys = new Set<string>();
  
  const topics = await sources.reduce(
    async (prevPromise, source) => {
      const prev = await prevPromise;
      const item = source.raw_data as SourceItem;
      const canonicalKey = generateCanonicalKey(item);

      // 重複チェック
      if (processedKeys.has(canonicalKey)) {
        return prev;
      }
      processedKeys.add(canonicalKey);

      // 既存チェック
      const { data: existing } = await supabaseAdmin
        .from('topics')
        .select('id')
        .eq('canonical_key', canonicalKey)
        .single();

      if (existing) {
        return prev;
      }

      // トピック作成
      const topic = {
        source_id: source.id,
        title: item.title,
        url: item.url,
        published_at: item.publishedAt,
        abstract: item.abstract,
        section: item.section,
        score: calculateScore(item),
        status: 'NEW',
        genre: detectGenre(item),
        canonical_key: canonicalKey,
      };

      return [...prev, topic];
    },
    Promise.resolve<Partial<Topic>[]>([])
  );

  // トピックを保存
  if (topics.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('topics')
      .insert(topics);

    if (insertError) {
      console.error('トピック保存エラー:', insertError);
    } else {
      console.log(`${topics.length}件のトピックを保存しました`);
    }
  }

  // ソースを処理済みに更新
  const sourceIds = sources.map(s => s.id);
  await supabaseAdmin
    .from('sources')
    .update({ processed_at: new Date().toISOString() })
    .in('id', sourceIds);

  console.log('トピック選定が完了しました');
};

// 実行
rankTopics();
```

## テストとバリデーション

### 2.5.1 API接続テスト
```bash
# Guardian API テスト
GUARDIAN_API_KEY=your_key tsx scripts/test-guardian-api.ts

# NYT API テスト
NYT_API_KEY=your_key tsx scripts/test-nyt-api.ts
```

### 2.5.2 データ整合性チェック
```typescript
// scripts/validate-data.ts
const validateData = async () => {
  // 重複チェック
  const { data: duplicates } = await supabaseAdmin
    .from('topics')
    .select('canonical_key, count')
    .groupBy('canonical_key')
    .having('count', 'gt', 1);

  if (duplicates?.length) {
    console.warn('重複トピック:', duplicates);
  }

  // データ品質チェック
  const { data: lowQuality } = await supabaseAdmin
    .from('topics')
    .select('*')
    .lt('score', 0.3);

  console.log(`低品質トピック: ${lowQuality?.length || 0}件`);
};
```

## 完了基準
- [ ] Guardian APIクライアントが実装され、データ取得が可能
- [ ] NYT APIクライアントが実装され、データ取得が可能
- [ ] レート制限と再試行ロジックが実装されている
- [ ] 取得したデータがSupabaseに正しく保存される
- [ ] 重複排除が正しく機能している
- [ ] スコアリングロジックが実装されている
- [ ] エラーハンドリングが適切に実装されている

## 運用上の注意
- APIキーは環境変数で管理
- レート制限を必ず守る（Guardian: 1req/sec、NYT: 5req/min）
- 日次クォータに注意（Guardian: 500/day、NYT: 500/day）
- エラーログを監視し、異常を早期発見

## 次のフェーズへの準備
Phase 2が完了すると、以下が利用可能になります：
- 外部APIからの定期的なデータ取得
- 正規化されたデータのSupabase保存
- スコアリング済みのトピックリスト

これらを基に、Phase 3でAI処理パイプラインを構築します。