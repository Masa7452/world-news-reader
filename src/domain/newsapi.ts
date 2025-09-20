/**
 * NewsAPI.org アダプタ
 * NewsAPIの記事レスポンスを正規化
 * 
 * @see https://newsapi.org/docs/endpoints/top-headlines
 * @see https://newsapi.org/docs/endpoints/everything
 */

import type { SourceItem, ImageInfo } from './types';

// ========================================
// NewsAPI レスポンス型定義
// ========================================

/** NewsAPIが返却するソース情報 */
export type NewsApiSource = {
  id: string | null;
  name: string | null;
};

/** NewsAPIの記事データ */
export type NewsApiArticle = {
  source: NewsApiSource;
  author?: string | null;
  title: string;
  description?: string | null;
  url: string;
  urlToImage?: string | null;
  publishedAt: string;
  content?: string | null;
};

/** 記事リストを返却する成功レスポンス */
export type NewsApiArticlesResponse = {
  status: 'ok';
  totalResults: number;
  articles: NewsApiArticle[];
};

/** エラー時のレスポンス */
export type NewsApiErrorResponse = {
  status: 'error';
  code: string;
  message: string;
};

/** NewsAPIのレスポンス全体型 */
export type NewsApiResponse = NewsApiArticlesResponse | NewsApiErrorResponse;

// ========================================
// 正規化関数
// ========================================

/**
 * NewsAPIの記事を正規化形式に変換
 * @param article NewsAPI記事データ
 * @returns 正規化された記事データ
 */
export const normalizeNewsApiArticle = (article: NewsApiArticle): SourceItem => {
  const content = sanitizeNewsApiContent(article.content);
  const image = extractNewsApiImage(article);
  const tags = buildNewsApiTags(article);

  return {
    provider: 'newsapi',
    providerId: article.url,  // URLを安定識別子として使用
    url: article.url,
    title: article.title,
    abstract: article.description ?? content,
    publishedAt: article.publishedAt,
    section: article.source?.name ?? undefined,
    subsection: undefined,
    byline: article.author ?? undefined,
    tags,
    type: undefined,
    wordCount: undefined,  // NewsAPIでは提供されない
    image,
    body: undefined,       // 完全な本文は有償APIが必要
    bodyText: content,     // contentフィールドを暫定使用
    sourceName: 'NewsAPI',
  };
};

/**
 * NewsAPIレスポンス全体を正規化
 */
export const normalizeNewsApiResponse = (
  response: NewsApiResponse
): readonly SourceItem[] => {
  if (response.status !== 'ok') {
    console.warn('NewsAPI returned an error response:', response.code, response.message);
    return [];
  }

  return response.articles.map(normalizeNewsApiArticle);
};

/**
 * NewsAPI記事のジャンルを推定
 */
export const detectNewsApiGenre = (item: SourceItem): string => {
  const section = item.section?.toLowerCase() ?? '';
  const text = `${item.title} ${item.abstract ?? ''}`.toLowerCase();
  const tags = (item.tags ?? []).map(tag => tag.toLowerCase());
  const corpus = [section, text, tags.join(' ')].join(' ');

  if (corpus.includes('technology') || corpus.includes('tech') || corpus.includes('ai') || corpus.includes('software')) {
    return 'technology';
  }
  if (corpus.includes('business') || corpus.includes('finance') || corpus.includes('market') || corpus.includes('economy')) {
    return 'business';
  }
  if (corpus.includes('science') || corpus.includes('space') || corpus.includes('climate') || corpus.includes('research')) {
    return 'science';
  }
  if (corpus.includes('health') || corpus.includes('medical') || corpus.includes('covid') || corpus.includes('wellness')) {
    return 'health';
  }
  if (corpus.includes('culture') || corpus.includes('art') || corpus.includes('music') || corpus.includes('film') || corpus.includes('entertainment')) {
    return 'culture';
  }
  if (corpus.includes('lifestyle') || corpus.includes('travel') || corpus.includes('fashion') || corpus.includes('food')) {
    return 'lifestyle';
  }

  return 'news';
};

// ========================================
// ヘルパー関数
// ========================================

/**
 * NewsAPIのcontentフィールドを整形
 */
const sanitizeNewsApiContent = (content?: string | null): string | undefined => {
  if (!content) return undefined;
  return content
    .replace(/\s*\[\+\d+\s+chars\]?$/u, '')
    .trim() || undefined;
};

/**
 * ソース/著者情報からタグを作成
 */
const buildNewsApiTags = (article: NewsApiArticle): readonly string[] => {
  const rawTags = [
    article.source?.name ?? undefined,
    article.source?.id ?? undefined,
    article.author ?? undefined,
  ].filter((value): value is string => Boolean(value));

  const uniqueTags = Array.from(new Set(rawTags));
  return uniqueTags;
};

/**
 * 画像情報を抽出
 */
const extractNewsApiImage = (article: NewsApiArticle): ImageInfo | undefined => {
  if (!article.urlToImage) {
    return undefined;
  }

  return {
    url: article.urlToImage,
  };
};
