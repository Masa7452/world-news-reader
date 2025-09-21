#!/usr/bin/env node

/**
 * 記事校正スクリプト
 * 生成されたMDXドラフトをGemini APIで日本語自然化と品質向上
 */

import { createClient } from '@supabase/supabase-js';
import { polishArticle } from '../lib/gemini-client';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 記事生成の最大件数（デフォルト: 5）
const TARGET_ARTICLE_COUNT = parseInt(process.env.TARGET_ARTICLE_COUNT || '5', 10);

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

// Gemini APIで校正処理
const polishContent = async (content: string): Promise<string> => {
  try {
    // フロントマターと本文を分離
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatterMatch) {
      return content; // フロントマターがない場合はそのまま返す
    }
    
    const frontmatter = frontmatterMatch[0];
    const articleBody = content.substring(frontmatter.length);
    
    console.log('  📝 Gemini APIで校正中...');
    
    // Gemini APIで本文を校正
    const polishedBody = await polishArticle(articleBody);
    
    // フロントマターと校正済み本文を結合
    return frontmatter + polishedBody;
    
  } catch (error) {
    console.error(`  ❌ 校正エラー: ${error instanceof Error ? error.message : String(error)}`);
    
    // エラー時は基本的な文字列整形のみ
    return content
      // 連続する空行を1つに
      .replace(/\n\n\n+/g, '\n\n')
      // 行末の余分な空白を削除
      .replace(/[ \t]+$/gm, '')
      .trim();
  }
};

// DRAFTステータスの記事を取得
const getDraftArticles = async () => {
  const { data: draftArticles, error } = await supabaseAdmin
    .from('articles')
    .select('id, slug, body_mdx, topic_id')
    .eq('status', 'DRAFT')
    .limit(TARGET_ARTICLE_COUNT);

  if (error) {
    console.error('  ❌ ドラフト記事取得エラー:', error.message);
    return [];
  }

  return draftArticles || [];
};


const polishPosts = async () => {
  console.log('記事校正を開始...');
  console.log(`  🎯 最大処理数: ${TARGET_ARTICLE_COUNT}件`);

  const draftArticles = await getDraftArticles();
  console.log(`  📋 ${draftArticles.length}件のドラフト記事を処理中...`);

  const results = await draftArticles.reduce(
    async (prevPromise, article) => {
      const prev = await prevPromise;
      
      try {
        console.log(`✨ 校正開始: ${article.slug}`);
        
        // MDX記事の校正処理
        const polishedContent = await polishContent(article.body_mdx);
        
        // データベースの記事を更新
        const { error } = await supabaseAdmin
          .from('articles')
          .update({ 
            body_mdx: polishedContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);
          
        if (error) {
          console.error(`  ❌ 記事更新エラー (${article.slug}):`, error.message);
          return prev;
        }
        
        console.log(`✨ 校正完了: ${article.slug}`);
        
        // 注: トピックのVERIFIEDステータス更新はverify-post.tsの責務のため、ここでは行わない

        return prev + 1;
      } catch (error) {
        console.error(`記事 ${article.slug} の処理エラー:`, error);
        return prev;
      }
    },
    Promise.resolve(0)
  );

  console.log(`✅ ${results}件の記事を校正しました`);
};

// 実行
polishPosts();