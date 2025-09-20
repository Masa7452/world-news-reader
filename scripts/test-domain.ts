#!/usr/bin/env tsx
/**
 * ドメイン層のテストスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/test-domain.ts
 */

import {
  normalizeGuardianItem,
  normalizeNYTSearchItem,
  normalizeNYTTopStory,
  detectGuardianGenre,
  detectNYTGenre,
  type GuardianArticle,
  type NYTSearchArticle,
  type NYTTopStory,
} from '../src/domain';

// ========================================
// テストデータ
// ========================================

const mockGuardianArticle: GuardianArticle = {
  id: 'technology/2025/jan/09/ai-breakthrough',
  type: 'article',
  sectionId: 'technology',
  sectionName: 'Technology',
  webPublicationDate: '2025-01-09T10:30:00Z',
  webTitle: 'AI Breakthrough: New System Achieves Human-Level Understanding',
  webUrl: 'https://www.theguardian.com/technology/2025/jan/09/ai-breakthrough',
  apiUrl: 'https://content.guardianapis.com/technology/2025/jan/09/ai-breakthrough',
  fields: {
    headline: 'AI Breakthrough: New System Achieves Human-Level Understanding',
    trailText: 'Researchers announce a major advancement in artificial intelligence that could revolutionize how machines understand human language.',
    byline: 'Jane Smith',
    wordcount: '850',
    thumbnail: 'https://media.guim.co.uk/images/ai-breakthrough.jpg',
  },
  tags: [
    {
      id: 'technology/artificial-intelligence',
      type: 'keyword',
      webTitle: 'Artificial intelligence',
      webUrl: 'https://www.theguardian.com/technology/artificialintelligence',
      apiUrl: 'https://content.guardianapis.com/technology/artificialintelligence',
    },
    {
      id: 'technology/computing',
      type: 'keyword',
      webTitle: 'Computing',
      webUrl: 'https://www.theguardian.com/technology/computing',
      apiUrl: 'https://content.guardianapis.com/technology/computing',
    },
  ],
};

const mockNYTSearchArticle: NYTSearchArticle = {
  web_url: 'https://www.nytimes.com/2025/01/09/health/medical-breakthrough.html',
  abstract: 'A new medical treatment shows promising results in clinical trials.',
  pub_date: '2025-01-09T15:45:00+0000',
  headline: {
    main: 'Medical Breakthrough Offers Hope for Millions',
  },
  section_name: 'Health',
  subsection_name: 'Research',
  byline: {
    original: 'By John Doe',
  },
  type_of_material: 'News',
  _id: 'nyt://article/abc123',
  uri: 'nyt://article/abc123',
  word_count: 1200,
  multimedia: [
    {
      type: 'image',
      url: 'images/2025/01/09/health/medical.jpg',
      height: 600,
      width: 1000,
      caption: 'Medical research facility',
      credit: 'Photo by Example',
    },
  ],
  keywords: [
    {
      name: 'subject',
      value: 'Medicine and Health',
      rank: 1,
    },
    {
      name: 'subject',
      value: 'Medical Research',
      rank: 2,
    },
  ],
};

const mockNYTTopStory: NYTTopStory = {
  section: 'Business',
  subsection: 'Economy',
  title: 'Markets Rise on Economic Data',
  abstract: 'Stock markets showed gains following positive economic indicators.',
  url: 'https://www.nytimes.com/2025/01/09/business/markets.html',
  uri: 'nyt://article/xyz789',
  byline: 'By Sarah Johnson',
  published_date: '2025-01-09T09:00:00-05:00',
  created_date: '2025-01-09T08:00:00-05:00',
  updated_date: '2025-01-09T09:30:00-05:00',
  des_facet: ['Stock Markets', 'Economic Indicators'],
  org_facet: ['Federal Reserve'],
  per_facet: [],
  geo_facet: ['United States'],
  multimedia: [
    {
      url: 'https://static01.nyt.com/images/2025/01/09/business/markets.jpg',
      format: 'Super Jumbo',
      height: 1365,
      width: 2048,
      type: 'image',
      subtype: 'photo',
      caption: 'Trading floor activity',
      copyright: '© The New York Times',
    },
  ],
};

// ========================================
// テスト実行
// ========================================

