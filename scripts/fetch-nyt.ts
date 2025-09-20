import { NYTClient } from '../src/lib/api/nyt-client';
import { createClient } from '@supabase/supabase-js';
import { subDays } from 'date-fns';
import type { SourceItem } from '../src/domain/types';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const NEWS_DESKS = [
  'Business',
  'Technology',
  'Science',
  'Health',
  'World',
  'Culture',
  'Sports',
];

const TOP_STORY_SECTIONS = [
  'home',
  'world',
  'technology',
  'business',
  'health',
  'science',
];

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const fetchNYTArticles = async () => {
  console.log('NYT記事の取得を開始...');
  
  const client = new NYTClient();
  const endDate = new Date();
  const beginDate = subDays(endDate, 1);
  
  try {
    // Article Searchから取得
    const searchItems = await client.fetchArticleSearch(
      beginDate,
      endDate,
      NEWS_DESKS
    );
    console.log(`Article Search: ${searchItems.length}件`);

    // Top Storiesから取得（レート制限を考慮して順次実行）
    const topStories = await TOP_STORY_SECTIONS.reduce(
      async (prevPromise, section) => {
        const prev = await prevPromise;
        const items = await client.fetchTopStories(section);
        await sleep(1000); // レート制限対策
        return [...prev, ...items];
      },
      Promise.resolve<SourceItem[]>([])
    );
    console.log(`Top Stories: ${topStories.length}件`);

    // 統合して保存
    const allItems = [...searchItems, ...topStories];
    const saved = await saveToSupabase(allItems);
    console.log(`${saved}件の新規記事を保存しました`);
    
  } catch (error) {
    console.error('取得エラー:', error);
    process.exit(1);
  }
};

const saveToSupabase = async (
  items: readonly SourceItem[]
): Promise<number> => {
  const results = await Promise.all(
    items.map(async (item) => {
      const { error } = await supabaseAdmin
        .from('sources')
        .upsert({
          provider: item.provider,
          provider_id: item.providerId,
          url: item.url,
          title: item.title,
          abstract: item.abstract,
          published_at: item.publishedAt,
          raw_data: item,
        }, {
          onConflict: 'provider,provider_id',
        });

      if (!error) {
        return { saved: true };
      } else if (error.code !== '23505') {
        console.error('保存エラー:', error);
        return { saved: false };
      }
      return { saved: false };
    })
  );

  return results.filter(r => r.saved).length;
};

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// 実行
fetchNYTArticles();