#!/usr/bin/env node

/**
 * 既存記事の句読点を調整するスクリプト
 * 読点が多すぎる文章を自然に修正
 */

import { createClient } from '@supabase/supabase-js';
import { polishArticle } from '../lib/gemini-client';
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

// 句読点の簡易チェック（読点が多すぎるか判定）
const needsPunctuationFix = (text: string): boolean => {
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
  
  for (const paragraph of paragraphs) {
    // 見出しやリストは除外
    if (paragraph.startsWith('#') || paragraph.startsWith('-') || paragraph.startsWith('*')) {
      continue;
    }
    
    // 文ごとに読点の数をチェック
    const sentences = paragraph.split('。');
    for (const sentence of sentences) {
      const commaCount = (sentence.match(/、/g) || []).length;
      const charCount = sentence.length;
      
      // 50文字以内で読点が3個以上、または読点の割合が高い場合
      if ((charCount < 50 && commaCount >= 3) || (commaCount > charCount / 25)) {
        return true;
      }
    }
  }
  
  return false;
};

const fixPunctuation = async () => {
  console.log('記事の句読点調整を開始...');

  // 公開済み記事を取得
  const { data: articles, error } = await supabaseAdmin
    .from('articles')
    .select('id, title, body_mdx')
    .eq('status', 'PUBLISHED')
    .limit(50);  // 一度に処理する記事数を制限

  if (error) {
    console.error('記事取得エラー:', error.message);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('処理対象の記事がありません');
    return;
  }

  console.log(`${articles.length}件の記事をチェック中...`);

  let fixedCount = 0;
  for (const article of articles) {
    // 句読点の調整が必要か判定
    if (!needsPunctuationFix(article.body_mdx || '')) {
      console.log(`  ⭕ ${article.title.substring(0, 30)}... はスキップ`);
      continue;
    }

    console.log(`  📝 ${article.title.substring(0, 30)}... を修正中...`);

    try {
      // Gemini APIで文章を校正（句読点調整を含む）
      const polishedContent = await polishArticle(article.body_mdx || '');

      // 更新
      const { error: updateError } = await supabaseAdmin
        .from('articles')
        .update({ body_mdx: polishedContent })
        .eq('id', article.id);

      if (updateError) {
        console.error(`    ❌ 記事 ${article.id} の更新エラー:`, updateError.message);
      } else {
        console.log(`    ✅ 句読点を調整しました`);
        fixedCount++;
      }

      // API制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`    ❌ エラー:`, error);
    }
  }

  console.log(`✅ ${fixedCount}件の記事の句読点を調整しました`);
};

// 実行
fixPunctuation();