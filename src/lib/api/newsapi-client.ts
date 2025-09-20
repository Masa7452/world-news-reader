import { httpClient } from '../http-client';
import { normalizeNewsApiResponse } from '../../domain/newsapi';
import type { NewsApiResponse } from '../../domain/newsapi';
import type { SourceItem } from '../../domain/types';

type TopHeadlinesOptions = {
  country?: string;
  category?: string;
  sources?: readonly string[];
  q?: string;
  language?: string;
  pageSize?: number;
  pages?: number;
};

type EverythingOptions = {
  q?: string;
  qInTitle?: string;
  sources?: readonly string[];
  domains?: readonly string[];
  excludeDomains?: readonly string[];
  from?: string;
  to?: string;
  language?: string;
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
  searchIn?: readonly ('title' | 'description' | 'content')[];
  pageSize?: number;
  pages?: number;
};

export class NewsApiClient {
  private readonly baseUrl = 'https://newsapi.org/v2';
  private readonly apiKey = process.env.NEWS_API_KEY!;
  private readonly maxPageSize = 100;
  private readonly defaultDelay = 1000; // 1秒

  async fetchTopHeadlines(options: TopHeadlinesOptions = {}): Promise<readonly SourceItem[]> {
    const pageSize = this.resolvePageSize(options.pageSize);
    const pages = options.pages ?? 1;

    return this.fetchPagedArticles('top-headlines', pageSize, pages, (page) => {
      const params = new URLSearchParams();
      this.applyCommonHeadlineParams(params, options);
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      return params;
    });
  }

  async fetchEverything(options: EverythingOptions): Promise<readonly SourceItem[]> {
    const pageSize = this.resolvePageSize(options.pageSize);
    const pages = options.pages ?? 1;

    return this.fetchPagedArticles('everything', pageSize, pages, (page) => {
      const params = new URLSearchParams();
      this.applyCommonEverythingParams(params, options);
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      return params;
    });
  }

  private async fetchPagedArticles(
    endpoint: string,
    pageSize: number,
    pages: number,
    buildParams: (page: number) => URLSearchParams
  ): Promise<readonly SourceItem[]> {
    const items: SourceItem[] = [];

    for (let page = 1; page <= pages; page++) {
      const params = buildParams(page);
      const url = `${this.baseUrl}/${endpoint}?${params.toString()}`;
      const response = await httpClient.fetch<NewsApiResponse>(url, {
        headers: {
          'X-Api-Key': this.apiKey,
        }
      });

      const normalized = normalizeNewsApiResponse(response);
      if (normalized.length === 0) {
        break;
      }

      items.push(...normalized);

      if (normalized.length < pageSize) {
        break;
      }

      if (page < pages) {
        await this.sleep(this.defaultDelay);
      }
    }

    return items;
  }

  private applyCommonHeadlineParams(params: URLSearchParams, options: TopHeadlinesOptions): void {
    if (options.country) params.set('country', options.country);
    if (options.category) params.set('category', options.category);
    if (options.sources?.length) params.set('sources', options.sources.join(','));
    if (options.q) params.set('q', options.q);
    if (options.language) params.set('language', options.language);
  }

  private applyCommonEverythingParams(params: URLSearchParams, options: EverythingOptions): void {
    if (options.q) params.set('q', options.q);
    if (options.qInTitle) params.set('qInTitle', options.qInTitle);
    if (options.sources?.length) params.set('sources', options.sources.join(','));
    if (options.domains?.length) params.set('domains', options.domains.join(','));
    if (options.excludeDomains?.length) params.set('excludeDomains', options.excludeDomains.join(','));
    if (options.from) params.set('from', options.from);
    if (options.to) params.set('to', options.to);
    if (options.language) params.set('language', options.language);
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.searchIn?.length) params.set('searchIn', options.searchIn.join(','));
  }

  private resolvePageSize(pageSize?: number): number {
    if (!pageSize) return this.maxPageSize;
    return Math.min(Math.max(pageSize, 1), this.maxPageSize);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
