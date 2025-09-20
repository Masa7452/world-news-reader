/**
 * ドメイン層のエクスポート管理
 */

// 型定義のエクスポート
export * from './types';

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
