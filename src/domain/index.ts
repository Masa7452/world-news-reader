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

// NewsAPIアダプタのエクスポート
export {
  normalizeNewsApiArticle,
  normalizeNewsApiResponse,
  detectNewsApiGenre,
  type NewsApiSource,
  type NewsApiArticle,
  type NewsApiArticlesResponse,
  type NewsApiErrorResponse,
  type NewsApiResponse,
} from './newsapi';
