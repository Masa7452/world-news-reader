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

// Gemini APIで検証処理
const verifyContent = async (content: string, topic: any): Promise<VerificationResult> => {
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
  let allIssues: any[] = [];
  if (fs.existsSync(issuesFile)) {
    const existing = JSON.parse(fs.readFileSync(issuesFile, 'utf-8'));
    allIssues = Array.isArray(existing) ? existing : [];
  }

  // 新しい結果を追加
  const issueRecord = {
    filename,
    timestamp: new Date().toISOString(),
    ...result
  };

  allIssues.push(issueRecord);

  // ファイルに保存
  fs.writeFileSync(issuesFile, JSON.stringify(allIssues, null, 2), 'utf-8');
  console.log(`📋 検証結果を保存: meta/issues.json`);
};

// ドラフトファイルの取得
const getDraftFiles = async (): Promise<string[]> => {
  const draftsDir = path.join(process.cwd(), 'content', 'drafts');
  if (!fs.existsSync(draftsDir)) {
    return [];
  }

  return fs.readdirSync(draftsDir)
    .filter(file => file.endsWith('.mdx'))
    .map(file => path.join(draftsDir, file));
};

const verifyPosts = async () => {
  console.log('記事検証を開始...');

  const draftFiles = await getDraftFiles();
  console.log(`${draftFiles.length}件のドラフトを検証中...`);

  const results = await draftFiles.reduce(
    async (prevPromise, filepath) => {
      const prev = await prevPromise;
      
      try {
        // ファイル内容を読み込み
        const content = fs.readFileSync(filepath, 'utf-8');
        const filename = path.basename(filepath, '.mdx');
        
        // 対応するトピック情報を取得
        const { data: topic } = await supabaseAdmin
          .from('topics')
          .select('*')
          .eq('status', 'VERIFIED')
          .ilike('title', `%${filename.replace(/-/g, ' ')}%`)
          .single();

        if (!topic) {
          console.warn(`トピックが見つかりません: ${filename}`);
          return prev;
        }

        // 検証実行
        const verificationResult = await verifyContent(content, topic);
        
        // 結果を保存
        await saveVerificationResult(verificationResult, filename);
        
        // 検証結果をログ出力
        if (verificationResult.isValid) {
          console.log(`✅ 検証通過: ${filename}`);
        } else {
          console.log(`⚠️  検証失敗: ${filename}`);
          verificationResult.issues.forEach(issue => {
            console.log(`   ${issue.type}: ${issue.message}`);
          });
        }

        return prev + 1;
      } catch (error) {
        console.error(`ファイル ${filepath} の処理エラー:`, error);
        return prev;
      }
    },
    Promise.resolve(0)
  );

  console.log(`✅ ${results}件の記事を検証しました`);
};

// 実行
verifyPosts();