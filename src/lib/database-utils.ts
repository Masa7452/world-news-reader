/**
 * データベース操作のユーティリティ関数
 * NewsAPI用のバッチ処理とエラーハンドリングを提供
 */

import { createClient } from '@supabase/supabase-js';
import type { SourceItem } from '../domain/types';

// Supabase Admin Client
const createSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error('Supabase環境変数が設定されていません');
  }
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * SourceItemをSupabaseに保存
 * バッチ処理で効率的に保存し、重複を防ぐ
 */
export const saveSourceItems = async (
  items: readonly SourceItem[]
): Promise<{ saved: number; skipped: number; errors: string[] }> => {
  const supabase = createSupabaseAdmin();
  const results = {
    saved: 0,
    skipped: 0,
    errors: [] as string[]
  };
  
  // バッチサイズを10に設定（同時実行数を制限）
  const BATCH_SIZE = 10;
  
  // バッチごとに処理
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    // 各アイテムを変換して保存
    const promises = batch.map(async (item) => {
      try {
        // 既存レコードをチェック
        const { data: existing } = await supabase
          .from('sources')
          .select('id')
          .eq('provider', item.provider)
          .eq('provider_id', item.providerId)
          .single();
        
        if (existing) {
          results.skipped++;
          return;
        }
        
        // 新規レコードを挿入（NewsAPI専用）
        const sourceData = {
          provider: item.provider, // 'newsapi'固定
          provider_id: item.providerId, // URL使用
          url: item.url,
          title: item.title,
          abstract: item.abstract,
          published_at: item.publishedAt,
          raw_data: {
            // NewsAPI固有フィールド
            section: item.section, // source.name
            byline: item.byline, // author
            tags: item.tags, // source情報から生成
            image: item.image, // urlToImage
            bodyText: item.bodyText, // content（切り詰め済み）
            sourceName: item.sourceName // 'NewsAPI'固定
          }
        };
        
        const { error } = await supabase
          .from('sources')
          .insert(sourceData);
        
        if (error) {
          throw error;
        }
        
        results.saved++;
      } catch (error) {
        const errorMessage = `Error saving ${item.providerId}: ${error instanceof Error ? error.message : String(error)}`;
        results.errors.push(errorMessage);
        console.error(errorMessage);
      }
    });
    
    // バッチ内のすべての処理を待つ
    await Promise.all(promises);
    
    // レート制限対策（バッチ間に待機）
    if (i + BATCH_SIZE < items.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
};

/**
 * 日付範囲内の既存レコード数を取得
 */
export const getExistingSourceCount = async (
  provider: string,
  fromDate: string,
  toDate: string
): Promise<number> => {
  const supabase = createSupabaseAdmin();
  
  const { count, error } = await supabase
    .from('sources')
    .select('*', { count: 'exact', head: true })
    .eq('provider', provider)
    .gte('published_at', fromDate)
    .lte('published_at', toDate);
  
  if (error) {
    console.error('Error counting existing sources:', error);
    return 0;
  }
  
  return count || 0;
};

/**
 * 処理されていないソース記事を取得
 */
export const getUnprocessedSources = async (
  limit = 100
): Promise<any[]> => {
  const supabase = createSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .is('processed_at', null)
    .order('published_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching unprocessed sources:', error);
    return [];
  }
  
  return data || [];
};

/**
 * ソース記事を処理済みとしてマーク
 */
export const markSourceAsProcessed = async (
  sourceId: string
): Promise<boolean> => {
  const supabase = createSupabaseAdmin();
  
  const { error } = await supabase
    .from('sources')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', sourceId);
  
  if (error) {
    console.error(`Error marking source ${sourceId} as processed:`, error);
    return false;
  }
  
  return true;
};