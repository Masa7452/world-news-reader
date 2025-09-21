/**
 * 記事の型定義
 * Supabaseのarticlesテーブルをベースにした共通型
 */

import type { Database } from '@/lib/database.types';

// Supabaseのarticles型を再エクスポート
export type SupabaseArticle = Database['public']['Tables']['articles']['Row'];

// sourcesの具体的な型定義
export interface ArticleSource {
  name: string;
  url: string;
  date?: string;
}

// フロントエンドで使用する記事型（Supabaseのスキーマに合わせてsnake_case）
export interface Article {
  id: string;
  slug: string;
  topic_id: string | null;
  title: string;
  summary: string[];
  summary_text?: string;  // カード表示用の要約文
  body_mdx: string;
  category: string;
  tags: string[];
  sources: ArticleSource[];
  image_url: string | null;
  status: 'DRAFT' | 'VERIFIED' | 'PUBLISHED';
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

// Supabaseの型をフロントエンド用に変換
export const convertSupabaseArticle = (article: SupabaseArticle): Article => {
  // sourcesが配列でない場合は空配列にフォールバック
  const sources = Array.isArray(article.sources) 
    ? article.sources 
    : article.sources 
      ? [article.sources] 
      : [];

  return {
    ...article,
    sources: sources.map(s => ({
      name: (s?.name as string) || '',
      url: (s?.url as string) || '',
      date: s?.date as string | undefined
    }))
  };
};

// カテゴリー定義
export const CATEGORIES = {
  environment: { name: '環境', color: 'tag-green', description: '環境問題や持続可能性に関する記事' },
  technology: { name: 'テクノロジー', color: 'tag-blue', description: 'IT、AI、ソフトウェア、デジタル技術に関する記事' },
  lifestyle: { name: 'ライフスタイル', color: 'tag-purple', description: 'ファッション、食、旅行、住まいに関する記事' },
  health: { name: 'ヘルスケア', color: 'tag-red', description: '医療、健康、ウェルネス、フィットネスに関する記事' },
  business: { name: 'ビジネス', color: 'tag-indigo', description: '経済、金融、投資、企業、市場に関する記事' },
  culture: { name: 'カルチャー', color: 'tag-pink', description: 'アート、芸術、文学、歴史に関する記事' },
  politics: { name: '政治', color: 'tag-rose', description: '政府、政策、選挙、国際関係に関する記事' },
  sports: { name: 'スポーツ', color: 'tag-orange', description: '競技、選手、試合、大会に関する記事' },
  entertainment: { name: 'エンターテインメント', color: 'tag-fuchsia', description: '映画、音楽、ゲーム、芸能に関する記事' },
  science: { name: '科学', color: 'tag-cyan', description: '研究、宇宙、生物学、物理学、化学に関する記事' },
  education: { name: '教育', color: 'tag-amber', description: '学習、教育機関、教育政策に関する記事' },
  travel: { name: '旅行', color: 'tag-teal', description: '観光、旅行先、文化体験に関する記事' },
  other: { name: 'その他', color: 'tag-gray', description: '上記以外のカテゴリーに属する記事' }
} as const;

export type CategoryKey = keyof typeof CATEGORIES;