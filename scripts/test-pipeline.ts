#!/usr/bin/env node

/**
 * パイプライン統合テストスクリプト
 * モックデータを使用してパイプラインの動作を検証
 */

import 'dotenv/config';
import { execSync } from 'child_process';

const runCommand = (command: string, description: string) => {
  console.log(`\n🔧 ${description}...`);
  console.log(`   $ ${command}`);
  
  try {
    const result = execSync(command, { 
      encoding: 'utf8',
      env: { ...process.env, USE_SUPABASE: 'false' }
    });
    console.log(result);
    return true;
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string };
    console.error('❌ Error:', err.stderr || err.stdout || 'Unknown error');
    return false;
  }
};

const main = async () => {
  console.log('🧪 パイプライン統合テストを開始...\n');
  
  const tests = [
    {
      name: 'TypeScriptコンパイルチェック',
      command: 'pnpm typecheck'
    },
    {
      name: 'Lintチェック（エラーのみ）',
      command: 'pnpm lint --quiet'
    },
    {
      name: 'パイプライン dry-run (ランキングまで)',
      command: 'pnpm tsx scripts/pipeline.ts --dry-run --skip-fetch --only-rank'
    },
    {
      name: 'パイプライン dry-run (フル)',
      command: 'pnpm tsx scripts/pipeline.ts --dry-run --skip-fetch'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    if (runCommand(test.command, test.name)) {
      passed++;
      console.log(`✅ ${test.name}: PASSED`);
    } else {
      failed++;
      console.log(`❌ ${test.name}: FAILED`);
    }
  }
  
  console.log('\n📊 テスト結果:');
  console.log(`   ✅ 成功: ${passed}`);
  console.log(`   ❌ 失敗: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 すべてのテストが成功しました！');
    console.log('\nℹ️  本番実行の前に以下を確認してください:');
    console.log('   1. .env ファイルに NEWS_API_KEY を設定');
    console.log('   2. .env ファイルに GEMINI_API_KEY を設定');
    console.log('   3. Supabase の接続情報を設定');
    console.log('   4. 必要に応じて SLACK_WEBHOOK_URL を設定');
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。エラーを確認してください。');
    process.exit(1);
  }
};

main().catch(console.error);