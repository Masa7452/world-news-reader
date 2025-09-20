/**
 * New York Times API アダプタ
 * NYT各種APIのレスポンスを正規化
 */

import type { SourceItem, ImageInfo } from './types';

// ========================================
// NYT Article Search API レスポンス型
// ========================================

/** Article Search APIレスポンス */
export type NYTArticleSearchResponse = {
  status: string;
  copyright?: string;
  response: {
    docs: NYTSearchArticle[];
    meta: {
      hits: number;
      offset: number;
      time: number;
    };
  };
};

/** Article Search記事データ */
export type NYTSearchArticle = {
  web_url: string;                     // 記事URL
  snippet?: string;                    // スニペット
  lead_paragraph?: string;             // リード段落
  abstract?: string;                   // 要約
  print_page?: string;
  print_section?: string;
  source?: string;
  multimedia?: NYTMultimedia[];
  headline: {
    main: string;                      // メイン見出し
    kicker?: string;
    content_kicker?: string;
    print_headline?: string;
    name?: string;
    seo?: string;
    sub?: string;
  };
  keywords?: NYTKeyword[];
  pub_date: string;                    // 公開日（ISO8601）
  document_type?: string;
  news_desk?: string;                  // ニュースデスク
  section_name?: string;               // セクション名
  subsection_name?: string;            // サブセクション名
  byline?: {
    original?: string;                 // 著者名
    person?: Array<{
      firstname?: string;
      middlename?: string;
      lastname?: string;
      qualifier?: string;
      title?: string;
      role?: string;
      organization?: string;
      rank?: number;
    }>;
    organization?: string;
  };
  type_of_material?: string;           // 記事タイプ
  _id: string;                         // 記事ID
  word_count?: number;                 // 語数
  uri: string;                         // URI識別子
  slideshow_credits?: string;
};

/** NYTマルチメディア情報 */
export type NYTMultimedia = {
  rank?: number;
  subtype?: string;
  caption?: string;
  credit?: string;
  type: string;                        // "image", "video"など
  url: string;                         // 相対URLの場合がある
  height: number;
  width: number;
  legacy?: {
    xlarge?: string;
    xlargewidth?: number;
    xlargeheight?: number;
    thumbnail?: string;
    thumbnailwidth?: number;
    thumbnailheight?: number;
    widewidth?: number;
    wideheight?: number;
    wide?: string;
  };
  subType?: string;
  crop_name?: string;
};

/** NYTキーワード */
export type NYTKeyword = {
  name: string;
  value: string;
  rank: number;
  major?: string;
};

// ========================================
// NYT Top Stories API レスポンス型
// ========================================

/** Top Stories APIレスポンス */
export type NYTTopStoriesResponse = {
  status: string;
  copyright?: string;
  section?: string;
  last_updated?: string;
  num_results: number;
  results: NYTTopStory[];
};

/** Top Stories記事データ */
export type NYTTopStory = {
  section: string;
  subsection?: string;
  title: string;
  abstract: string;
  url: string;
  uri: string;                         // 安定識別子
  byline: string;
  item_type?: string;
  updated_date: string;
  created_date: string;
  published_date: string;
  material_type_facet?: string;
  kicker?: string;
  des_facet?: string[];                // Descriptive facet
  org_facet?: string[];                // Organization facet
  per_facet?: string[];                // Person facet
  geo_facet?: string[];                // Geographic facet
  multimedia?: NYTTopStoryMultimedia[];
  short_url?: string;
};

/** Top Storiesマルチメディア */
export type NYTTopStoryMultimedia = {
  url: string;
  format: string;                      // "Super Jumbo", "Large Thumbnail"など
  height: number;
  width: number;
  type: string;                        // "image"
  subtype: string;                     // "photo"
  caption?: string;
  copyright?: string;
};

// ========================================
// NYT Times Newswire API レスポンス型
// ========================================

/** Times Newswire APIレスポンス */
export type NYTNewswireResponse = {
  status: string;
  copyright?: string;
  num_results: number;
  results: NYTNewswireArticle[];
};

/** Newswire記事データ */
export type NYTNewswireArticle = {
  slug_name?: string;
  section: string;
  subsection?: string;
  title: string;
  abstract: string;
  url: string;
  uri: string;
  byline: string;
  item_type?: string;
  thumbnail_standard?: string;
  source: string;
  updated_date: string;
  created_date: string;
  published_date: string;
  first_published_date?: string;
  material_type_facet?: string;
  kicker?: string;
  subheadline?: string;
  des_facet?: string[];
  org_facet?: string[];
  per_facet?: string[];
  geo_facet?: string[];
  related_urls?: Array<{
    suggested_link_text?: string;
    url?: string;
  }>;
  multimedia?: NYTTopStoryMultimedia[];
};

// ========================================
// 正規化関数
// ========================================

/**
 * NYT Article Search記事を正規化
 */
