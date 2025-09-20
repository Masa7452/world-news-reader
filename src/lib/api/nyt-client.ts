import { httpClient } from '../http-client';
import { normalizeNYTSearchResponse, normalizeNYTTopStoriesResponse } from '../../domain/nyt';
import { formatNYTDate } from '../date-utils';
import type { SourceItem } from '../../domain/types';

export class NYTClient {
  private readonly baseUrl = 'https://api.nytimes.com/svc';
  private readonly apiKey = process.env.NYT_API_KEY!;

  async fetchArticleSearch(
    beginDate: Date,
    endDate: Date,
    newsDesks?: string[]
  ): Promise<readonly SourceItem[]> {
    const maxPages = 10; // APIの制限
    
    const fetchPage = async (page: number): Promise<SourceItem[]> => {
      const params = new URLSearchParams({
        'api-key': this.apiKey,
        'begin_date': formatNYTDate(beginDate),
        'end_date': formatNYTDate(endDate),
        'sort': 'newest',
        'page': page.toString(),
      });

      if (newsDesks?.length) {
        const fq = `news_desk:(${newsDesks.map(d => `"${d}"`).join(' ')})`;
        params.append('fq', fq);
      }

      const url = `${this.baseUrl}/search/v2/articlesearch.json?${params}`;
      // TODO: NYT APIレスポンスの型定義を追加
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await httpClient.fetch<any>(url);
      
      return [...normalizeNYTSearchResponse(response)];
    };

    // 再帰的にページを取得（空の結果が返るまで）
    const fetchAllPages = async (page: number, accumulated: SourceItem[]): Promise<SourceItem[]> => {
      if (page >= maxPages) return accumulated;
      
      const items = await fetchPage(page);
      if (items.length === 0) return accumulated;
      
      // レート制限対策（NYTは厳しい）
      await this.sleep(2000);
      
      return fetchAllPages(page + 1, [...accumulated, ...items]);
    };

    return fetchAllPages(0, []);
  }

  async fetchTopStories(section: string = 'home'): Promise<readonly SourceItem[]> {
    const url = `${this.baseUrl}/topstories/v2/${section}.json?api-key=${this.apiKey}`;
    // TODO: NYT Top Stories APIレスポンスの型定義を追加
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await httpClient.fetch<any>(url);
    
    return normalizeNYTTopStoriesResponse(response);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}