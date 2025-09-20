#!/usr/bin/env node

/**
 * TheNewsAPI記事取得スクリプト
 * 使用方法: pnpm tsx scripts/fetch-newsapi.ts [options]
 * オプション:
 *   --days N: N日間のデータを取得（デフォルト: 1）
 *   --query "keyword": 検索クエリ
 *   --sources "cnn,bbc": ソース指定
 *   --locale us: 地域指定
 *   --language en: 言語指定
 *   --dry-run: DB保存をスキップしJSONのみ出力
 * 環境変数:
 *   - USE_SUPABASE: 'false'に設定するとDB保存をスキップ（デフォルト: true）
 *   - NODE_ENV: 'development'の場合、JSONファイル出力を有効化
 * 
 * エラー処理:
 *   - 429 (Rate Limit): 指数バックオフでリトライ（最大3回）
 *   - 5xx (Server Error): 指数バックオフでリトライ（最大3回）
 *   - その他: 即座に失敗
 * 
 * Runbook:
 *   1. レート制限エラーの場合:
 *      - NEWS_API_KEY のプランを確認（無料プラン: 100req/day）
 *      - --days を小さくして再実行
 *   2. サーバーエラーの場合:
 *      - 5分待ってから再実行
 *   3. 認証エラーの場合:
 *      - NEWS_API_KEY の有効性を確認
 */

import 'dotenv/config';
import { NewsApiClient } from '../src/lib/api/newsapi-client';
import { saveSourceItems, getExistingSourceCount } from '../src/lib/database-utils';
import type { SourceItem } from '../src/domain/types';
import path from 'path';
import fs from 'fs';

// CLIオプションの解析
const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    days: 1,
    query: undefined as string | undefined,
    sources: undefined as string | undefined,
    locale: undefined as string | undefined,
    language: 'en' as string,
    dryRun: false
  };

  args.forEach((arg, index) => {
    if (arg === '--days' && args[index + 1]) {
      options.days = parseInt(args[index + 1], 10) || 1;
    }
    if (arg === '--query' && args[index + 1]) {
      options.query = args[index + 1];
    }
    if (arg === '--sources' && args[index + 1]) {
      options.sources = args[index + 1];
    }
    if (arg === '--locale' && args[index + 1]) {
      options.locale = args[index + 1];
    }
    if (arg === '--language' && args[index + 1]) {
      options.language = args[index + 1];
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
    }
  });

  return options;
};

const createDateRange = (days: number = 1): { from: string; to: string } => {
  // 現在時刻から指定日数前の範囲を計算
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
};

const saveToJSON = async (items: readonly SourceItem[]): Promise<void> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `newsapi-${timestamp}.json`;
  const filepath = path.join(process.cwd(), 'data', 'samples', filename);
  
  // データディレクトリを作成
  const samplesDir = path.join(process.cwd(), 'data', 'samples');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }
  
  // 開発環境では最初の10件のみ保存
  const sampleData = {
    timestamp: new Date().toISOString(),
    source: 'newsapi',
    count: items.length,
    items: items.slice(0, 10)
  };
  
  fs.writeFileSync(filepath, JSON.stringify(sampleData, null, 2), 'utf-8');
  console.log(`📁 開発データを保存: ${filename}`);
};

const fetchNewsApiArticles = async () => {
  console.log('📰 TheNewsAPI記事の取得を開始...');
  
  if (!process.env.NEWS_API_KEY) {
    console.error('❌ NEWS_API_KEYが設定されていません');
    process.exit(1);
  }

  // CLIオプションを取得
  const options = parseCliArgs();
  const client = new NewsApiClient();
  const { from, to } = createDateRange(options.days);
  
  console.log(`📅 取得期間: ${from.split('T')[0]} から ${to.split('T')[0]} (${options.days}日間)`);
  
  if (options.query) {
    console.log(`🔍 検索クエリ: "${options.query}"`);
  }
  
  if (options.sources) {
    console.log(`📰 ソース指定: ${options.sources}`);
  }
  
  if (options.locale) {
    console.log(`🌍 地域指定: ${options.locale}`);
  }
  
  try {
    // 環境変数とCLIでモードを制御
    const USE_SUPABASE = process.env.USE_SUPABASE !== 'false' && !options.dryRun;
    
    if (options.dryRun) {
      console.log('🧪 Dry-runモード: データベース保存をスキップします');
    }
    
    if (USE_SUPABASE) {
      // 既存データの件数をチェック
      const existingCount = await getExistingSourceCount('newsapi', from.split('T')[0], to.split('T')[0]);
      console.log(`📊 既存レコード数: ${existingCount}件`);
    }
    
    // 記事を取得（TheNewsAPIの/news/allエンドポイント使用）
    const fetchOptions = {
      published_after: from,
      published_before: to,
      language: options.language,
      sort: 'published_desc' as const,
      limit: 3, // 無料プランの制限
      pages: 30, // 最大100件取得のため（3 × 30 = 90件程度）
      ...(options.query && { search: options.query }),
      ...(options.sources && { sources: options.sources.split(',') }),
      ...(options.locale && { locale: options.locale })
    };
    
    const items = await client.fetchAll(fetchOptions);
    
    console.log(`✅ ${items.length}件の記事を取得しました`);

    // データベースに保存
    if (USE_SUPABASE) {
      console.log('💾 データベースへの保存を開始...');
      const saveResult = await saveSourceItems(items);
      console.log(`✅ 保存完了: 新規${saveResult.saved}件、スキップ${saveResult.skipped}件`);
      
      if (saveResult.errors.length > 0) {
        console.error(`⚠️  エラー: ${saveResult.errors.length}件`);
        saveResult.errors.slice(0, 3).forEach(err => console.error(`   ${err}`));
      }
    }

    // 開発環境またはdry-runでJSONファイルに保存
    if (process.env.NODE_ENV === 'development' || options.dryRun) {
      await saveToJSON(items);
    }
    
  } catch (error) {
    console.error('❌ 取得エラー:', error instanceof Error ? error.message : String(error));
    
    // エラーの種類に応じたRunbook情報を表示
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.error('\n📚 対処法: レート制限に達しています');
        console.error('   - NEWS_API_KEY のプランを確認してください（無料プラン: 100req/day）');
        console.error('   - --days オプションで取得期間を短くしてください');
        console.error('   - 1時間後に再実行してください');
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        console.error('\n📚 対処法: 認証エラー');
        console.error('   - NEWS_API_KEY が正しく設定されているか確認してください');
        console.error('   - APIキーの有効期限を確認してください');
      } else if (error.message.includes('5')) {
        console.error('\n📚 対処法: サーバーエラー');
        console.error('   - TheNewsAPI側の問題の可能性があります');
        console.error('   - 5分後に再実行してください');
      }
    }
    
    process.exit(1);
  }
};

// 実行
fetchNewsApiArticles();