export const normalizeNYTSearchItem = (item: NYTSearchArticle): SourceItem => {
  // 画像URLの補完
  const image = extractNYTSearchImage(item);
  
  // キーワードからタグを抽出
  const tags = item.keywords
    ?.filter(kw => kw.name === 'subject')
    ?.map(kw => kw.value) || [];

  return {
    provider: 'nyt',
    providerId: item.uri,
    url: item.web_url,
    title: item.headline.main,
    abstract: item.abstract || item.lead_paragraph || item.snippet,
    publishedAt: item.pub_date,
    section: item.section_name,
    subsection: item.subsection_name,
    byline: item.byline?.original,
    tags,
    type: item.type_of_material,
    wordCount: item.word_count,
    image,
    sourceName: 'The New York Times',
  };
};

/**
 * NYT Top Stories記事を正規化
 */
export const normalizeNYTTopStory = (item: NYTTopStory): SourceItem => {
  // 画像情報の抽出
  const image = extractNYTTopStoryImage(item);
  
  // ファセットからタグを作成
  const tags = [
    ...(item.des_facet || []),
    ...(item.org_facet || []),
  ].slice(0, 10); // 最大10個

  return {
    provider: 'nyt',
    providerId: item.uri,
    url: item.url,
    title: item.title,
    abstract: item.abstract,
    publishedAt: item.published_date,
    section: item.section,
    subsection: item.subsection,
    byline: item.byline,
    tags,
    type: item.item_type,
    wordCount: undefined, // Top Storiesには語数がない
    image,
    sourceName: 'The New York Times',
  };
};

/**
 * NYT Newswire記事を正規化
 */
export const normalizeNYTNewswireItem = (item: NYTNewswireArticle): SourceItem => {
  // Newswire記事の正規化（Top Storyと同じ構造）
  const image = extractNYTTopStoryImage(item);
  
  const tags = [
    ...(item.des_facet || []),
    ...(item.org_facet || []),
  ].slice(0, 10);

  return {
    provider: 'nyt',
    providerId: item.uri,
    url: item.url,
    title: item.title,
    abstract: item.abstract,
    publishedAt: item.published_date,
    section: item.section,
    subsection: item.subsection,
    byline: item.byline,
    tags,
    type: item.item_type,
    wordCount: undefined,
    image,
    sourceName: 'The New York Times',
  };
};

/**
 * Article Search記事から画像を抽出
 */
const extractNYTSearchImage = (item: NYTSearchArticle): ImageInfo | undefined => {
  if (!item.multimedia?.length) return undefined;

  // 最大サイズの画像を選択
  const image = item.multimedia
    .filter(m => m.type === 'image')
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];

  if (!image) return undefined;

  // URLが相対パスの場合は絶対パスに変換
  const url = image.url.startsWith('http') 
    ? image.url 
    : `https://www.nytimes.com/${image.url}`;

  return {
    url,
    caption: image.caption,
    credit: image.credit,
  };
};

/**
 * Top Stories/Newswire記事から画像を抽出
 */
const extractNYTTopStoryImage = (item: NYTTopStory | NYTNewswireArticle): ImageInfo | undefined => {
  if (!item.multimedia?.length) return undefined;

  // "Super Jumbo"または最大サイズを選択
  const image = item.multimedia.find(m => m.format === 'Super Jumbo') 
    || item.multimedia[0];

  if (!image) return undefined;

  return {
    url: image.url,
    caption: image.caption,
    credit: image.copyright,
  };
};

/**
 * NYT Article Searchレスポンス全体を正規化
 */
export const normalizeNYTSearchResponse = (
  response: NYTArticleSearchResponse
): readonly SourceItem[] => {
  if (response.status !== 'OK') {
    console.warn('NYT API returned non-OK status:', response.status);
    return [];
  }

  return response.response.docs.map(normalizeNYTSearchItem);
};

/**
 * NYT Top Storiesレスポンス全体を正規化
 */
export const normalizeNYTTopStoriesResponse = (
  response: NYTTopStoriesResponse
): readonly SourceItem[] => {
  if (response.status !== 'OK') {
    console.warn('NYT API returned non-OK status:', response.status);
    return [];
  }

  return response.results.map(normalizeNYTTopStory);
};

/**
 * NYT Newswireレスポンス全体を正規化
 */
export const normalizeNYTNewswireResponse = (
  response: NYTNewswireResponse
): readonly SourceItem[] => {
  if (response.status !== 'OK') {
    console.warn('NYT API returned non-OK status:', response.status);
    return [];
  }

  return response.results.map(normalizeNYTNewswireItem);
};

/**
 * NYT記事のジャンルを判定
 */
export const detectNYTGenre = (item: SourceItem): string => {
  const section = item.section?.toLowerCase() || '';
  const tags = item.tags?.map(t => t.toLowerCase()) || [];
  
  // セクションベースの判定
  if (section.includes('technology')) return 'technology';
  if (section.includes('business')) return 'business';
  if (section.includes('science')) return 'science';
  if (section.includes('health')) return 'health';
  if (section.includes('arts') || section.includes('culture')) return 'culture';
  if (section.includes('style') || section.includes('fashion')) return 'lifestyle';
  if (section.includes('sports')) return 'news'; // スポーツはニュースとして扱う
  
  // タグベースの判定
  const tagString = tags.join(' ');
  if (tagString.includes('artificial intelligence') || tagString.includes('computers')) return 'technology';
  if (tagString.includes('medicine') || tagString.includes('health')) return 'health';
  if (tagString.includes('business') || tagString.includes('economics')) return 'business';
  
  // デフォルトはニュース
  return 'news';
};