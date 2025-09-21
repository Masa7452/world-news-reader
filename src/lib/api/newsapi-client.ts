import { httpClient } from '../http-client';
import { normalizeNewsApiResponse } from '../../domain/newsapi';
import type { NewsApiResponse } from '../../domain/newsapi';
import type { SourceItem } from '../../domain/types';

type TopHeadlinesOptions = {
  locale?: string;
  language?: string;
  categories?: readonly string[];
  sources?: readonly string[];
  not_sources?: readonly string[];
  limit?: number;
  pages?: number;
};

type LatestOptions = {
  countries?: readonly string[];
  language?: string;
  sources?: readonly string[];
  not_sources?: readonly string[];
  categories?: readonly string[];
  search?: string;
  published_after?: string;
  published_before?: string;
  limit?: number;
  pages?: number;
};

type AllOptions = {
  search?: string;
  search_fields?: readonly ('title' | 'description' | 'snippet')[];
  locale?: string;
  language?: string;
  categories?: readonly string[];
  sources?: readonly string[];
  not_sources?: readonly string[];
  published_after?: string;
  published_before?: string;
  sort?: 'published_desc' | 'published_asc' | 'relevance';
  limit?: number;
  pages?: number;
};

export class NewsApiClient {
  private readonly baseUrl = 'https://api.thenewsapi.com/v1';
  private readonly apiToken = process.env.NEWS_API_KEY!;
  private readonly maxLimit = Number.parseInt(process.env.NEWS_TOP_LIMIT_MAX ?? '25', 10);
  private readonly defaultDelay = 1000; // 1秒

  async fetchTopHeadlines(options: TopHeadlinesOptions = {}): Promise<readonly SourceItem[]> {
    const limit = this.resolveLimit(options.limit);
    const pages = options.pages ?? 1;

    return this.fetchPagedArticles('news/top', limit, pages, (page) => {
      const params = new URLSearchParams();
      params.set('api_token', this.apiToken);
      this.applyTopParams(params, options);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      return params;
    });
  }

  async fetchLatest(options: LatestOptions = {}): Promise<readonly SourceItem[]> {
    const limit = this.resolveLimit(options.limit);
    const pages = options.pages ?? 1;

    return this.fetchPagedArticles('news/latest', limit, pages, (page) => {
      const params = new URLSearchParams();
      params.set('api_token', this.apiToken);
      this.applyLatestParams(params, options);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      return params;
    });
  }

  async fetchAll(options: AllOptions = {}): Promise<readonly SourceItem[]> {
    const limit = this.resolveLimit(options.limit);
    const pages = options.pages ?? 1;

    return this.fetchPagedArticles('news/all', limit, pages, (page) => {
      const params = new URLSearchParams();
      params.set('api_token', this.apiToken);
      this.applyAllParams(params, options);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      return params;
    });
  }

  // 互換性のためのエイリアス
  async fetchEverything(options: AllOptions = {}): Promise<readonly SourceItem[]> {
    return this.fetchAll(options);
  }

  private async fetchPagedArticles(
    endpoint: string,
    limit: number,
    pages: number,
    buildParams: (page: number) => URLSearchParams
  ): Promise<readonly SourceItem[]> {
    const fetchSinglePage = async (page: number): Promise<{
      items: readonly SourceItem[];
      meta?: { found: number; returned: number; limit: number; page: number };
      shouldContinue: boolean;
    }> => {
      const params = buildParams(page);
      const url = `${this.baseUrl}/${endpoint}?${params.toString()}`;
      const response = await httpClient.fetch<NewsApiResponse>(url);

      // エラーレスポンスの処理
      if ('message' in response) {
        throw new Error(`TheNewsAPI Error: ${response.message}`);
      }

      const normalized = normalizeNewsApiResponse(response);
      const shouldContinue = response.meta.returned === limit && normalized.length > 0;

      return {
        items: normalized,
        meta: response.meta,
        shouldContinue
      };
    };

    // 最初のページを取得してメタ情報を確認
    const firstPage = await fetchSinglePage(1);
    
    // 必要ページ数を計算（無料枠制限: 最大100件）
    const maxItems = Math.min(firstPage.meta?.found ?? 100, 100);
    const actualPages = Math.min(pages, Math.ceil(maxItems / limit));
    
    if (actualPages === 1 || !firstPage.shouldContinue) {
      return firstPage.items;
    }

    // 残りのページを順次取得（早期終了制御のためfor文を使用）
    const allItems: SourceItem[] = [...firstPage.items];
    
    for (let page = 2; page <= actualPages; page++) {
      // 無料枠制限チェック
      if (allItems.length >= 100) {
        break;
      }
      
      await this.sleep(this.defaultDelay);
      const pageResult = await fetchSinglePage(page);
      
      allItems.push(...pageResult.items);
      
      // データが終了した場合は早期終了
      if (!pageResult.shouldContinue) {
        break;
      }
    }

    // 無料枠制限: 最大100件まで
    return allItems.slice(0, 100);
  }

  private applyTopParams(params: URLSearchParams, options: TopHeadlinesOptions): void {
    if (options.locale) params.set('locale', options.locale);
    if (options.language) params.set('language', options.language);
    if (options.categories?.length) params.set('categories', options.categories.join(','));
    if (options.sources?.length) params.set('sources', options.sources.join(','));
    if (options.not_sources?.length) params.set('not_sources', options.not_sources.join(','));
  }

  private applyLatestParams(params: URLSearchParams, options: LatestOptions): void {
    if (options.countries?.length) params.set('countries', options.countries.join(','));
    if (options.language) params.set('language', options.language);
    if (options.sources?.length) params.set('sources', options.sources.join(','));
    if (options.not_sources?.length) params.set('not_sources', options.not_sources.join(','));
    if (options.categories?.length) params.set('categories', options.categories.join(','));
    if (options.search) params.set('search', options.search);
    if (options.published_after) params.set('published_after', options.published_after);
    if (options.published_before) params.set('published_before', options.published_before);
  }

  private applyAllParams(params: URLSearchParams, options: AllOptions): void {
    if (options.search) params.set('search', options.search);
    if (options.search_fields?.length) params.set('search_fields', options.search_fields.join(','));
    if (options.locale) params.set('locale', options.locale);
    if (options.language) params.set('language', options.language);
    if (options.categories?.length) params.set('categories', options.categories.join(','));
    if (options.sources?.length) params.set('sources', options.sources.join(','));
    if (options.not_sources?.length) params.set('not_sources', options.not_sources.join(','));
    if (options.published_after) params.set('published_after', options.published_after);
    if (options.published_before) params.set('published_before', options.published_before);
    if (options.sort) params.set('sort', options.sort);
  }

  private resolveLimit(limit?: number): number {
    if (!limit) return this.maxLimit;
    return Math.min(Math.max(limit, 1), this.maxLimit);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
