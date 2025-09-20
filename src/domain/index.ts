/**
 * ドメイン層のエクスポート管理
 */

// 型定義のエクスポート
export * from './types';

// Guardian APIアダプタのエクスポート
export {
  normalizeGuardianItem,
  normalizeGuardianResponse,
  extractGuardianPagination,
  detectGuardianGenre,
  type GuardianApiResponse,
  type GuardianArticle,
  type GuardianFields,
  type GuardianTag,
  type GuardianElement,
  type GuardianAsset,
} from './guardian';

// NYT APIアダプタのエクスポート
export {
  normalizeNYTSearchItem,
  normalizeNYTTopStory,
  normalizeNYTNewswireItem,
  normalizeNYTSearchResponse,
  normalizeNYTTopStoriesResponse,
  normalizeNYTNewswireResponse,
  detectNYTGenre,
  type NYTArticleSearchResponse,
  type NYTSearchArticle,
  type NYTTopStoriesResponse,
  type NYTTopStory,
  type NYTNewswireResponse,
  type NYTNewswireArticle,
  type NYTMultimedia,
  type NYTTopStoryMultimedia,
  type NYTKeyword,
} from './nyt';