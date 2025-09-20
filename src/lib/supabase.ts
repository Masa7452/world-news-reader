/**
 * Supabaseクライアント設定
 * 通常のクライアントとAdmin権限のクライアントを提供
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// 環境変数の検証
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * 通常のSupabaseクライアント（ブラウザ/サーバー共用）
 * RLSが適用される
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Admin権限のSupabaseクライアント（サーバーサイドのみ）
 * RLSをバイパスする
 * 
 * 注意: このクライアントはサーバーサイドでのみ使用すること
 */
export const createSupabaseAdmin = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

// サーバーサイドでのみAdminクライアントを作成
export const supabaseAdmin = typeof window === 'undefined' && supabaseServiceRoleKey
  ? createSupabaseAdmin()
  : null;

/**
 * Supabaseエラーハンドリングユーティリティ
 */
export const handleSupabaseError = (error: unknown): string => {
  if (!error) return 'Unknown error occurred';
  
  const err = error as Record<string, unknown>;
  if (err?.message && typeof err.message === 'string') {
    return err.message;
  }
  if (err?.details && typeof err.details === 'string') {
    return err.details;
  }
  if (err?.hint && typeof err.hint === 'string') {
    return err.hint;
  }
  return 'An unexpected error occurred';
};

/**
 * データベース操作のヘルパー関数
 */
export const dbHelpers = {
  /**
   * バッチ挿入（重複スキップ）
   */
  async batchInsert<T extends Record<string, unknown>>(
    table: string,
    items: T[],
    conflictColumns: string[] = [],
    client = supabase
  ) {
    if (items.length === 0) return { inserted: 0, errors: [] };

    // バッチサイズを制限（Supabaseの制限に対応）
    const batchSize = 100;
    
    // itemsを100件ずつのバッチに分割
    const batches = items.reduce<T[][]>((acc, item, index) => {
      const batchIndex = Math.floor(index / batchSize);
      if (!acc[batchIndex]) acc[batchIndex] = [];
      acc[batchIndex].push(item);
      return acc;
    }, []);

    // 各バッチを処理
    const batchResults = await Promise.all(
      batches.map(async (batch, index) => {
        try {
          // TODO: Supabase型生成ツールで正確な型を生成する
          const { error, count } = await (client.from(table) as any).upsert(batch, {
            onConflict: conflictColumns.join(','),
            ignoreDuplicates: true,
          });

          return {
            inserted: error ? 0 : (count || batch.length),
            error: error ? `Batch ${index + 1}: ${handleSupabaseError(error)}` : null,
          };
        } catch (err) {
          return {
            inserted: 0,
            error: `Batch ${index + 1}: ${err}`,
          };
        }
      })
    );

    // 結果を集計
    return batchResults.reduce(
      (acc, result) => ({
        inserted: acc.inserted + result.inserted,
        errors: result.error ? [...acc.errors, result.error] : acc.errors,
      }),
      { inserted: 0, errors: [] as string[] }
    );
  },

  /**
   * ページネーション付き取得
   */
  async fetchPaginated<T>(
    table: string,
    {
      page = 1,
      pageSize = 10,
      orderBy = 'created_at',
      ascending = false,
      filters = {},
    }: {
      page?: number;
      pageSize?: number;
      orderBy?: string;
      ascending?: boolean;
      filters?: Record<string, unknown>;
    } = {},
    client = supabase
  ): Promise<{
    data: T[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client.from(table).select('*', { count: 'exact' });

    // フィルター適用
    query = Object.entries(filters).reduce((q, [key, value]) => 
      value !== undefined && value !== null ? q.eq(key, value) : q,
      query
    );

    // ソートと範囲指定
    query = query
      .order(orderBy, { ascending })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(handleSupabaseError(error));
    }

    return {
      data: (data || []) as T[],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      currentPage: page,
    };
  },

  /**
   * 条件付き更新
   */
  async updateWhere<T extends Record<string, unknown>>(
    table: string,
    updates: Partial<T>,
    conditions: Record<string, unknown>,
    client = supabase
  ) {
    // TODO: Supabase型生成ツールで正確な型を生成する
    let query = (client.from(table) as any).update(updates);

    // 条件適用
    query = Object.entries(conditions).reduce((q, [key, value]) => 
      q.eq(key, value),
      query
    );

    const { data, error, count } = await query.select();

    if (error) {
      throw new Error(handleSupabaseError(error));
    }

    return { data, count };
  },
};