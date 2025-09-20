# Phase 1: 基盤構築（NewsAPI版）

NewsAPI 単独構成を前提に、データモデル・型定義・環境変数・初期 Supabase スキーマを整備する。ビルドが通り、最低限のドメイン層がテスト可能な状態をゴールとする。

## 1. 成果物サマリ
- `src/domain/types.ts` に Provider/SourceItem/Topic/Article などの正規化型を定義。
- `src/domain/newsapi.ts` を追加し、NewsAPI レスポンス → SourceItem 変換の骨格を実装（モックデータで確認）。
- `src/lib/api/newsapi-client.ts` の雛形（API キー読み込み・共通 HTTP クライアント連携）を作成。
- Supabase 初期マイグレーションを更新し、`sources.provider` の CHECK 制約を `'newsapi'` 固定にする。
- `.env.local` に `NEWS_API_KEY` / `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` など環境変数を登録。

## 2. 手順

### 2.1 型定義の整備
1. `src/domain/types.ts`
   - `Provider = 'newsapi'` とする。
   - `SourceItem.sourceName` を `'NewsAPI'` 固定で定義。
   - `body` / `bodyText` フィールドは任意扱い（NewsAPI の `content` 文字列を格納可能とする）。
2. `scripts/test-domain.ts`（存在する場合）を NewsAPI サンプルで更新し、型の想定を確認。

### 2.2 ドメインアダプタ
1. `src/domain/newsapi.ts`
   - `NewsApiArticle` / `NewsApiResponse` 型を定義。
   - `normalizeNewsApiArticle` を実装し、`url` を `providerId` として採用、`description` を `abstract` にマッピング。
   - `detectNewsApiGenre` を仮実装（`title`/`abstract` のキーワードでジャンル推測）。
2. Jest などの単体テストは任意だが、`console.assert` ベースの簡易テストで動作を確認する。

### 2.3 HTTP クライアント
1. `src/lib/http-client.ts` の指数バックオフ設定を確認し、429 時に 1,2,4 秒待機で最大 3 回リトライするよう調整。
2. `src/lib/api/newsapi-client.ts`
   - `fetchTopHeadlines` / `fetchEverything` のシグネチャを定義。
   - API キーは `process.env.NEWS_API_KEY` から取得し、存在しない場合は例外を投げる。
   - 実 API 呼び出しは Phase 2 で実装するため、この段階では呼び出し URL 生成と HTTP クライアント統合までを行う。

### 2.4 Supabase スキーマ
1. `supabase/migrations/001_initial_schema.sql`
   - `provider` カラムの CHECK 制約を `CHECK (provider IN ('newsapi'))` に更新。
   - Guardian/NYT 固有カラム（`subsection` は残して OK）に依存する説明は削除。
2. `src/lib/database.types.ts` を再生成するか手動で `provider: 'newsapi'` に更新。

### 2.5 環境変数とセットアップ
1. `.env.local` / `.env.example`
   - `GUARDIAN_API_KEY` / `NYT_API_KEY` など不要項目を削除。
   - `NEWS_API_KEY=your_news_api_key_here` を追記。
2. `README.md` セットアップ手順の API キー説明を NewsAPI へ更新（別タスクで対応可）。

## 3. チェックリスト
- [ ] `pnpm lint` / `pnpm typecheck` が成功する。
- [ ] `node --loader tsx scripts/test-domain.ts`（存在する場合）が NewsAPI モックで通る。
- [ ] Supabase マイグレーションがエラーなく適用できる（`pnpm supabase db reset` 等）。
- [ ] `.env.local` に NewsAPI キーが設定されている。

## 4. メモ
- Phase 1 では実 API 呼び出しを行わない。モックデータを `data/samples/newsapi.json` に用意しておくと後続が楽。
- 今後別ソースを追加する場合は Provider 型を拡張し、Phase NewsAPI Migration の手順を踏襲する。
