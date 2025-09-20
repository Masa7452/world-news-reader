#!/usr/bin/env node

/**
 * ローカル公開スクリプト
 * 検証済みドラフトを公開ディレクトリに移動し、Supabaseに記事メタ情報を保存
 */

import { createClient } from '@supabase/supabase-js';
import type { Article } from '../src/domain/types';
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

// フロントマターの解析
const parseFrontmatter = (content: string): { frontmatter: any; body: string } => {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];
  
  // 簡易YAML解析（production環境では適切なライブラリを使用）
  const frontmatter: any = {};
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  });

  return { frontmatter, body };
};

// 記事メタデータの生成
const generateArticleMetadata = (frontmatter: any, slug: string, filepath: string): Article => {
  return {
    id: slug,
    slug,
    topicId: undefined,
    title: frontmatter.title || 'Untitled',
    summary: frontmatter.description ? [frontmatter.description] : [],
    bodyMdx: fs.readFileSync(filepath, 'utf-8'),
    category: frontmatter.genre || 'news',
    tags: frontmatter.tags ? JSON.parse(frontmatter.tags.replace(/'/g, '"')) : [],
    sources: [{
      name: frontmatter.sourceName || 'NewsAPI',
      url: frontmatter.sourceUrl || '',
      date: frontmatter.publishedAt
    }],
    imageUrl: frontmatter.image,
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString()
  };
};

// 検証済みドラフトの取得
const getVerifiedDrafts = async (): Promise<string[]> => {
  const draftsDir = path.join(process.cwd(), 'content', 'drafts');
  if (!fs.existsSync(draftsDir)) {
    return [];
  }

  // 検証済みのトピックに対応するドラフトを取得
  const { data: verifiedTopics } = await supabaseAdmin
    .from('topics')
    .select('title')
    .eq('status', 'VERIFIED');

  if (!verifiedTopics || verifiedTopics.length === 0) {
    return [];
  }

  const allDrafts = fs.readdirSync(draftsDir)
    .filter(file => file.endsWith('.mdx'))
    .map(file => path.join(draftsDir, file));
  
  // ファイル名とトピックタイトルのマッチング
  return allDrafts.filter(filepath => {
    const filename = path.basename(filepath, '.mdx');
    return verifiedTopics.some(topic => 
      topic.title.toLowerCase().includes(filename.replace(/-/g, ' '))
    );
  });
};

const publishPosts = async () => {
  console.log('記事公開を開始...');

  const verifiedDrafts = await getVerifiedDrafts();
  console.log(`${verifiedDrafts.length}件の検証済みドラフトを処理中...`);

  const publishedDir = path.join(process.cwd(), 'content', 'published');
  if (!fs.existsSync(publishedDir)) {
    fs.mkdirSync(publishedDir, { recursive: true });
  }

  const results = await verifiedDrafts.reduce(
    async (prevPromise, draftPath) => {
      const prev = await prevPromise;
      
      try {
        const filename = path.basename(draftPath, '.mdx');
        const content = fs.readFileSync(draftPath, 'utf-8');
        const { frontmatter } = parseFrontmatter(content);
        
        // 公開ディレクトリにコピー
        const publishedPath = path.join(publishedDir, `${filename}.mdx`);
        fs.copyFileSync(draftPath, publishedPath);
        
        // Supabaseに記事メタデータを保存
        const articleMetadata = generateArticleMetadata(frontmatter, filename, publishedPath);
        
        const { error } = await supabaseAdmin
          .from('articles')
          .upsert(articleMetadata, { onConflict: 'slug' });

        if (error) {
          console.error(`記事保存エラー (${filename}):`, error);
          return prev;
        }

        // 対応するトピックを公開済みに更新
        const { data: topic } = await supabaseAdmin
          .from('topics')
          .select('id')
          .ilike('title', `%${filename.replace(/-/g, ' ')}%`)
          .single();

        if (topic) {
          await supabaseAdmin
            .from('topics')
            .update({ status: 'PUBLISHED' })
            .eq('id', topic.id);
        }

        // ドラフトファイルを削除（オプション）
        // fs.unlinkSync(draftPath);
        
        console.log(`📚 公開完了: ${filename}.mdx`);
        return prev + 1;
      } catch (error) {
        console.error(`ファイル ${draftPath} の処理エラー:`, error);
        return prev;
      }
    },
    Promise.resolve(0)
  );

  console.log(`✅ ${results}件の記事を公開しました`);
};

// 実行
publishPosts();