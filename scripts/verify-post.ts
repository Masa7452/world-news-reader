#!/usr/bin/env node

/**
 * 記事検証スクリプト
 * 出典整合性チェック、ファクトチェック、誇大表現防止をGemini APIで実施
 */

import { createClient } from '@supabase/supabase-js';
import type { VerificationResult, VerificationIssue } from '../src/domain/types';
import { verifyArticle } from '../lib/gemini-client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

// トピック型定義
interface TopicForVerification {
  id: string;
  title: string;
  url: string;
  abstract?: string;
  genre: string;
}

// Gemini APIで検証処理
const verifyContent = async (content: string, topic: TopicForVerification): Promise<VerificationResult> => {
  const issues: VerificationIssue[] = [];
  const suggestions: string[] = [];

  // 基本的な検証ルール
  
  // 1. 出典ブロックの存在チェック
  if (!content.includes(':::source')) {
    issues.push({
      type: 'error',
      message: '出典ブロックが見つかりません'
    });
  }

  // 2. 元記事URLの整合性チェック
  if (!content.includes(topic.url)) {
    issues.push({
      type: 'warning',
      message: '元記事URLが本文中に見つかりません'
    });
  }

  try {
    console.log('  🔍 Gemini APIで詳細検証中...');
    
    // Gemini APIで記事を検証
    const verificationResult = await verifyArticle(
      content,
      [{
        title: topic.title,
        url: topic.url
      }]
    );
    
    // Geminiからの問題点を追加
    verificationResult.issues.forEach((issue: string) => {
      issues.push({
        type: 'warning',
        message: issue
      });
    });
    
    // Geminiからの提案を追加
    suggestions.push(...verificationResult.suggestions);
    
  } catch (error) {
    console.error(`  ❌ 検証エラー: ${error instanceof Error ? error.message : String(error)}`);
    
    // エラー時は基本的な検証のみ
    const assertiveWords = ['絶対', '必ず', '間違いなく', '確実に'];
    const hasAssertive = assertiveWords.some(word => content.includes(word));
    if (hasAssertive) {
      issues.push({
        type: 'warning',
        message: '断定的な表現が含まれています'
      });
      suggestions.push('より控えめな表現に変更することを検討してください');
    }
  }

  return {
    isValid: issues.filter(issue => issue.type === 'error').length === 0,
    issues,
    suggestions
  };
};

// 検証結果の保存
const saveVerificationResult = async (result: VerificationResult, filename: string): Promise<void> => {
  const metaDir = path.join(process.cwd(), 'meta');
  if (!fs.existsSync(metaDir)) {
    fs.mkdirSync(metaDir, { recursive: true });
  }

  const issuesFile = path.join(metaDir, 'issues.json');
  
  // 既存の検証結果を読み込み
  let allIssues: Array<{ filename: string; timestamp: string; result: VerificationResult }> = [];
  if (fs.existsSync(issuesFile)) {
    const existing = JSON.parse(fs.readFileSync(issuesFile, 'utf-8'));
    allIssues = Array.isArray(existing) ? existing : [];
  }

  // 新しい結果を追加
  const issueRecord = {
    filename,
    timestamp: new Date().toISOString(),
    result
  };

  allIssues.push(issueRecord);

  // ファイルに保存
  fs.writeFileSync(issuesFile, JSON.stringify(allIssues, null, 2), 'utf-8');
  console.log(`📋 検証結果を保存: meta/issues.json`);
};

// DRAFTステータスの記事を取得（校正済みのもの）
const getDraftArticles = async () => {
  const { data: draftArticles, error } = await supabaseAdmin
    .from('articles')
    .select(`
      id, slug, body_mdx, topic_id,
      topics!inner(id, title, url, published_at, abstract, genre)
    `)
    .eq('status', 'DRAFT')
    .limit(TARGET_ARTICLE_COUNT);

  if (error) {
    console.error('  ❌ ドラフト記事取得エラー:', error.message);
    return [];
  }

  return draftArticles || [];
};

const verifyPosts = async () => {
  console.log('記事検証を開始...');
  console.log(`  🎯 最大処理数: ${TARGET_ARTICLE_COUNT}件`);

  const draftArticles = await getDraftArticles();
  console.log(`  📋 ${draftArticles.length}件のドラフト記事を検証中...`);

  const results = await draftArticles.reduce(
    async (prevPromise, article) => {
      const prev = await prevPromise;
      
      try {
        console.log(`🔍 検証開始: ${article.slug}`);
        
        // 記事に紐づくトピック情報を取得
        const topic = Array.isArray(article.topics) ? article.topics[0] : article.topics;
        
        if (!topic) {
          console.warn(`トピックが見つかりません: ${article.topic_id}`);
          return prev;
        }

        // 検証実行
        const verificationResult = await verifyContent(article.body_mdx, topic);
        
        // 結果を保存
        await saveVerificationResult(verificationResult, article.slug);
        
        // 検証結果をログ出力
        if (verificationResult.isValid) {
          console.log(`✅ 検証通過: ${article.slug} (topic: ${article.topic_id})`);
          
          // 検証が通った場合、記事のステータスをVERIFIEDに更新
          const { error: updateError } = await supabaseAdmin
            .from('articles')
            .update({ 
              status: 'VERIFIED',
              updated_at: new Date().toISOString()
            })
            .eq('id', article.id);
            
          // トピックのステータスもVERIFIEDに更新
          if (!updateError) {
            await supabaseAdmin
              .from('topics')
              .update({ status: 'VERIFIED' })
              .eq('id', article.topic_id);
            console.log(`  📝 トピックステータスを VERIFIED に更新`);
          } else {
            console.error(`  ❌ ステータス更新エラー: ${updateError.message}`);
          }
        } else {
          console.log(`⚠️  検証失敗: ${article.slug} (topic: ${article.topic_id})`);
          verificationResult.issues.forEach(issue => {
            console.log(`   ${issue.type}: ${issue.message}`);
          });
          
          // 検証失敗の場合、記事ステータスをDRAFTのまま維持
          console.log(`  ⏭️  記事は引き続きDRAFTステータス: ${article.slug}`);
        }

        return prev + 1;
      } catch (error) {
        console.error(`記事 ${article.slug} の処理エラー:`, error);
        return prev;
      }
    },
    Promise.resolve(0)
  );

  console.log(`✅ ${results}件の記事を検証しました`);
};

// 実行
verifyPosts();