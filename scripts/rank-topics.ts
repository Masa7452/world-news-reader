import { createClient } from '@supabase/supabase-js';
import type { SourceItem, Genre } from '../src/domain/types';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// ジャンル判定（TheNewsAPI対応）
const detectGenre = (item: SourceItem): Genre => {
  const tags = (item.tags ?? []).map(tag => tag.toLowerCase());

  if (tags.some(tag => ['health', 'wellness', 'medical'].includes(tag))) return 'health';
  if (tags.some(tag => ['technology', 'tech', 'ai'].includes(tag))) return 'technology';
  if (tags.some(tag => ['business', 'economy', 'finance'].includes(tag))) return 'business';
  if (tags.some(tag => ['science', 'research', 'climate'].includes(tag))) return 'science';
  if (tags.some(tag => ['culture', 'entertainment', 'arts'].includes(tag))) return 'culture';
  if (tags.some(tag => ['lifestyle', 'travel', 'food', 'fashion'].includes(tag))) return 'lifestyle';

  const text = `${item.title} ${item.abstract ?? ''} ${item.bodyText ?? ''} ${item.section ?? ''}`.toLowerCase();

  if (text.includes('health') || text.includes('medical')) return 'health';
  if (text.includes('technology') || text.includes('ai') || text.includes('software')) return 'technology';
  if (text.includes('lifestyle') || text.includes('wellness')) return 'lifestyle';
  if (text.includes('culture') || text.includes('art') || text.includes('entertainment')) return 'culture';
  if (text.includes('business') || text.includes('economy') || text.includes('finance')) return 'business';
  if (text.includes('science') || text.includes('research') || text.includes('climate')) return 'science';

  return 'news';
};

// スコア計算（TheNewsAPI対応）
const calculateScore = (item: SourceItem): number => {
  let score = 0.5; // 基準スコア

  // bodyText（snippet）の長さによる加点
  if (item.bodyText) {
    const snippetLength = item.bodyText.length;
    if (snippetLength >= 100 && snippetLength <= 500) {
      score += 0.2; // 適切な長さの要約
    }
  }

  // 画像がある場合は加点
  if (item.image) {
    score += 0.1;
  }

  // abstractとbodyTextの両方がある場合は加点
  if (item.abstract && item.bodyText && item.abstract !== item.bodyText) {
    score += 0.1; // 詳細な要約情報
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

interface Topic {
  source_id: string;
  title: string;
  url: string;
  published_at: string;
  abstract?: string;
  section?: string;
  score: number;
  status: string;
  genre: Genre;
  canonical_key: string;
}

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
      const rawData = (source.raw_data ?? {}) as {
        section?: string;
        tags?: ReadonlyArray<string>;
        image?: SourceItem['image'];
        bodyText?: string;
        sourceName?: string;
      };

      const item: SourceItem = {
        provider: 'newsapi',
        providerId: source.provider_id,
        url: source.url,
        title: source.title,
        abstract: source.abstract ?? undefined,
        publishedAt: source.published_at,
        section: rawData.section,
        subsection: undefined,
        byline: undefined,
        tags: rawData.tags ?? [],
        type: undefined,
        wordCount: undefined,
        image: rawData.image,
        body: undefined,
        bodyText: rawData.bodyText,
        sourceName: 'NewsAPI',
      };

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
      const topic: Topic = {
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
    Promise.resolve<Topic[]>([])
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
