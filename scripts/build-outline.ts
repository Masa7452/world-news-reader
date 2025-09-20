#!/usr/bin/env node

/**
 * アウトライン生成スクリプト
 * 選定されたトピックからジャンル別テンプレートでアウトラインを生成
 */

import { createClient } from '@supabase/supabase-js';
import type { Genre, TopicOutline } from '../src/domain/types';
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

// ジャンル別テンプレート
const getOutlineTemplate = (genre: Genre): string => {
  const templates = {
    technology: `
この技術記事について、以下の構成でアウトラインを作成してください：
1. 技術の概要と背景
2. 主要な特徴・機能
3. 業界への影響
4. 今後の展望
各セクションは2-3の要点で構成してください。
`,
    business: `
このビジネス記事について、以下の構成でアウトラインを作成してください：
1. 事業の概要
2. 市場への影響
3. 関係者の反応
4. 今後の見通し
各セクションは2-3の要点で構成してください。
`,
    health: `
この健康記事について、以下の構成でアウトラインを作成してください：
1. 健康問題の概要
2. 原因・要因の分析
3. 対策・治療法
4. 予防・注意点
各セクションは2-3の要点で構成してください。
`,
    science: `
この科学記事について、以下の構成でアウトラインを作成してください：
1. 研究・発見の概要
2. 手法・プロセス
3. 結果・意義
4. 応用可能性
各セクションは2-3の要点で構成してください。
`,
    culture: `
この文化記事について、以下の構成でアウトラインを作成してください：
1. 文化的背景・コンテキスト
2. 主要な内容・特徴
3. 社会的意義・影響
4. 読者への示唆
各セクションは2-3の要点で構成してください。
`,
    lifestyle: `
このライフスタイル記事について、以下の構成でアウトラインを作成してください：
1. トレンド・現象の概要
2. 実践方法・アプローチ
3. 効果・メリット
4. 読者への応用アドバイス
各セクションは2-3の要点で構成してください。
`,
    news: `
このニュース記事について、以下の構成でアウトラインを作成してください：
1. 事件・出来事の概要
2. 背景・経緯
3. 関係者・影響
4. 今後の展開
各セクションは2-3の要点で構成してください。
`,
    product: `
この製品記事について、以下の構成でアウトラインを作成してください：
1. 製品の概要・特徴
2. 利用方法・対象ユーザー
3. 競合との比較
4. 購入・利用の検討点
各セクションは2-3の要点で構成してください。
`,
    trend: `
このトレンド記事について、以下の構成でアウトラインを作成してください：
1. トレンドの概要
2. 背景・起因
3. 現在の状況・影響
4. 今後の予測
各セクションは2-3の要点で構成してください。
`,
    glossary: `
この用語解説記事について、以下の構成でアウトラインを作成してください：
1. 用語の定義・基本概念
2. 使用場面・文脈
3. 関連用語・概念
4. 実用的な活用方法
各セクションは2-3の要点で構成してください。
`
  };

  return templates[genre] || templates.news;
};

// アウトライン生成（モック実装）
const generateOutline = async (topic: any): Promise<TopicOutline> => {
  const template = getOutlineTemplate(topic.genre);
  
  // TODO: 実際のAI API呼び出しを実装
  // 現在はモックデータを返す
  const mockOutline: TopicOutline = {
    id: `outline-${topic.id}`,
    topicId: topic.id,
    title: `【${topic.genre}】${topic.title}`,
    summary: [
      '記事の要点1',
      '記事の要点2',
      '記事の要点3'
    ],
    sections: [
      {
        heading: 'セクション1',
        points: ['ポイント1-1', 'ポイント1-2']
      },
      {
        heading: 'セクション2', 
        points: ['ポイント2-1', 'ポイント2-2']
      }
    ],
    tags: [topic.genre, topic.section || 'news'],
    createdAt: new Date().toISOString()
  };

  return mockOutline;
};

// JSON出力
const saveOutlineToFile = async (outline: TopicOutline): Promise<void> => {
  const outlineDir = path.join(process.cwd(), 'data', 'outlines');
  if (!fs.existsSync(outlineDir)) {
    fs.mkdirSync(outlineDir, { recursive: true });
  }

  const filename = `${outline.topicId}.json`;
  const filepath = path.join(outlineDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(outline, null, 2), 'utf-8');
  console.log(`📄 アウトラインを保存: ${filename}`);
};

const buildOutlines = async () => {
  console.log('アウトライン生成を開始...');

  // 処理対象のトピックを取得
  const { data: topics, error } = await supabaseAdmin
    .from('topics')
    .select('*')
    .eq('status', 'NEW')
    .order('score', { ascending: false })
    .limit(10);

  if (error) {
    console.error('トピック取得エラー:', error);
    return;
  }

  console.log(`${topics.length}件のトピックを処理中...`);

  // アウトライン生成とファイル保存
  const outlines = await topics.reduce(
    async (prevPromise, topic) => {
      const prev = await prevPromise;
      
      try {
        const outline = await generateOutline(topic);
        await saveOutlineToFile(outline);
        
        // トピックステータスを更新
        await supabaseAdmin
          .from('topics')
          .update({ status: 'OUTLINED' })
          .eq('id', topic.id);

        return [...prev, outline];
      } catch (error) {
        console.error(`トピック ${topic.id} の処理エラー:`, error);
        return prev;
      }
    },
    Promise.resolve<TopicOutline[]>([])
  );

  console.log(`✅ ${outlines.length}件のアウトラインを生成しました`);
};

// 実行
buildOutlines();