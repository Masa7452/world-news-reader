#!/usr/bin/env node

/**
 * TheNewsAPI記事取得スクリプト（カテゴリベース）
 * 使用方法: pnpm tsx scripts/fetch-newsapi.ts [options]
 * オプション:
 *   --categories "business,technology": カテゴリ指定（省略時はプリセット全て）
 *   --locale us: 地域指定（デフォルト: us）
 *   --language en: 言語指定（デフォルト: en）
 *   --limit 10: 取得件数（デフォルト: 10。プランに合わせて調整）
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
 *      - カテゴリ数を減らして再実行
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

// カテゴリプリセット定義
// CLIオプションの解析
const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    categories: undefined as string | undefined,
    locale: 'us' as string,
    language: 'en' as string,
    limit: 20,
    dryRun: false
  };

  args.forEach((arg, index) => {
    const [flag, value] = arg.includes('=') ? arg.split('=') as [string, string] : [arg, undefined];

    if (flag === '--categories') {
      options.categories = value ?? args[index + 1];
      return;
    }

    if (flag === '--locale') {
      options.locale = value ?? args[index + 1] ?? 'us';
      return;
    }

    if (flag === '--language') {
      options.language = value ?? args[index + 1] ?? 'en';
      return;
    }

    if (flag === '--limit') {
      const raw = value ?? args[index + 1];
      if (raw) {
        const parsed = Number.parseInt(raw, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          options.limit = parsed;
        }
      }
      return;
    }

    if (flag === '--dry-run') {
      options.dryRun = true;
      return;
    }
  });

  return options;
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
  console.log('📰 TheNewsAPI記事の取得を開始（カテゴリベース）...');
  
  if (!process.env.NEWS_API_KEY) {
    console.error('❌ NEWS_API_KEYが設定されていません');
    process.exit(1);
  }

  // CLIオプションを取得
  const options = parseCliArgs();
  const client = new NewsApiClient();
  
  // カテゴリリストの決定
  const categoriesInput = options.categories
    ? options.categories.split(',').map(c => c.trim()).filter(Boolean)
    : undefined;
  const categories = categoriesInput && categoriesInput.length > 0 ? categoriesInput : undefined;

  console.log(`📋 取得カテゴリ: ${categories ? categories.join(', ') : '指定なし（ミックス）'}`);
  console.log(`🌍 地域: ${options.locale}, 言語: ${options.language}, 件数: ${options.limit}`);
  
  try {
    // 環境変数とCLIでモードを制御
    const USE_SUPABASE = process.env.USE_SUPABASE !== 'false' && !options.dryRun;
    
    if (options.dryRun) {
      console.log('🧪 Dry-runモード: データベース保存をスキップします');
    }
    
    // カテゴリごとに記事を取得
    const fetchOptions = {
      locale: options.locale,
      language: options.language,
      ...(categories ? { categories } : {}),
      limit: options.limit,
      pages: 1
    };

    const items = await client.fetchTopHeadlines(fetchOptions);

    const uniqueProviderIds = new Set<string>();
    const filteredItems = items.filter(item => {
      if (uniqueProviderIds.has(item.providerId)) {
        return false;
      }
      uniqueProviderIds.add(item.providerId);
      return true;
    });

    console.log(`\n📊 取得結果: ${filteredItems.length}件（重複除外済み）`);

    // データベースに保存
    if (USE_SUPABASE && filteredItems.length > 0) {
      console.log('\n💾 データベースへの保存を開始...');
      const today = new Date().toISOString().split('T')[0];
      const existingCount = await getExistingSourceCount('newsapi', today, today);
      console.log(`📊 既存レコード数: ${existingCount}件`);
      
      const saveResult = await saveSourceItems(filteredItems);
      console.log(`✅ 保存完了: 新規${saveResult.saved}件、スキップ${saveResult.skipped}件`);
      
      if (saveResult.errors.length > 0) {
        console.error(`⚠️  エラー: ${saveResult.errors.length}件`);
        saveResult.errors.slice(0, 3).forEach(err => console.error(`   ${err}`));
      }
    }

    // 開発環境またはdry-runでJSONファイルに保存
    if ((process.env.NODE_ENV === 'development' || options.dryRun) && filteredItems.length > 0) {
      await saveToJSON(filteredItems);
    }
    
  } catch (error) {
    console.error('❌ 取得エラー:', error instanceof Error ? error.message : String(error));
    
    // エラーの種類に応じたRunbook情報を表示
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.error('\n📚 対処法: レート制限に達しています');
        console.error('   - NEWS_API_KEY のプランを確認してください（無料プラン: 100req/day）');
        console.error('   - カテゴリ数を減らして再実行してください');
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