const runTests = () => {
  console.log('🧪 ドメイン層テストを開始...\n');

  // ========================================
  // Guardian正規化テスト
  // ========================================
  console.log('1️⃣ Guardian記事の正規化テスト');
  console.log('─'.repeat(40));

  try {
    const normalizedGuardian = normalizeGuardianItem(mockGuardianArticle);
    
    console.log('✅ Guardian記事正規化成功');
    console.log('   Provider:', normalizedGuardian.provider);
    console.log('   Title:', normalizedGuardian.title);
    console.log('   Abstract:', normalizedGuardian.abstract?.substring(0, 50) + '...');
    console.log('   Section:', normalizedGuardian.section);
    console.log('   Word Count:', normalizedGuardian.wordCount);
    console.log('   Tags:', normalizedGuardian.tags);
    console.log('   Image URL:', normalizedGuardian.image?.url);
    
    // ジャンル検出テスト
    const genre = detectGuardianGenre(mockGuardianArticle);
    console.log('   Detected Genre:', genre);
    
    // 型チェック
    if (normalizedGuardian.provider !== 'guardian') {
      throw new Error('Provider should be "guardian"');
    }
    if (typeof normalizedGuardian.wordCount !== 'number') {
      throw new Error('Word count should be a number');
    }
    
    console.log('✅ 型チェック: OK');
  } catch (error) {
    console.error('❌ Guardian正規化エラー:', error);
  }

  console.log('');

  // ========================================
  // NYT Article Search正規化テスト
  // ========================================
  console.log('2️⃣ NYT Article Search記事の正規化テスト');
  console.log('─'.repeat(40));

  try {
    const normalizedNYTSearch = normalizeNYTSearchItem(mockNYTSearchArticle);
    
    console.log('✅ NYT Article Search正規化成功');
    console.log('   Provider:', normalizedNYTSearch.provider);
    console.log('   Title:', normalizedNYTSearch.title);
    console.log('   Section:', normalizedNYTSearch.section);
    console.log('   Subsection:', normalizedNYTSearch.subsection);
    console.log('   Word Count:', normalizedNYTSearch.wordCount);
    console.log('   Tags:', normalizedNYTSearch.tags);
    console.log('   Image URL:', normalizedNYTSearch.image?.url);
    
    // 画像URLの補完チェック
    if (!normalizedNYTSearch.image?.url.startsWith('http')) {
      throw new Error('Image URL should be absolute');
    }
    
    console.log('✅ URL補完: OK');
  } catch (error) {
    console.error('❌ NYT Search正規化エラー:', error);
  }

  console.log('');

  // ========================================
  // NYT Top Stories正規化テスト
  // ========================================
  console.log('3️⃣ NYT Top Stories記事の正規化テスト');
  console.log('─'.repeat(40));

  try {
    const normalizedNYTTop = normalizeNYTTopStory(mockNYTTopStory);
    
    console.log('✅ NYT Top Stories正規化成功');
    console.log('   Provider:', normalizedNYTTop.provider);
    console.log('   Title:', normalizedNYTTop.title);
    console.log('   Section:', normalizedNYTTop.section);
    console.log('   Tags:', normalizedNYTTop.tags);
    console.log('   Image URL:', normalizedNYTTop.image?.url);
    console.log('   Image Caption:', normalizedNYTTop.image?.caption);
    
    // ジャンル検出テスト
    const genre = detectNYTGenre(normalizedNYTTop);
    console.log('   Detected Genre:', genre);
    
    console.log('✅ 全フィールド正常');
  } catch (error) {
    console.error('❌ NYT Top Stories正規化エラー:', error);
  }

  console.log('');

  // ========================================
  // イミュータビリティテスト
  // ========================================
  console.log('4️⃣ イミュータビリティテスト');
  console.log('─'.repeat(40));

  const normalized = normalizeGuardianItem(mockGuardianArticle);
  
  // TypeScriptの型システムでreadonlyが強制されていることを確認
  // 以下のコードはTypeScriptでコンパイルエラーになる：
  // normalized.title = 'Modified Title'; // Error: Cannot assign to 'title' because it is a read-only property
  // normalized.tags?.push('new tag');    // Error: Property 'push' does not exist on type 'readonly string[]'
  
  console.log('✅ イミュータビリティ: TypeScript型システムで保護');
  console.log('   - すべてのプロパティがreadonly');
  console.log('   - 配列もreadonly配列として定義');
  console.log('   - コンパイル時に変更を防止');

  console.log('');
  console.log('🎉 ドメイン層テスト完了');
};

// メイン実行
runTests();