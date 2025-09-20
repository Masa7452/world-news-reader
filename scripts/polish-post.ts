#!/usr/bin/env node

/**
 * 記事校正スクリプト
 * 生成されたMDXドラフトの日本語自然化と品質向上
 */

import { createClient } from '@supabase/supabase-js';
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

// 校正処理（モック実装）
const polishContent = async (content: string): Promise<string> => {
  // TODO: 実際のAI API呼び出しを実装
  // 現在は基本的な文字列整形のみ
  
  return content
    // 連続する空行を1つに
    .replace(/\n\n\n+/g, '\n\n')
    // 行末の余分な空白を削除
    .replace(/[ \t]+$/gm, '')
    // 文末に適切な句読点を追加
    .replace(/([^。！？\n])(\n)/g, '$1。$2')
    .trim();
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

// ドラフトのslugからトピックIDを取得
const getTopicIdFromSlug = async (slug: string): Promise<string | null> => {
  const { data: topic } = await supabaseAdmin
    .from('topics')
    .select('id')
    .eq('status', 'DRAFTED')
    .ilike('title', `%${slug.replace(/-/g, ' ')}%`)
    .single();

  return topic?.id || null;
};

const polishPosts = async () => {
  console.log('記事校正を開始...');

  const draftFiles = await getDraftFiles();
  console.log(`${draftFiles.length}件のドラフトを処理中...`);

  const results = await draftFiles.reduce(
    async (prevPromise, filepath) => {
      const prev = await prevPromise;
      
      try {
        // ファイル内容を読み込み
        const content = fs.readFileSync(filepath, 'utf-8');
        const filename = path.basename(filepath, '.mdx');
        
        // 校正処理
        const polishedContent = await polishContent(content);
        
        // ファイルを更新
        fs.writeFileSync(filepath, polishedContent, 'utf-8');
        console.log(`✨ 校正完了: ${filename}.mdx`);
        
        // 対応するトピックのステータスを更新
        const topicId = await getTopicIdFromSlug(filename);
        if (topicId) {
          await supabaseAdmin
            .from('topics')
            .update({ status: 'VERIFIED' })
            .eq('id', topicId);
        }

        return prev + 1;
      } catch (error) {
        console.error(`ファイル ${filepath} の処理エラー:`, error);
        return prev;
      }
    },
    Promise.resolve(0)
  );

  console.log(`✅ ${results}件の記事を校正しました`);
};

// 実行
polishPosts();