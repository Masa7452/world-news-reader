import { httpClient } from '../http-client';
import { normalizeGuardianResponse } from '../../domain/guardian';
import type { SourceItem } from '../../domain/types';

export class GuardianClient {
  private readonly baseUrl = 'https://content.guardianapis.com';
  private readonly apiKey = process.env.GUARDIAN_API_KEY!;
  private readonly pageSize = 50; // 最適なページサイズ

  async fetchRecent(
    fromDate: string,
    toDate: string,
    sections?: string[]
  ): Promise<readonly SourceItem[]> {
    const fetchPage = async (page: number): Promise<{ items: SourceItem[]; totalPages: number }> => {
      const params = new URLSearchParams({
        'api-key': this.apiKey,
        'from-date': fromDate,
        'to-date': toDate,
        'order-by': 'newest',
        'page': page.toString(),
        'page-size': this.pageSize.toString(),
        'show-fields': 'headline,trailText,byline,thumbnail,wordcount,shortUrl,lastModified,body,bodyText',
        'show-tags': 'keyword,contributor,series,publication',
      });

      if (sections?.length) {
        params.append('section', sections.join(','));
      }

      const url = `${this.baseUrl}/search?${params}`;
      // TODO: Guardian APIレスポンスの型定義を追加
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await httpClient.fetch<any>(url);
      
      return {
        items: [...normalizeGuardianResponse(response)],
        totalPages: response.response.pages || 1
      };
    };

    // 最初のページを取得して総ページ数を確認
    const firstPage = await fetchPage(1);
    const pagesToFetch = Math.min(firstPage.totalPages, 10);
    
    if (pagesToFetch === 1) {
      return firstPage.items;
    }

    // 残りのページを並列で取得（レート制限を考慮して順次実行）
    const remainingPages = Array.from({ length: pagesToFetch - 1 }, (_, i) => i + 2);
    
    const remainingResults = await remainingPages.reduce(
      async (prevPromise, page) => {
        const prev = await prevPromise;
        await this.sleep(1000); // レート制限対策
        const result = await fetchPage(page);
        return [...prev, ...result.items] as SourceItem[];
      },
      Promise.resolve<SourceItem[]>([])
    );

    return [...firstPage.items, ...remainingResults];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}