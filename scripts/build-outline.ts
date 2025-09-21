#!/usr/bin/env node

/**
 * アウトライン生成スクリプト
 * 選定されたトピックからGemini APIでアウトラインを生成
 */

import { createClient } from '@supabase/supabase-js';
import type { Genre, TopicOutline } from '../src/domain/types';
import { generateOutline } from '../lib/gemini-client';
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
    science: `
この科学記事について、以下の構成でアウトラインを作成してください：
1. 研究・発見の概要
2. 手法・プロセス
3. 結果・意義
4. 応用可能性
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
    sports: `
このスポーツ記事について、以下の構成でアウトラインを作成してください：
1. 試合・イベントの概要
2. 注目の選手・チーム
3. 試合展開・結果
4. 今後の展望
各セクションは2-3の要点で構成してください。
`,
    entertainment: `
このエンターテインメント記事について、以下の構成でアウトラインを作成してください：
1. 作品・イベントの概要
2. 見どころ・注目ポイント
3. 評価・反響
4. 関連情報
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
    politics: `
この政治記事について、以下の構成でアウトラインを作成してください：
1. 政治的出来事の概要
2. 背景・経緯
3. 各方面の反応
4. 今後の影響
各セクションは2-3の要点で構成してください。
`,
    other: `
この記事について、以下の構成でアウトラインを作成してください：
1. 出来事・トピックの概要
2. 背景・詳細
3. 影響・意義
4. 今後の展開
各セクションは2-3の要点で構成してください。
`
  };

  return templates[genre] || templates.other;
};

// データベースから取得されるトピック型
interface DbTopic {
  id: string;
  title: string;
  abstract?: string;
  genre: Genre;
  section?: string;
}

// Gemini APIでアウトライン生成
const generateOutlineForTopic = async (topic: DbTopic): Promise<{outline: TopicOutline, genre: string}> => {
  // 初期のジャンル推定（フォールバック用）
  const initialGenre = topic.genre || 'other';
  const template = getOutlineTemplate(initialGenre);
  
  try {
    console.log(`  📝 ${topic.title} のアウトライン生成中...`);
    
    // Gemini APIでアウトライン生成
    const outlineJson = await generateOutline(
      topic.title,
      topic.abstract || '',
      initialGenre,
      template
    );
    
    // JSONをパース
    let outlineData;
    try {
      outlineData = JSON.parse(outlineJson);
    } catch (parseError) {
      console.error(`  ❌ JSONパースエラー: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      console.error(`  受信したJSON: ${outlineJson.substring(0, 200)}...`);
      throw new Error(`Failed to parse outline JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    const sections = Array.isArray(outlineData.sections) ? outlineData.sections : [];
    
    // Gemini APIが返したジャンルを使用（なければ初期ジャンルを使用）
    const selectedGenre = outlineData.genre || initialGenre;
    
    // 有効なジャンルかチェック
    const validGenres = [
      'technology', 'business', 'science', 'health',
      'sports', 'entertainment', 'culture', 'lifestyle',
      'politics', 'other'
    ];
    const finalGenre = validGenres.includes(selectedGenre) ? selectedGenre : 'other';
    
    // Gemini APIが生成したsummaryを使用（必ず3つの要点が含まれる）
    let summaryPoints: string[] = [];
    
    if (Array.isArray(outlineData.summary) && outlineData.summary.length === 3) {
      // Gemini APIが正しく3つの要点を生成した場合
      summaryPoints = outlineData.summary.map(point => {
        // 念のため50文字制限をチェック
        if (point.length > 50) {
          const sentences = point.split(/[。！]/);
          point = sentences[0] + (sentences[0].endsWith('。') ? '' : '。');
          if (point.length > 50) {
            point = point.substring(0, 47) + '...';
          }
        }
        return point;
      });
    } else {
      // フォールバック: Gemini APIがsummaryを生成しなかった場合（エラー時）
      console.warn('  ⚠️  Gemini APIがsummaryを生成しませんでした。フォールバックを使用');
      summaryPoints = [
        `${topic.title.substring(0, 20)}の重要な変化`,
        `業界への影響と今後の展開`,
        `関係者の反応と市場の動向`
      ];
    }
    
    // TopicOutline型に変換
    const outline: TopicOutline = {
      id: `outline-${topic.id}`,
      topicId: topic.id,
      title: topic.title,
      summary: summaryPoints.slice(0, 3), // 確実に3つのポイント
      sections: sections.map((section: { title?: string; heading?: string; points?: string[] }) => ({
        heading: section.title || section.heading,
        points: Array.isArray(section.points) ? section.points : []
      })),
      tags: [finalGenre, topic.section || 'news'],
      createdAt: new Date().toISOString()
    };
    
    return { outline, genre: finalGenre };
  } catch (error) {
    console.error(`  ❌ アウトライン生成エラー: ${error instanceof Error ? error.message : String(error)}`);
    
    // エラー時はフォールバック
    const mockOutline: TopicOutline = {
      id: `outline-${topic.id}`,
      topicId: topic.id,
      title: topic.title,
      summary: [
        '記事の要約をこちらに表示',
        '重要なポイントを整理',
        '読者への価値を提供'
      ],
      sections: [
        {
          heading: '概要',
          points: ['主な内容の説明', '背景情報']
        },
        {
          heading: '詳細',
          points: ['具体的な内容', 'データと事実']
        },
        {
          heading: 'まとめ',
          points: ['今後の展望', '関連情報']
        }
      ],
      tags: [initialGenre, topic.section || 'news'],
      createdAt: new Date().toISOString()
    };
    
    return { outline: mockOutline, genre: initialGenre };
  }
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
  console.log(`  🎯 最大処理数: ${TARGET_ARTICLE_COUNT}件`);

  // 処理対象のトピックを取得
  const { data: topics, error } = await supabaseAdmin
    .from('topics')
    .select('*')
    .eq('status', 'NEW')
    .order('score', { ascending: false })
    .limit(TARGET_ARTICLE_COUNT);

  if (error) {
    console.error('  ❌ トピック取得エラー:', error.message);
    return;
  }

  console.log(`  📋 ${topics.length}件のトピックを処理中...`);

  // アウトライン生成とファイル保存
  const outlines = await topics.reduce(
    async (prevPromise, topic) => {
      const prev = await prevPromise;
      
      try {
        const { outline, genre } = await generateOutlineForTopic(topic);
        await saveOutlineToFile(outline);
        
        // トピックステータスとジャンルを更新
        await supabaseAdmin
          .from('topics')
          .update({ 
            status: 'OUTLINED',
            genre: genre  // Gemini APIが選択したジャンルで更新
          })
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
