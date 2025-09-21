#!/usr/bin/env node

/**
 * MDXドラフト生成スクリプト
 * アウトラインをもとにGemini APIでMDX形式のドラフト記事を生成
 */

import { createClient } from '@supabase/supabase-js';
import type { TopicOutline } from '../src/domain/types';
import { generateArticle } from '../lib/gemini-client';
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
interface TopicForWriting {
  id: string;
  title: string;
  url: string;
  published_at: string;
  abstract?: string;
  section?: string;
  genre: string;
}

// 出典ブロックの生成
const generateSourceBlock = (topic: TopicForWriting): string => {
  const publishedDate = new Date(topic.published_at).toLocaleDateString('ja-JP');
  const sourceName = topic.section || 'NewsAPI';
  
  return `:::source
**出典**: [${topic.title}](${topic.url}) — ${sourceName}（${publishedDate}）
:::`;
};

// MDXドラフトの生成
const generateMdxDraft = async (topic: TopicForWriting, outline: TopicOutline): Promise<string> => {
  const slug = topic.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);

  const sourceName = topic.section || 'NewsAPI';
  
  try {
    console.log(`  ✍️  ${topic.title} の記事を生成中...`);
    
    // Gemini APIで記事本文を生成
    const articleContent = await generateArticle(
      outline.title,
      JSON.stringify(outline.sections, null, 2),
      [{
        title: topic.title,
        url: topic.url,
        abstract: topic.abstract
      }]
    );
    
    const frontmatter = `---
title: "${outline.title}"
description: "${topic.abstract || outline.summary[0] || ''}"
summary: ${JSON.stringify(outline.summary)}
publishedAt: "${topic.published_at}"
genre: "${topic.genre}"
tags: [${outline.tags.map(tag => `"${tag}"`).join(', ')}]
slug: "${slug}"
sourceName: "${sourceName}"
sourceUrl: "${topic.url}"
---`;

    const content = `
# ${outline.title}

${outline.summary.map(point => `- ${point}`).join('\n')}

${articleContent}

${generateSourceBlock(topic)}
`;

    return `${frontmatter}\n${content}`;
    
  } catch (error) {
    console.error(`  ❌ 記事生成エラー: ${error instanceof Error ? error.message : String(error)}`);
    
    // エラー時はアウトラインベースの簡易版を返す
    const frontmatter = `---
title: "${outline.title}"
description: "${topic.abstract || outline.summary[0] || ''}"
summary: ${JSON.stringify(outline.summary)}
publishedAt: "${topic.published_at}"
genre: "${topic.genre}"
tags: [${outline.tags.map(tag => `"${tag}"`).join(', ')}]
slug: "${slug}"
sourceName: "${sourceName}"
sourceUrl: "${topic.url}"
---`;

    const content = `
# ${outline.title}

${outline.summary.map(point => `- ${point}`).join('\n')}

${outline.sections.map(section => `
## ${section.heading}

${section.points.map(point => `- ${point}`).join('\n')}
`).join('')}

${generateSourceBlock(topic)}
`;

    return `${frontmatter}\n${content}`;
  }
};

// Supabaseに記事を直接保存
const saveArticleToDatabase = async (content: string, slug: string, topicId: string, topic: TopicForWriting): Promise<void> => {
  // MDX形式の記事をパース（簡易版）
  const lines = content.split('\n');
  const titleMatch = lines.find(line => line.startsWith('title:'));
  const summaryMatch = lines.find(line => line.startsWith('summary:'));
  
  const title = titleMatch ? titleMatch.replace('title:', '').trim().replace(/['"]/g, '') : topic.title;
  const summary = summaryMatch ? JSON.parse(summaryMatch.replace('summary:', '').trim()) : [
    '記事の重要なポイント1',
    '記事の重要なポイント2', 
    '記事の重要なポイント3'
  ];
  
  // フロントマターを除いた本文を抽出
  const bodyStart = content.indexOf('---', 4) + 3;
  const bodyMdx = content.substring(bodyStart).trim();
  
  const articleData = {
    slug,
    topic_id: topicId,
    title,
    summary,
    summary_text: topic.abstract || title,
    body_mdx: bodyMdx,
    category: topic.genre || 'other',
    tags: [topic.genre || 'news'],
    sources: [{
      name: 'NewsAPI',
      url: topic.url,
      date: topic.published_at
    }],
    image_url: null,
    status: 'DRAFT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { error } = await supabaseAdmin
    .from('articles')
    .insert(articleData);
    
  if (error) {
    throw new Error(`記事保存エラー: ${error.message}`);
  }
  
  console.log(`📝 記事を保存: ${slug}`);
};

// 古い記事ドラフトをクリーンアップ（データベースから）
const cleanupOldDrafts = async (): Promise<void> => {
  // 古いDRAFTステータスの記事を削除（30日以上前のもの）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: oldDrafts, error } = await supabaseAdmin
    .from('articles')
    .delete()
    .eq('status', 'DRAFT')
    .lt('created_at', thirtyDaysAgo.toISOString())
    .select('id');

  if (error) {
    console.warn(`  ⚠️  古いドラフト削除エラー: ${error.message}`);
    return;
  }

  if (oldDrafts && oldDrafts.length > 0) {
    console.log(`  🗑️  ${oldDrafts.length}件の古いドラフトを削除しました`);
  }
};

const writePosts = async () => {
  console.log('MDXドラフト生成を開始...');

  // 古いドラフトをクリーンアップ
  await cleanupOldDrafts();

  // アウトライン済みのトピックを取得
  const { data: topics, error } = await supabaseAdmin
    .from('topics')
    .select('*')
    .eq('status', 'OUTLINED')
    .order('score', { ascending: false })
    .limit(TARGET_ARTICLE_COUNT);

  if (error) {
    console.error('  ❌ トピック取得エラー:', error.message);
    return;
  }

  console.log(`  📋 ${topics.length}件のトピックを処理中... (最大${TARGET_ARTICLE_COUNT}件)`);

  // 各トピックのアウトラインファイルを読み込んでドラフト生成
  const results = await topics.reduce(
    async (prevPromise, topic) => {
      const prev = await prevPromise;
      
      try {
        // アウトラインファイルを読み込み
        const outlineFile = path.join(process.cwd(), 'data', 'outlines', `${topic.id}.json`);
        
        if (!fs.existsSync(outlineFile)) {
          console.warn(`アウトラインファイルが見つかりません: ${topic.id}`);
          return prev;
        }

        const outlineData = JSON.parse(fs.readFileSync(outlineFile, 'utf-8'));
        const outline: TopicOutline = outlineData;

        // MDXドラフト生成
        const mdxContent = await generateMdxDraft(topic, outline);
        const slug = topic.title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 50);

        await saveArticleToDatabase(mdxContent, slug, topic.id, topic);
        
        // トピックステータスを更新
        await supabaseAdmin
          .from('topics')
          .update({ status: 'DRAFTED' })
          .eq('id', topic.id);

        return prev + 1;
      } catch (error) {
        console.error(`トピック ${topic.id} の処理エラー:`, error);
        return prev;
      }
    },
    Promise.resolve(0)
  );

  console.log(`✅ ${results}件のドラフトを生成しました`);
};

// 実行
writePosts();