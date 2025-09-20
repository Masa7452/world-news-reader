#!/usr/bin/env node

/**
 * Guardian記事取得スクリプト
 * 使用方法: pnpm tsx scripts/fetch-guardian.ts
 * 環境変数:
 *   - USE_SUPABASE: 'false'に設定するとDB保存をスキップ（デフォルト: true）
 *   - NODE_ENV: 'development'の場合、JSONファイル出力を有効化
 */

import { GuardianClient } from '../src/lib/api/guardian-client';
import { saveSourceItems, getExistingSourceCount } from '../src/lib/database-utils';
import type { SourceItem } from '../src/domain/types';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 環境変数を読み込み
dotenv.config({ 
  path: path.resolve(process.cwd(), '.env.local'),
  override: true
});

const fetchGuardianArticles = async () => {
  console.log('📰 Guardian記事の取得を開始...');
  
  const client = new GuardianClient();
  
  // 日付範囲の設定（最新の1日分のデータを取得）
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const fromDate = yesterday.toISOString().split('T')[0];
  const toDate = today.toISOString().split('T')[0];
  
  console.log(`📅 取得期間: ${fromDate} から ${toDate}`)
  
  try {
    // 環境変数でモードを制御
    const USE_SUPABASE = process.env.USE_SUPABASE !== 'false';
    
    if (USE_SUPABASE) {
      // 既存データの件数をチェック
      const existingCount = await getExistingSourceCount('guardian', fromDate, toDate);
      console.log(`📊 既存レコード数: ${existingCount}件`);
    }
    
    // 記事を取得
    const items = await client.fetchRecent(fromDate, toDate);
    console.log(`✅ ${items.length}件の記事を取得しました`);

    // データベースに保存
    if (USE_SUPABASE) {
      console.log('💾 データベースへの保存を開始...');
      const saveResult = await saveSourceItems(items);
      console.log(`✅ 保存完了: 新規${saveResult.saved}件、スキップ${saveResult.skipped}件`);
      
      if (saveResult.errors.length > 0) {
        console.error(`⚠️  エラー: ${saveResult.errors.length}件`);
      }
    }

    // 開発環境でのみJSONファイルに保存
    if (process.env.NODE_ENV === 'development') {
      await saveToJSON(items);
    }
    
  } catch (error) {
    console.error('取得エラー:', error);
    process.exit(1);
  }
};

// 開発環境用: JSONファイルにデータを保存
const saveToJSON = async (items: readonly SourceItem[]): Promise<void> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `guardian-${timestamp}.json`;
  const filepath = path.join(process.cwd(), 'data', filename);
  
  // データディレクトリがなければ作成
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // データをJSON形式で保存
  const sampleData = {
    timestamp: new Date().toISOString(),
    source: 'guardian',
    count: items.length,
    items: items.slice(0, 10) // 開発環境では最初の10件のみ保存
  };
  
  fs.writeFileSync(filepath, JSON.stringify(sampleData, null, 2), 'utf-8');
  console.log(`📁 開発データを保存: ${filename}`);
};


// 実行
fetchGuardianArticles();