/**
 * TheNewsAPI アダプタ
 * TheNewsAPIの記事レスポンスを正規化
 * 
 * @see https://www.thenewsapi.com/documentation
 */

import type { SourceItem, ImageInfo } from './types';

// ========================================
// TheNewsAPI レスポンス型定義
// ========================================

/** TheNewsAPIの記事データ */
export type NewsApiArticle = {
  uuid: string;
  title: string;
  description: string;
  snippet: string;
  url: string;
  image_url?: string | null;
  language: string;
  published_at: string;
  source: string;
  categories: readonly string[];
  locale: string;
  relevance_score?: number;
};

/** TheNewsAPIのメタ情報 */
export type NewsApiMeta = {
  found: number;
  returned: number;
  limit: number;
  page: number;
};

/** 記事リストを返却する成功レスポンス */
export type NewsApiArticlesResponse = {
  data: readonly NewsApiArticle[];
  meta: NewsApiMeta;
};

/** エラー時のレスポンス */
export type NewsApiErrorResponse = {
  message: string;
};

/** TheNewsAPIのレスポンス全体型 */
export type NewsApiResponse = NewsApiArticlesResponse | NewsApiErrorResponse;

// ========================================
// 正規化関数
// ========================================

/**
 * TheNewsAPIの記事を正規化形式に変換
 * @param article TheNewsAPI記事データ
 * @returns 正規化された記事データ
 */
export const normalizeNewsApiArticle = (article: NewsApiArticle): SourceItem => {
  const image = extractNewsApiImage(article);
  const tags = buildNewsApiTags(article);

  return {
    provider: 'newsapi',
    providerId: article.uuid,  // UUIDを安定識別子として使用
    url: article.url,
    title: article.title,
    abstract: article.description,
    publishedAt: article.published_at,
    section: article.source,
    subsection: undefined,
    byline: undefined,  // TheNewsAPIでは著者情報が提供されない
    tags,
    type: undefined,
    wordCount: undefined,  // TheNewsAPIでは提供されない
    image,
    body: undefined,       // TheNewsAPIでは本文は提供されない
    bodyText: article.snippet,  // snippetを本文として使用
    sourceName: 'NewsAPI',
  };
};

/**
 * TheNewsAPIレスポンス全体を正規化
 */
export const normalizeNewsApiResponse = (
  response: NewsApiResponse
): readonly SourceItem[] => {
  // エラーレスポンスの場合
  if ('message' in response) {
    console.warn('TheNewsAPI returned an error response:', response.message);
    return [];
  }

  return response.data.map(normalizeNewsApiArticle);
};

/**
 * TheNewsAPI記事のジャンルを推定
 */
export const detectNewsApiGenre = (article: NewsApiArticle): string => {
  // TheNewsAPIのcategoriesを優先
  const categories = article.categories.map(cat => cat.toLowerCase());
  
  if (categories.includes('technology') || categories.includes('tech')) {
    return 'technology';
  }
  if (categories.includes('business')) {
    return 'business';
  }
  if (categories.includes('science')) {
    return 'science';
  }
  if (categories.includes('health')) {
    return 'health';
  }
  if (categories.includes('entertainment') || categories.includes('culture')) {
    return 'culture';
  }
  
  // カテゴリが不明な場合はテキスト解析
  const text = `${article.title} ${article.description} ${article.snippet}`.toLowerCase();
  
  if (text.includes('technology') || text.includes('ai') || text.includes('software')) {
    return 'technology';
  }
  if (text.includes('business') || text.includes('finance') || text.includes('market')) {
    return 'business';
  }
  if (text.includes('science') || text.includes('research') || text.includes('climate')) {
    return 'science';
  }
  if (text.includes('health') || text.includes('medical') || text.includes('wellness')) {
    return 'health';
  }
  if (text.includes('culture') || text.includes('art') || text.includes('music') || text.includes('entertainment')) {
    return 'culture';
  }
  if (text.includes('lifestyle') || text.includes('travel') || text.includes('fashion') || text.includes('food')) {
    return 'lifestyle';
  }

  return 'news';
};

// ========================================
// ヘルパー関数
// ========================================

/**
 * ソース/カテゴリ情報からタグを作成
 */
const buildNewsApiTags = (article: NewsApiArticle): readonly string[] => {
  const rawTags = [
    article.source,
    article.locale,
    ...article.categories,
  ].filter((value): value is string => Boolean(value));

  const uniqueTags = Array.from(new Set(rawTags));
  return uniqueTags;
};

/**
 * 画像情報を抽出
 */
const extractNewsApiImage = (article: NewsApiArticle): ImageInfo | undefined => {
  if (!article.image_url) {
    return undefined;
  }

  return {
    url: article.image_url,
  };
};
