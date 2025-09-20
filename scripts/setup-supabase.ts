#!/usr/bin/env tsx
/**
 * Supabaseセットアップスクリプト
 * テーブル作成SQLを実行するヘルパー
 * 
 * 使用方法:
 * 1. Supabaseダッシュボードでプロジェクトを作成
 * 2. .env.localに認証情報を設定
 * 3. npx tsx scripts/setup-supabase.ts
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// 環境変数を読み込み
config({ path: '.env.local' });

const setupInstructions = () => {
  console.log('📚 Supabaseセットアップガイド');
  console.log('═'.repeat(50));
  console.log('');
  
  console.log('1️⃣ Supabaseプロジェクトの作成');
  console.log('─'.repeat(40));
  console.log('1. https://supabase.com にアクセス');
  console.log('2. "Start your project" をクリック');
  console.log('3. プロジェクト名とパスワードを設定');
  console.log('4. リージョンを選択（東京推奨）');
  console.log('');

  console.log('2️⃣ 認証情報の取得');
  console.log('─'.repeat(40));
  console.log('Supabaseダッシュボード > Settings > API から:');
  console.log('- Project URL → NEXT_PUBLIC_SUPABASE_URL');
  console.log('- anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('- service_role → SUPABASE_SERVICE_ROLE_KEY');
  console.log('');

  console.log('3️⃣ .env.localファイルの作成');
  console.log('─'.repeat(40));
  console.log('.env.local.exampleをコピーして.env.localを作成:');
  console.log('cp .env.local.example .env.local');
  console.log('');
  console.log('取得した認証情報を.env.localに設定');
  console.log('');

  console.log('4️⃣ SQLの実行');
  console.log('─'.repeat(40));
  console.log('Supabaseダッシュボード > SQL Editor で実行:');
  console.log('');
  
  // SQLファイルの内容を読み込み
  try {
    const sqlPath = join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    console.log('📋 以下のSQLをコピーして実行してください:');
    console.log('');
    console.log('```sql');
    console.log(sqlContent);
    console.log('```');
  } catch (error) {
    console.error('❌ SQLファイルの読み込みエラー:', error);
    console.log('supabase/migrations/001_initial_schema.sql を確認してください');
  }

  console.log('');
  console.log('5️⃣ 接続テスト');
  console.log('─'.repeat(40));
  console.log('セットアップ完了後、以下のコマンドで接続をテスト:');
  console.log('npx tsx scripts/test-supabase.ts');
  console.log('');

  console.log('6️⃣ 外部APIキーの設定');
  console.log('─'.repeat(40));
  console.log('以下のAPIキーも.env.localに設定してください:');
  console.log('');
  console.log('Guardian API:');
  console.log('  https://open-platform.theguardian.com/access/');
  console.log('  → GUARDIAN_API_KEY');
  console.log('');
  console.log('New York Times API:');
  console.log('  https://developer.nytimes.com/');
  console.log('  → NYT_API_KEY');
  console.log('');
  console.log('OpenAI API (またはAnthropic):');
  console.log('  https://platform.openai.com/');
  console.log('  → OPENAI_API_KEY');
  console.log('');

  console.log('═'.repeat(50));
  console.log('✨ セットアップ手順は以上です');
  console.log('');
  console.log('詳細なドキュメント:');
  console.log('- 実装計画: docs/implementation/README.md');
  console.log('- Phase 1詳細: docs/implementation/phase-1-foundation.md');
};

// メイン実行
setupInstructions();