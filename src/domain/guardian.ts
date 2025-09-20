/**
 * Guardian API アダプタ
 * The Guardian Content APIのレスポンスを正規化
 */

import type { SourceItem, ImageInfo } from './types';

// ========================================
// Guardian API レスポンス型定義
// ========================================

/** Guardian APIのメインレスポンス */
export type GuardianApiResponse = {
  response: {
    status: string;
    userTier?: string;
    total?: number;
    startIndex?: number;
    pageSize?: number;
    currentPage?: number;
    pages?: number;
    orderBy?: string;
    results: GuardianArticle[];
  };
};

/** Guardian記事データ */
export type GuardianArticle = {
  id: string;                          // 例: "world/2025/sep/01/example-article-slug"
  type: string;                        // 例: "article", "liveblog", "gallery"
  sectionId: string;                   // 例: "world", "technology"
  sectionName: string;                 // 例: "World news", "Technology"
  webPublicationDate: string;          // ISO8601形式
  webTitle: string;                    // ウェブ用タイトル
  webUrl: string;                      // 記事URL
  apiUrl: string;                      // API URL
  isHosted?: boolean;
  pillarId?: string;
  pillarName?: string;
  fields?: GuardianFields;
  tags?: GuardianTag[];
  elements?: GuardianElement[];
};

/** Guardian記事の追加フィールド */
export type GuardianFields = {
  headline?: string;                   // 見出し
  standfirst?: string;                 // スタンドファースト
  trailText?: string;                  // 要約テキスト
  byline?: string;                     // 著者名
  bylineHtml?: string;
  main?: string;
  body?: string;                       // 本文HTML
  bodyText?: string;                   // 本文テキスト
  wordcount?: string;                  // 語数
  firstPublicationDate?: string;
  isInappropriateForSponsorship?: string;
  isPremoderated?: string;
  lastModified?: string;
  liveBloggingNow?: string;
  productionOffice?: string;
  publication?: string;
  shortUrl?: string;                   // 短縮URL
  shouldHideAdverts?: string;
  showInRelatedContent?: string;
  thumbnail?: string;                  // サムネイル画像URL
  legallySensitive?: string;
  lang?: string;
  isLive?: string;
  charCount?: string;
  shouldHideReaderRevenue?: string;
  showAffiliateLinks?: string;
  commentCloseDate?: string;
  commentable?: string;
};

/** Guardianタグが参照する追加メタデータ */
export type GuardianReference = {
  readonly id: string;
  readonly type: string;
  readonly path?: string;
  readonly apiUrl?: string;
  readonly webUrl?: string;
  readonly title?: string;
} & Readonly<Record<string, unknown>>;

/** Guardianタグ情報 */
export type GuardianTag = {
  id: string;
  type: string;                        // "keyword", "contributor", "series", "publication"など
  sectionId?: string;
  sectionName?: string;
  webTitle: string;
  webUrl: string;
  apiUrl: string;
  references?: GuardianReference[];
  description?: string;
  bio?: string;
  bylineImageUrl?: string;
  bylineLargeImageUrl?: string;
  podcast?: Record<string, unknown>;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  twitterHandle?: string;
};

/** Guardian要素（画像、動画など） */
export type GuardianElement = {
  id: string;
  relation: string;
  type: string;                        // "image", "video", "audio", "interactive"
  assets?: GuardianAsset[];
};

/** Guardianアセット（画像詳細など） */
export type GuardianAsset = {
  type: string;
  mimeType?: string;
  file?: string;
  typeData?: {
    aspectRatio?: string;
    width?: number;
    height?: number;
    isMaster?: string;
    caption?: string;
    credit?: string;
    photographer?: string;
    source?: string;
    altText?: string;
    mediaId?: string;
    mediaApiUri?: string;
    picdarUrn?: string;
    suppliersReference?: string;
    imageType?: string;
  };
};

// ========================================
// 正規化関数
// ========================================

/**
 * Guardian記事を正規化された形式に変換
 */
export const normalizeGuardianItem = (item: GuardianArticle): SourceItem => {
  // タグからキーワードを抽出
  const tags = item.tags
    ?.filter(tag => tag.type === 'keyword')
    ?.map(tag => tag.webTitle) || [];

  // 画像情報の抽出
  const image = extractGuardianImage(item);

  // 語数の変換（文字列から数値へ）
  const wordCount = item.fields?.wordcount 
    ? parseInt(item.fields.wordcount, 10) 
    : undefined;

  return {
    provider: 'guardian',
    providerId: item.id,
    url: item.webUrl,
    title: item.fields?.headline || item.webTitle,
    abstract: item.fields?.trailText || item.fields?.standfirst,
    publishedAt: item.webPublicationDate,
    section: item.sectionName,
    subsection: undefined, // Guardianにはサブセクションがない
    byline: item.fields?.byline,
    tags,
    type: item.type,
    wordCount: isNaN(wordCount || 0) ? undefined : wordCount,
    image,
    body: item.fields?.body,
    bodyText: item.fields?.bodyText,
    sourceName: 'The Guardian',
  };
};

/**
 * Guardian記事から画像情報を抽出
 */
const extractGuardianImage = (item: GuardianArticle): ImageInfo | undefined => {
  // fieldsのサムネイルを優先
  if (item.fields?.thumbnail) {
    return {
      url: item.fields.thumbnail,
    };
  }

  // elementsから画像を探す
  if (item.elements?.length) {
    const imageElement = item.elements.find(el => el.type === 'image');
    if (imageElement?.assets?.length) {
      const asset = imageElement.assets[0];
      if (asset.file) {
        return {
          url: asset.file,
          caption: asset.typeData?.caption,
          credit: asset.typeData?.credit,
        };
      }
    }
  }

  return undefined;
};

/**
 * Guardian APIレスポンス全体を正規化
 */
export const normalizeGuardianResponse = (
  response: GuardianApiResponse
): readonly SourceItem[] => {
  if (response.response.status !== 'ok') {
    console.warn('Guardian API returned non-ok status:', response.response.status);
    return [];
  }

  return response.response.results.map(normalizeGuardianItem);
};

/**
 * Guardian APIのページネーション情報を抽出
 */
export const extractGuardianPagination = (response: GuardianApiResponse) => ({
  currentPage: response.response.currentPage || 1,
  totalPages: response.response.pages || 1,
  totalCount: response.response.total || 0,
  pageSize: response.response.pageSize || 10,
});

/**
 * Guardian記事のカテゴリーを判定
 */
export const detectGuardianGenre = (item: GuardianArticle): string => {
  const section = item.sectionId?.toLowerCase() || '';
  const tags = item.tags?.map(t => t.id.toLowerCase()) || [];
  
  // セクションベースの判定
  if (section.includes('technology') || section.includes('tech')) return 'technology';
  if (section.includes('business') || section.includes('money')) return 'business';
  if (section.includes('science')) return 'science';
  if (section.includes('health') || section.includes('wellness')) return 'health';
  if (section.includes('culture') || section.includes('arts')) return 'culture';
  if (section.includes('lifestyle') || section.includes('life')) return 'lifestyle';
  if (section.includes('sport')) return 'news'; // スポーツはニュースとして扱う
  
  // タグベースの判定
  const tagString = tags.join(' ');
  if (tagString.includes('technology') || tagString.includes('ai')) return 'technology';
  if (tagString.includes('health') || tagString.includes('medical')) return 'health';
  if (tagString.includes('business') || tagString.includes('economy')) return 'business';
  
  // デフォルトはニュース
  return 'news';
};

