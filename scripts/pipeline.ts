#!/usr/bin/env node

/**
 * 全体パイプライン統合スクリプト
 * 記事取得からトピック選定、アウトライン生成、ドラフト作成、校正、検証、公開まで
 * 
 * 使用方法:
 *   pnpm tsx scripts/pipeline.ts [options]
 * 
 * オプション:
 *   --dry-run          実際のDB操作を行わず、動作確認のみ
 *   --skip-fetch       記事取得をスキップ（既存データを使用）
 *   --only-rank        トピック選定まで実行（ドラフト生成以降をスキップ）
 *   --categories "business,tech"  取得するカテゴリを指定
 *   --mode MODE        実行モード（local | production）デフォルト: production
 * 
 * 環境変数:
 *   NEWS_API_KEY       TheNewsAPI のAPIキー（必須）
 *   SLACK_WEBHOOK_URL  Slack通知用WebhookURL（任意）
 *   USE_SUPABASE       Supabaseを使用するか（true/false）
 */

import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { 
  notifyPipelineComplete, 
  notifyPipelineError, 
  logWithNotification,
  type PipelineMetrics 
} from '../lib/notifications.js';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const execAsync = promisify(exec);

// 型定義
type PipelineMode = 'local' | 'production';
// TODO(phase7): 'staging' モードを追加予定

interface SupabaseConfig {
  readonly url: string;
  readonly serviceRoleKey: string;
}

// CLIオプションの解析
const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    skipFetch: false,
    onlyRank: false,
    categories: undefined as string | undefined,
    limit: undefined as string | undefined,
    mode: 'production' as PipelineMode  // デフォルトはproduction
  };

  args.forEach((arg, index) => {
    if (arg === '--dry-run') {
      options.dryRun = true;
    }
    if (arg === '--skip-fetch') {
      options.skipFetch = true;
    }
    if (arg === '--only-rank') {
      options.onlyRank = true;
    }
    if (arg === '--categories' && args[index + 1]) {
      options.categories = args[index + 1];
    }
    if (arg === '--limit' && args[index + 1]) {
      options.limit = args[index + 1];
    }
    if (arg === '--mode' && args[index + 1]) {
      const mode = args[index + 1];
      if (mode === 'local' || mode === 'production') {
        options.mode = mode;
      } else {
        console.warn(`Invalid mode: ${mode}. Using 'production' as default.`);
      }
    }
  });

  return options;
};


// Supabase設定の解決
const resolveSupabaseConfig = (mode: PipelineMode): SupabaseConfig => {
  switch (mode) {
    case 'local': {
      // TODO(phase7): 環境変数から実際の値を読み込む
      const localUrl = process.env.SUPABASE_LOCAL_URL || 'http://localhost:54321';
      const localServiceKey = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || '';
      
      if (!localServiceKey) {
        console.warn('SUPABASE_LOCAL_SERVICE_ROLE_KEY not set for local mode');
      }
      
      return {
        url: localUrl,
        serviceRoleKey: localServiceKey
      };
    }
    
    case 'production': {
      // TODO(phase7): 環境変数から実際の値を読み込む
      const prodUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const prodServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      
      if (!prodUrl || !prodServiceKey) {
        throw new Error('Production Supabase credentials not configured');
      }
      
      return {
        url: prodUrl,
        serviceRoleKey: prodServiceKey
      };
    }
    
    // TODO(phase7): staging モードのサポートを追加
    // case 'staging': {
    //   const stagingUrl = process.env.SUPABASE_STAGING_URL || '';
    //   const stagingServiceKey = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY || '';
    //   return { url: stagingUrl, serviceRoleKey: stagingServiceKey };
    // }
    
    default: {
      // TypeScriptの網羅性チェック
      const _exhaustive: never = mode;
      throw new Error(`Unsupported mode: ${_exhaustive}`);
    }
  }
};

