#!/usr/bin/env node

/**
 * 既存記事のサマリーを改善するスクリプト
 * 英語の1つだけのサマリーを日本語3つのポイントに修正
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { generateOutline } from '../lib/gemini-client';

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

const updateSummaries = async () => {
  console.log('記事サマリーの更新を開始...');

  // すべての記事を取得
  const { data: articles, error } = await supabaseAdmin
    .from('articles')
    .select('id, title, summary, body_mdx, category')
    .eq('status', 'PUBLISHED');

  if (error) {
    console.error('記事取得エラー:', error.message);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('更新対象の記事がありません');
    return;
  }

  console.log(`${articles.length}件の記事を処理中...`);

  let updatedCount = 0;
  for (const article of articles) {
    // サマリーが不正な形式、1つしかない、英語、または[で始まる場合は更新
    const needsUpdate = !article.summary || 
        !Array.isArray(article.summary) ||
        article.summary.length < 3 || 
        (article.summary[0] && /^[a-zA-Z\[]/.test(article.summary[0]));
    
    if (needsUpdate) {
      
      console.log(`  📝 記事「${article.title}」のサマリーを生成中...`);
      
      try {
        // 記事本文から最初の3段落を抽出してサマリーポイントを生成
        const bodyText = article.body_mdx || '';
        const paragraphs = bodyText.split('\n\n').filter(p => p.trim().length > 0);
        
        // 新しいサマリーポイントを生成（50文字以内）
        const newSummary = [
          article.title.length > 30 
            ? `${article.title.substring(0, 27)}...の最新情報`
            : `${article.title}の最新情報を提供`,
          `専門家の見解と詳細な分析を掲載`,
          `今後の展開と影響について解説`
        ];

        // 記事本文から具体的なポイントを抽出できる場合
        if (paragraphs.length >= 3) {
          const points: string[] = [];
          
          // 各段落から重要そうな文を抽出（最初の文、50文字以内）
          for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
            const sentences = paragraphs[i].split('。');
            if (sentences[0]) {
              let point = sentences[0].replace(/^#+ /, '').replace(/^- /, '').trim();
              if (point.length > 50) {
                point = point.substring(0, 47) + '...';
              }
              if (point.length > 10) {
                points.push(point);
              }
            }
          }
          
          // 3つのポイントが取得できた場合は使用
          if (points.length >= 3) {
            newSummary[0] = points[0];
            newSummary[1] = points[1]; 
            newSummary[2] = points[2];
          }
        }
        
        // 更新
        const { error: updateError } = await supabaseAdmin
          .from('articles')
          .update({ summary: newSummary })
          .eq('id', article.id);

        if (updateError) {
          console.error(`    ❌ 記事 ${article.id} の更新エラー:`, updateError.message);
        } else {
          console.log(`    ✅ サマリーを更新`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`    ❌ エラー:`, error);
      }
    }
  }

  console.log(`✅ ${updatedCount}件の記事サマリーを更新しました`);
};

// 実行
updateSummaries();