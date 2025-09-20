#!/usr/bin/env node

/**
 * 全体パイプライン統合スクリプト
 * 記事取得からトピック選定、アウトライン生成、ドラフト作成、校正、検証、公開まで
 */

import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const execAsync = promisify(exec);

// CLIオプションの解析
const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    skipFetch: false,
    onlyRank: false,
    days: 1,
    query: undefined as string | undefined
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
    if (arg === '--days' && args[index + 1]) {
      options.days = parseInt(args[index + 1], 10) || 1;
    }
    if (arg === '--query' && args[index + 1]) {
      options.query = args[index + 1];
    }
  });

  return options;
};

// スクリプト実行のヘルパー
const runScript = async (scriptName: string, args: string[] = []): Promise<void> => {
  const command = `pnpm tsx scripts/${scriptName}.ts ${args.join(' ')}`;
  console.log(`🔄 実行中: ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error(`❌ ${scriptName} 実行エラー:`, error);
    throw error;
  }
};

const runPipeline = async () => {
  console.log('🚀 TheNewsAPIパイプラインを開始...');
  const options = parseCliArgs();
  
  if (options.dryRun) {
    console.log('🧪 Dry-runモード: 実際のDB操作は行いません');
  }

  try {
    // 1. データ取得
    if (!options.skipFetch) {
      console.log('\n📰 Step 1: ニュース記事取得');
      const fetchArgs = [
        '--days', options.days.toString(),
        ...(options.query ? ['--query', options.query] : []),
        ...(options.dryRun ? ['--dry-run'] : [])
      ];
      await runScript('fetch-newsapi', fetchArgs);
    }

    // 2. トピック選定
    console.log('\n🎯 Step 2: トピック選定');
    if (!options.dryRun) {
      await runScript('rank-topics');
    } else {
      console.log('   Dry-run: トピック選定をスキップ');
    }

    // 以降のステップは--only-rankで停止
    if (options.onlyRank) {
      console.log('✅ トピック選定まで完了（--only-rank指定）');
      return;
    }

    // 3. アウトライン生成
    console.log('\n📋 Step 3: アウトライン生成');
    if (!options.dryRun) {
      await runScript('build-outline');
    } else {
      console.log('   Dry-run: アウトライン生成をスキップ');
    }

    // 4. ドラフト生成
    console.log('\n✍️  Step 4: ドラフト生成');
    if (!options.dryRun) {
      await runScript('write-post');
    } else {
      console.log('   Dry-run: ドラフト生成をスキップ');
    }

    // 5. 校正
    console.log('\n✨ Step 5: 記事校正');
    if (!options.dryRun) {
      await runScript('polish-post');
    } else {
      console.log('   Dry-run: 記事校正をスキップ');
    }

    // 6. 検証
    console.log('\n🔍 Step 6: 記事検証');
    if (!options.dryRun) {
      await runScript('verify-post');
    } else {
      console.log('   Dry-run: 記事検証をスキップ');
    }

    // 7. 公開
    console.log('\n📚 Step 7: 記事公開');
    if (!options.dryRun) {
      await runScript('publish-local');
    } else {
      console.log('   Dry-run: 記事公開をスキップ');
    }

    console.log('\n🎉 パイプライン完了！');
    
  } catch (error) {
    console.error('❌ パイプライン実行エラー:', error);
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
  --days N           N日間のデータを取得（デフォルト: 1）
  --query "keyword"  検索クエリを指定

例:
  pnpm tsx scripts/pipeline.ts --dry-run
  pnpm tsx scripts/pipeline.ts --days 3 --query "technology"
  pnpm tsx scripts/pipeline.ts --only-rank --skip-fetch
`);
};

// 実行
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
} else {
  runPipeline();
}