#!/usr/bin/env node

/**
 * 既存記事のbody_mdxからフロントマターを除去する修正スクリプト
 */

import { createClient } from '@supabase/supabase-js';
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

const fixArticles = async () => {
  console.log('記事の修正を開始...');

  // すべての記事を取得
  const { data: articles, error } = await supabaseAdmin
    .from('articles')
    .select('id, body_mdx');

  if (error) {
    console.error('記事取得エラー:', error.message);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('修正対象の記事がありません');
    return;
  }

  console.log(`${articles.length}件の記事を処理中...`);

  let fixedCount = 0;
  for (const article of articles) {
    // フロントマターが含まれているかチェック
    if (article.body_mdx && article.body_mdx.startsWith('---')) {
      // フロントマターを除去
      const bodyOnly = article.body_mdx.replace(/^---[\s\S]*?---\s*\n/, '');
      
      // 更新
      const { error: updateError } = await supabaseAdmin
        .from('articles')
        .update({ body_mdx: bodyOnly })
        .eq('id', article.id);

      if (updateError) {
        console.error(`記事 ${article.id} の更新エラー:`, updateError.message);
      } else {
        console.log(`✅ 記事を修正: ${article.id}`);
        fixedCount++;
      }
    }
  }

  console.log(`✅ ${fixedCount}件の記事を修正しました`);
};

// 実行
fixArticles();