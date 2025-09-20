/**
 * ドメイン層のエクスポート管理
 */

// 型定義のエクスポート
export * from './types';

// TheNewsAPIアダプタのエクスポート
export {
  normalizeNewsApiArticle,
  normalizeNewsApiResponse,
  detectNewsApiGenre,
  type NewsApiArticle,
  type NewsApiMeta,
  type NewsApiArticlesResponse,
  type NewsApiErrorResponse,
  type NewsApiResponse,
} from './newsapi';
