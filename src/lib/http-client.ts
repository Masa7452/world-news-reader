/**
 * HTTPクライアント with 指数バックオフ
 * レート制限やネットワークエラーに対する再試行ロジック実装
 */

export class HttpClient {
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1秒

  async fetch<T extends object>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    const attempts = Array.from({ length: this.maxRetries + 1 }, (_, i) => i);
    
    const tryFetch = async (): Promise<T | { retry: true; error?: Error }> => {
      try {
        const response = await fetch(url, options);

        if (response.status === 429) {
          // レート制限
          return { retry: true };
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json() as T;
      } catch (error) {
        return { retry: true, error: error as Error };
      }
    };

    const results = await attempts.reduce(
      async (prevPromise, attempt) => {
        const prev = await prevPromise;
        if (prev.success) return prev;

        const result = await tryFetch();
        
        if ('retry' in result && attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          return { success: false, lastError: result.error };
        }
        
        if ('retry' in result) {
          return { success: false, lastError: result.error };
        }
        
        return { success: true, data: result };
      },
      Promise.resolve<{ success: boolean; data?: T; lastError?: Error }>({ success: false })
    );

    if (results.success && results.data) {
      return results.data;
    }
    
    throw results.lastError || new Error('Unknown error');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const httpClient = new HttpClient();