// スクリプト実行のヘルパー（メトリクス収集機能付き）
const runScript = async (scriptName: string, args: string[] = []): Promise<{ success: boolean; output?: string }> => {
  const command = `pnpm tsx scripts/${scriptName}.ts ${args.join(' ')}`;
  console.log(`🔄 実行中: ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('Warning')) console.error(stderr);
    return { success: true, output: stdout };
  } catch (error) {
    console.error(`❌ ${scriptName} 実行エラー:`, error);
    throw error;
  }
};

const runPipeline = async () => {
  console.log('🚀 TheNewsAPIパイプラインを開始...');
  const startTime = Date.now();
  const options = parseCliArgs();
  const metrics: PipelineMetrics = {
    fetchedArticles: 0,
    selectedTopics: 0,
    generatedDrafts: 0,
    publishedArticles: 0,
    errors: [],
    duration: 0
  };
  
  if (options.dryRun) {
    console.log('🧪 Dry-runモード: 実際のDB操作は行いません');
  }
  
  // モードの表示
  console.log(`📋 実行モード: ${options.mode}`);
  
  // Supabase設定の解決
  let supabaseConfig: SupabaseConfig | null = null;
  if (!options.dryRun) {
    try {
      supabaseConfig = resolveSupabaseConfig(options.mode);
      console.log(`🗄️  Supabase URL: ${supabaseConfig.url}`);
    } catch (error) {
      console.error('❌ Supabase設定の解決に失敗:', error);
      // localモードの場合は警告のみ
      if (options.mode === 'local') {
        console.warn('⚠️  ローカルモードでSupabase設定が不足していますが、続行します');
      } else {
        process.exit(1);
      }
    }
  }

  // NEWS_API_KEY のチェック
  if (!process.env.NEWS_API_KEY && !options.skipFetch && !options.dryRun) {
    const error = new Error('NEWS_API_KEY is not configured');
    await notifyPipelineError(error, 'Environment Check');
    console.error('❌ NEWS_API_KEY が設定されていません');
    process.exit(1);
  }

  try {
    // 1. データ取得
    if (!options.skipFetch) {
      console.log('\n📰 Step 1: ニュース記事取得（カテゴリベース）');

      const categoriesArg = options.categories ?? process.env.NEWS_TOP_CATEGORIES;
      const limitArg = options.limit ?? process.env.NEWS_TOP_LIMIT;
      const localeEnv = process.env.NEWS_TOP_LOCALE;
      const languageEnv = process.env.NEWS_TOP_LANGUAGE;

      const fetchArgs = [
        ...(categoriesArg ? ['--categories', categoriesArg] : []),
        ...(limitArg ? ['--limit', limitArg] : []),
        ...(localeEnv ? ['--locale', localeEnv] : []),
        ...(languageEnv ? ['--language', languageEnv] : []),
        ...(options.dryRun ? ['--dry-run'] : [])
      ];
      
      try {
        await runScript('fetch-newsapi', fetchArgs);
        // TODO: 実際の取得件数を解析
        metrics.fetchedArticles = options.dryRun ? 0 : 10; // 仮の値
        await logWithNotification('success', `記事取得完了: ${metrics.fetchedArticles}件`);
      } catch (error) {
        metrics.errors.push('記事取得失敗');
        // レート制限エラー（429）の場合は特別な処理
        if (error instanceof Error && error.message.includes('429')) {
          console.error('⚠️ レート制限に達しました。しばらく待ってから再試行してください。');
          metrics.errors.push('API rate limit exceeded');
        }
        throw error;
      }
    }

    // 2. トピック選定
    console.log('\n🎯 Step 2: トピック選定');
    if (!options.dryRun) {
      try {
        await runScript('rank-topics');
        // TODO: 実際の選定件数を解析
        metrics.selectedTopics = 5; // 仮の値
        await logWithNotification('success', `トピック選定完了: ${metrics.selectedTopics}件`);
      } catch (error) {
        metrics.errors.push('トピック選定失敗');
        throw error;
      }
    } else {
      console.log('   Dry-run: トピック選定をスキップ');
    }

    // 以降のステップは--only-rankで停止
    if (options.onlyRank) {
      console.log('✅ トピック選定まで完了（--only-rank指定）');
      metrics.duration = Date.now() - startTime;
      await notifyPipelineComplete(metrics);
      return;
    }

    // 3. アウトライン生成
    console.log('\n📋 Step 3: アウトライン生成');
    if (!options.dryRun) {
      try {
        await runScript('build-outline');
        await logWithNotification('info', 'アウトライン生成完了');
      } catch (error) {
        metrics.errors.push('アウトライン生成失敗');
        console.warn('⚠️ アウトライン生成でエラーが発生しましたが、処理を継続します', error);
      }
    } else {
      console.log('   Dry-run: アウトライン生成をスキップ');
    }

    // 4. ドラフト生成
    console.log('\n✍️  Step 4: ドラフト生成');
    if (!options.dryRun) {
      try {
        await runScript('write-post');
        metrics.generatedDrafts = metrics.selectedTopics; // 仮の値
        await logWithNotification('success', `ドラフト生成完了: ${metrics.generatedDrafts}件`);
      } catch (error) {
        metrics.errors.push('ドラフト生成失敗');
        console.warn('⚠️ ドラフト生成でエラーが発生しましたが、処理を継続します', error);
      }
    } else {
      console.log('   Dry-run: ドラフト生成をスキップ');
    }

    // 5. 校正
    console.log('\n✨ Step 5: 記事校正');
    if (!options.dryRun) {
      try {
        await runScript('polish-post');
        await logWithNotification('info', '記事校正完了');
      } catch (error) {
        metrics.errors.push('記事校正失敗');
        console.warn('⚠️ 記事校正でエラーが発生しましたが、処理を継続します', error);
      }
    } else {
      console.log('   Dry-run: 記事校正をスキップ');
    }

    // 6. 検証
    console.log('\n🔍 Step 6: 記事検証');
    if (!options.dryRun) {
      try {
        await runScript('verify-post');
        await logWithNotification('info', '記事検証完了');
      } catch (error) {
        metrics.errors.push('記事検証失敗');
        console.warn('⚠️ 記事検証でエラーが発生しましたが、処理を継続します', error);
      }
    } else {
      console.log('   Dry-run: 記事検証をスキップ');
    }

    // 7. 公開
    console.log('\n📚 Step 7: 記事公開');
    if (!options.dryRun) {
      try {
        await runScript('publish-local');
        metrics.publishedArticles = metrics.generatedDrafts; // 仮の値
        await logWithNotification('success', `記事公開完了: ${metrics.publishedArticles}件`);
      } catch (error) {
        metrics.errors.push('記事公開失敗');
        throw error;
      }
    } else {
      console.log('   Dry-run: 記事公開をスキップ');
    }

    metrics.duration = Date.now() - startTime;
    console.log('\n🎉 パイプライン完了！');
    console.log(`処理時間: ${Math.round(metrics.duration / 1000)}秒`);
    
    // 成功通知
    await notifyPipelineComplete(metrics);
    
  } catch (error) {
    metrics.duration = Date.now() - startTime;
    console.error('❌ パイプライン実行エラー:', error);
    
    // エラー通知
    if (error instanceof Error) {
      await notifyPipelineError(error, 'Pipeline Execution');
    }
    
    // メトリクスを出力してから終了
    console.error('\nパイプラインメトリクス:', metrics);
    process.exit(1);
  }
};

// ヘルプ表示
const showHelp = () => {
  console.log(`
TheNewsAPI記事生成パイプライン

使用方法:
  pnpm tsx scripts/pipeline.ts [options]

オプション:
  --dry-run          実際のDB操作を行わず、動作確認のみ
  --skip-fetch       記事取得をスキップ
  --only-rank        トピック選定まで実行
  --categories "business,tech"  取得カテゴリを指定
  --limit 10         取得件数を指定（/news/top の limit）

例:
  pnpm tsx scripts/pipeline.ts --dry-run
  pnpm tsx scripts/pipeline.ts --categories "technology,science" --limit 8
  pnpm tsx scripts/pipeline.ts --only-rank --skip-fetch
`);
};

// 実行
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
} else {
  runPipeline();
}
