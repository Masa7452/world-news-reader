#!/usr/bin/env node

/**
 * ローカル公開スクリプト
 * 検証済みドラフトを公開ディレクトリに移動し、Supabaseに記事メタ情報を保存
 */

import { createClient } from '@supabase/supabase-js';
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


// 記事メタデータ型定義（データベースのカラムに合わせる）
interface ArticleMetadata {
  slug: string;
  topic_id: string | null;
  title: string;
  summary: string[];        // 3つの要点を配列で保存
  summary_text: string;     // カード表示用の要約文
  body_mdx: string;         // MDX形式の本文
  category: string;         // カテゴリー
  tags: string[];           // タグ
  sources: {
    name: string;
    url: string;
    date?: string;
  }[];           // ソース情報
  image_url: string | null; // 画像URL
  status: string;           // ステータス
  created_at: string;       // 作成日時
  updated_at: string;       // 更新日時
  published_at: string;     // 公開日時
}


// 検証済みトピックの取得（Supabaseから直接取得）
const getVerifiedTopics = async () => {
  const { data: verifiedTopics, error } = await supabaseAdmin
    .from('topics')
    .select('id, title, url, published_at, abstract, genre')
    .eq('status', 'VERIFIED')
    .limit(TARGET_ARTICLE_COUNT);

  if (error) {
    console.error('  ❌ 検証済みトピック取得エラー:', error.message);
    return [];
  }

  if (!verifiedTopics || verifiedTopics.length === 0) {
    console.log('  ℹ️  VERIFIEDステータスのトピックが見つかりません');
    return [];
  }

  console.log(`  📋 ${verifiedTopics.length}件の検証済みトピックを検出`);
  return verifiedTopics;
};

const publishPosts = async () => {
  console.log('記事公開を開始...');

  const verifiedTopics = await getVerifiedTopics();
  console.log(`${verifiedTopics.length}件の検証済みトピックを処理中... (最大${TARGET_ARTICLE_COUNT}件)`);

  if (verifiedTopics.length === 0) {
    console.log('  ℹ️  公開できるトピックがありません');
    return;
  }

  let publishedCount = 0;

  for (const topic of verifiedTopics) {
    try {
      // トピックIDから記事が既に存在するかチェック
      const { data: existingArticle } = await supabaseAdmin
        .from('articles')
        .select('id')
        .eq('topic_id', topic.id)
        .single();

      if (existingArticle) {
        console.log(`  ⏭️  スキップ: トピック ${topic.id} は既に記事化済み`);
        continue;
      }

      // URLからslugを生成
      const slug = topic.url.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '-') || `topic-${topic.id}`;
      
      console.log(`  📝 記事を公開: ${slug} (topic: ${topic.id})`);
      
      // 記事メタデータを生成（フロントマターの代わりにトピック情報を使用）
      const articleMetadata: ArticleMetadata = {
        slug,
        topic_id: topic.id,
        title: topic.title,
        summary: [
          '記事の重要なポイント1',
          '記事の重要なポイント2', 
          '記事の重要なポイント3'
        ],
        summary_text: topic.abstract || topic.title,
        body_mdx: `# ${topic.title}\n\n${topic.abstract}\n\n[元記事を読む](${topic.url})`,
        category: topic.genre || 'other',
        tags: [topic.genre || 'news'],
        sources: [{
          name: 'NewsAPI',
          url: topic.url,
          date: topic.published_at
        }],
        image_url: null,
        status: 'PUBLISHED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: new Date().toISOString()
      };
      
      // Supabaseに記事メタデータを保存
      const { error } = await supabaseAdmin
        .from('articles')
        .insert(articleMetadata);

      if (error) {
        console.error(`  ❌ 記事保存エラー (${slug}):`, error.message);
        continue;
      }
      console.log(`    💾 Supabaseに記事を保存`);

      // トピックを公開済みに更新
      const { error: topicError } = await supabaseAdmin
        .from('topics')
        .update({ status: 'PUBLISHED' })
        .eq('id', topic.id);
      
      if (topicError) {
        console.error(`  ❌ トピックステータス更新エラー:`, topicError.message);
      } else {
        console.log(`    ✅ トピックステータスを PUBLISHED に更新`);
      }
      
      console.log(`  ✅ 公開完了: ${slug}`);
      publishedCount++;
      
    } catch (error) {
      console.error(`トピック ${topic.id} の処理エラー:`, error);
    }
  }

  console.log(`✅ ${publishedCount}件の記事を公開しました`);
};

// 実行
publishPosts();