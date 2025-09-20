# Phase 2: データ収集パイプライン（NewsAPI）

NewsAPI から記事を取得し、Supabase `sources` テーブルへ保存するバッチ処理を実装する。レート制限を尊重しつつ、再試行・ログ出力・JSON サンプル生成を整える。

## 1. 成果物サマリ
- `src/lib/api/newsapi-client.ts` に実 API 呼び出し・ページング処理・エラーハンドリングを実装。
- `scripts/fetch-newsapi.ts` を追加し、環境変数を読み込んで NewsAPI → Supabase の保存フローを構築。
- `src/lib/database-utils.ts` を NewsAPI データに最適化し、重複チェック / バッチ保存 / レート制限待機を調整。
- 開発用に `data/samples/newsapi-*.json` を出力するオプションを用意。

## 2. 前提
- Phase 1 で NewsAPI アダプタ / クライアント / Supabase スキーマが整備済みであること。
- `.env.local` に以下が設定されていること:
  - `NEWS_API_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Supabase CLI が利用可能で、`sources` テーブルが存在する。

## 3. 実装手順

### 3.1 NewsAPI クライアント強化
1. `fetchPagedArticles` 内で `totalResults` を参照し、必要ページ数を判定。
2. `pages` 引数で最大取得ページ数を制御。無料枠は 100 記事までのため、既定はページサイズ 50 × ページ数 2 程度とする。
3. レスポンス status が `error` の場合はコードとメッセージを投げる。
4. `fetchEverything` では `from` / `to` を ISO8601 形式で受け取れるよう調整。

### 3.2 取得スクリプト
1. `scripts/fetch-newsapi.ts`
   - `dotenv/config` で `.env.local` を読み込み。
   - オプション: `USE_SUPABASE=false` で DB 書き込みをスキップし、JSON 出力のみ実施。
   - 期間指定: 直近 24 時間を既定とし、CLI オプション（`--days`, `--query`, `--sources` 等）でカスタマイズ可能にすると運用が楽。
   - `NewsApiClient.fetchEverything` を呼び出し、正規化結果を `saveSourceItems` に渡す。
   - 開発モード（`NODE_ENV=development`）では `data/samples/newsapi-{timestamp}.json` に先頭 10 件を保存。

### 3.3 Supabase 保存ユーティリティ
1. `saveSourceItems`
   - 1 バッチ 10 件程度で upsert。
   - `provider` / `provider_id` の複合一意制約で重複チェック。
   - `raw_data` に NewsAPI レスポンスを格納（必要最小限のフィールドを選択）。
2. `getExistingSourceCount`
   - `provider='newsapi'` で期間内件数を取得し、バッチ前にログ表示。

### 3.4 ロギングとエラー処理
- 成功時: 取得件数・保存件数・スキップ件数を `console.log`。
- 429 / ネットワークエラー時: HTTP クライアント側の指数バックオフに任せつつ、最後のエラー内容を標準エラーへ出力。
- 致命的エラー時は `process.exit(1)` で終了。CI で検知できるようにする。

## 4. テスト / 検証
- [ ] `pnpm tsx scripts/fetch-newsapi.ts --dry-run`（環境変数 `USE_SUPABASE=false`）で JSON のみ生成が成功。
- [ ] 実行後に Supabase `sources` テーブルへ新規レコードが挿入される（`provider='newsapi'`）。
- [ ] 連続実行で重複がスキップされることを確認。
- [ ] レート制限超過を模したテスト（429 強制）で指数バックオフが機能する。

## 5. 補足
- 有料プランでクォータが拡大した場合は `pages` / `pageSize` を調整。
- 国別・カテゴリ別の Top Headlines を併用する場合、`fetchTopHeadlines` を追加で呼び出し、`providerId` に `url + '#top'` などを付与して重複を避ける。
- NewsAPI は記事公開から 30 日以内が対象。長期保管は Supabase / 自前ストレージで行う。
