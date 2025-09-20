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

// フロントエンドで使用する記事型
export interface Article {
  id: string;
  slug: string;
  topic_id: string | null;
  title: string;
  summary: string[];
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
  environment: { name: '環境', color: 'tag-green' },
  technology: { name: 'テクノロジー', color: 'tag-blue' },
  lifestyle: { name: 'ライフスタイル', color: 'tag-purple' },
  health: { name: 'ヘルスケア', color: 'tag-red' },
  business: { name: 'ビジネス', color: 'tag-indigo' },
  culture: { name: 'カルチャー', color: 'tag-pink' },
  politics: { name: '政治', color: 'tag-rose' },
  sports: { name: 'スポーツ', color: 'tag-orange' },
  entertainment: { name: 'エンターテインメント', color: 'tag-fuchsia' },
  science: { name: '科学', color: 'tag-cyan' },
  education: { name: '教育', color: 'tag-amber' },
  travel: { name: '旅行', color: 'tag-teal' }
} as const;

export type CategoryKey = keyof typeof CATEGORIES;