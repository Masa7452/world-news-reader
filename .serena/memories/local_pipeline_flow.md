2025-09-21 時点でローカル Supabase 向けのパイプライン手順は以下の通りに集約された。
1) `pnpm fetch:local` で /news/top の記事を 20 件取得 (TARGET_ARTICLE_COUNT=5 に制限)
2) `pnpm pipeline:local` で最大 5 件の topic を OUTLINED→DRAFTED→VERIFIED→PUBLISHED まで自動処理
3) Supabase Studio で sources/topics/articles の状態を確認
4) `pnpm dev` で UI 表示を確認
README にも同内容が記載されており、.env.local / .env.prod の切り替えは dotenv CLI 経由の npm scripts を使う。