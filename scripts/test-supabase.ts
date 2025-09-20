#!/usr/bin/env tsx
/**
 * Supabase接続テストスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/test-supabase.ts
 */

import { config } from 'dotenv';
import { supabase, supabaseAdmin } from '../src/lib/supabase';

// 環境変数を読み込み
config({ path: '.env.local' });

const testSupabaseConnection = async () => {
  console.log('🔍 Supabase接続テストを開始...\n');

  // ========================================
  // 1. 通常クライアントのテスト
  // ========================================
  console.log('1️⃣ 通常クライアントのテスト');
  console.log('─'.repeat(40));
  
  try {
    // テーブル存在確認
    const { error: tablesError } = await supabase
      .from('sources')
      .select('count')
      .limit(1);

    if (tablesError) {
      console.error('❌ 通常クライアント接続エラー:', tablesError.message);
      console.log('   環境変数を確認してください:');
      console.log('   - NEXT_PUBLIC_SUPABASE_URL');
      console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    } else {
      console.log('✅ 通常クライアント接続成功');
    }

    // 各テーブルの確認
    const tables = ['sources', 'topics', 'articles', 'topic_outlines', 'article_issues'];
    
    const tableResults = await Promise.all(
      tables.map(async (table) => {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        return {
          table,
          success: !error,
          count: count || 0,
          message: error ? error.message : 'OK',
        };
      })
    );

    tableResults.forEach(({ table, success, count, message }) => {
      const icon = success ? '✅' : '❌';
      const status = success ? `OK (${count}件)` : `エラー (${message})`;
      console.log(`   ${icon} ${table}テーブル: ${status}`);
    });
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }

  console.log('');

  // ========================================
  // 2. Adminクライアントのテスト
  // ========================================
  console.log('2️⃣ Adminクライアントのテスト');
  console.log('─'.repeat(40));

  if (!supabaseAdmin) {
    console.log('⚠️  AdminクライアントはNode.js環境でのみ利用可能です');
    console.log('   SUPABASE_SERVICE_ROLE_KEYが設定されているか確認してください');
    return;
  }

  try {
    // RLSをバイパスしてデータを取得
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('status, count')
      .eq('status', 'PUBLISHED')
      .limit(1);

    if (error) {
      console.error('❌ Adminクライアント接続エラー:', error.message);
      console.log('   環境変数を確認してください:');
      console.log('   - SUPABASE_SERVICE_ROLE_KEY');
    } else {
      console.log('✅ Adminクライアント接続成功');
      console.log('   RLSバイパス確認: OK');
    }
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }

  console.log('');

  // ========================================
  // 3. データ挿入テスト（オプション）
  // ========================================
  console.log('3️⃣ データ操作テスト');
  console.log('─'.repeat(40));

  if (!supabaseAdmin) {
    console.log('⚠️  Adminクライアントが利用できないためスキップ');
    return;
  }

  try {
    // テストデータの挿入
    const testSource = {
      provider: 'guardian' as const,
      provider_id: `test-${Date.now()}`,
      url: 'https://test.example.com/article',
      title: 'テスト記事',
      abstract: 'これはテスト記事です',
      published_at: new Date().toISOString(),
      raw_data: { test: true },
    };

    // TODO: Supabase型生成ツールで正確な型を生成する
    const { data: insertedData, error: insertError } = await (supabaseAdmin as any)
      .from('sources')
      .insert(testSource)
      .select()
      .single();

    if (insertError) {
      console.error('❌ データ挿入エラー:', insertError.message);
    } else if (insertedData) {
      console.log('✅ テストデータ挿入成功');
      console.log(`   ID: ${insertedData.id}`);

      // クリーンアップ
      const { error: deleteError } = await supabaseAdmin
        .from('sources')
        .delete()
        .eq('id', insertedData.id);

      if (deleteError) {
        console.error('❌ クリーンアップエラー:', deleteError.message);
      } else {
        console.log('✅ テストデータ削除成功');
      }
    }
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }

  console.log('');
  console.log('🎉 Supabase接続テスト完了');
};

// メイン実行
testSupabaseConnection().catch(console.error);