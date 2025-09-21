/**
 * Supabase Server Component用クライアント
 * Server Componentから直接Supabaseにアクセスするための設定
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// 環境変数の検証
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Server Component用Supabaseクライアント
 * RLSが適用される通常のクライアント
 */
export const createServerSupabaseClient = () => {
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
};

/**
 * 記事一覧を取得
 */
export const getPublishedArticles = async (limit = 50) => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
  
  return data || [];
};

/**
 * カテゴリー別の記事を取得
 */
export const getArticlesByCategory = async (category: string, limit = 10) => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'PUBLISHED')
    .eq('category', category)
    .order('published_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching articles by category:', error);
    return [];
  }
  
  return data || [];
};

/**
 * slugで記事を取得
 */
export const getArticleBySlug = async (slug: string) => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .single();
  
  if (error) {
    console.error('Error fetching article by slug:', error);
    return null;
  }
  
  return data;
};

/**
 * カテゴリー一覧と記事数を取得（最適化版）
 * 必要最小限のフィールドのみ取得してパフォーマンスを改善
 */
export const getCategoriesWithCount = async () => {
  const supabase = createServerSupabaseClient();
  
  // categoryフィールドのみ取得して転送量を削減
  const { data, error } = await supabase
    .from('articles')
    .select('category')
    .eq('status', 'PUBLISHED')
    .not('category', 'is', null); // NULL値を除外
  
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  
  // カテゴリー別に集計
  const categoryCount = (data || []).reduce((acc, article) => {
    const category = article.category;
    if (category) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  // カウントの多い順にソート
  return Object.entries(categoryCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => Number(b.count) - Number(a.count));
};