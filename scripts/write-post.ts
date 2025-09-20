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

// 出典ブロックの生成
const generateSourceBlock = (topic: any): string => {
  const publishedDate = new Date(topic.published_at).toLocaleDateString('ja-JP');
  const sourceName = topic.section || 'NewsAPI';
  
  return `:::source
**出典**: [${topic.title}](${topic.url}) — ${sourceName}（${publishedDate}）
:::`;
};

// MDXドラフトの生成
const generateMdxDraft = async (topic: any, outline: TopicOutline): Promise<string> => {
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
description: "${topic.abstract || outline.summary.join('、')}"
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
description: "${topic.abstract || outline.summary.join('、')}"
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

// ファイル保存
const saveDraftToFile = async (content: string, slug: string): Promise<void> => {
  const draftsDir = path.join(process.cwd(), 'content', 'drafts');
  if (!fs.existsSync(draftsDir)) {
    fs.mkdirSync(draftsDir, { recursive: true });
  }

  const filename = `${slug}.mdx`;
  const filepath = path.join(draftsDir, filename);
  
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`📝 ドラフトを保存: ${filename}`);
};

const writePosts = async () => {
  console.log('MDXドラフト生成を開始...');

  // アウトライン済みのトピックを取得
  const { data: topics, error } = await supabaseAdmin
    .from('topics')
    .select('*')
    .eq('status', 'OUTLINED')
    .order('score', { ascending: false })
    .limit(5);

  if (error) {
    console.error('トピック取得エラー:', error);
    return;
  }

  console.log(`${topics.length}件のトピックを処理中...`);

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

        await saveDraftToFile(mdxContent, slug);
        
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