#!/usr/bin/env node

/**
 * NYT API テストスクリプト
 * APIからどのようなデータが取得できるか確認
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 環境変数を読み込み
dotenv.config({ 
  path: path.resolve(process.cwd(), '.env.local'),
  override: true
});

const testNytApi = async () => {
  const apiKey = process.env.NYT_API_KEY;
  
  if (!apiKey) {
    console.error('❌ NYT_API_KEYが設定されていません');
    process.exit(1);
  }
  
  console.log('🔍 NYT APIテストを開始...');
  console.log('   API Key:', apiKey.substring(0, 8) + '...');
  
  // Article Search APIのテスト（ニュース記事のみを取得）
  const beginDate = '20240101';  // YYYYMMDD形式
  const endDate = '20240131';    // YYYYMMDD形式
  const fq = 'document_type:("article")';  // ニュース記事のみ
  const url = `https://api.nytimes.com/svc/search/v2/articlesearch.json?api-key=${apiKey}&begin_date=${beginDate}&end_date=${endDate}&fq=${encodeURIComponent(fq)}&sort=newest&page=0`;
  
  console.log('\n📡 Article Search APIをテスト中...');
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📡 レスポンスステータス:', response.status);
    console.log('📦 レスポンスデータ:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.status === 'OK') {
      console.log('✅ APIレスポンス成功');
      console.log(`   記事数: ${data.response?.docs?.length || 0}`);
      console.log(`   総ヒット数: ${data.response?.meta?.hits || 0}`);
      
      // 最初の記事のデータ構造を確認
      if (data.response?.docs?.length > 0) {
        const firstArticle = data.response.docs[0];
        console.log('\n📄 最初の記事のデータ:');
        console.log('   タイトル:', firstArticle.headline?.main);
        console.log('   URL:', firstArticle.web_url);
        console.log('   公開日:', firstArticle.pub_date);
        console.log('   要約:', firstArticle.abstract?.substring(0, 100) + '...');
        console.log('   リード文:', firstArticle.lead_paragraph?.substring(0, 100) + '...');
        console.log('   語数:', firstArticle.word_count);
        console.log('   セクション:', firstArticle.section_name);
        console.log('   署名:', firstArticle.byline?.original);
        console.log('   画像数:', firstArticle.multimedia?.length || 0);
        
        // 利用可能なフィールドを確認
        console.log('\n🔑 利用可能なフィールド:');
        console.log(Object.keys(firstArticle).join(', '));
        
        // サンプルデータを保存
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const sampleFile = path.join(dataDir, 'nyt-api-sample.json');
        fs.writeFileSync(sampleFile, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`\n💾 サンプルデータを保存: ${sampleFile}`);
      }
    } else {
      console.error('❌ APIエラー:', response.status, response.statusText);
      console.error('   レスポンス:', data);
    }
  } catch (error) {
    console.error('❌ リクエストエラー:', error);
  }
};

// 実行
testNytApi();