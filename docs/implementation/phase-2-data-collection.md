# Phase 2: データ収集パイプライン（TheNewsAPI）

TheNewsAPI から記事を取得し、Supabase `sources` テーブルへ保存するバッチ処理を実装する。レート制限（無料プラン: 100 req/day・limit=3）を尊重しつつ、再試行・ログ出力・JSON サンプル生成を整える。

## 1. 成果物サマリ
- `src/lib/api/newsapi-client.ts` に実 API 呼び出し・ページング処理・エラーハンドリングを実装。
- `scripts/fetch-newsapi.ts` を追加し、環境変数を読み込んで TheNewsAPI → Supabase の保存フローを構築。
- `src/lib/database-utils.ts` を TheNewsAPI データに最適化し、重複チェック / バッチ保存 / レート制限待機を調整。
- 開発用に `data/samples/newsapi-*.json`（名称は互換のため維持）を出力するオプションを用意。

## 2. 前提
- Phase 1 で TheNewsAPI アダプタ / クライアント / Supabase スキーマが整備済みであること。
- `.env.local` に以下が設定されていること:
  - `NEWS_API_KEY`（TheNewsAPI の API トークン）
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Supabase CLI が利用可能で、`sources` テーブルが存在する。

## 3. 実装手順

### 3.1 TheNewsAPI クライアント強化
1. `fetchPagedArticles`
   - レスポンスの `meta` から `found`（総件数）、`returned`、`limit` を読み取り、取得可能ページ数を計算。
   - 無料プランでは `limit` が最大 3 のため、既定値は `limit=3`, `pages=1`。Basic 以上は `limit` 25/50 に拡張可能。
   - 各ページ取得後に `shouldContinue`（返却件数が `limit` に満たない場合は false）を判定し、早期終了できるようにする。
   - エラーレスポンスは `response.status` が無いため HTTP ステータスで判断し、`message` フィールドがあればログに含める。

2. `fetchEverything`（TheNewsAPI の `/news/all` 相当）
   - `published_after` / `published_before` を ISO8601 文字列で受け取れるようにする。
   - 追加オプション: `search`, `search_fields`, `locale`, `language`, `categories`, `sources`, `not_sources` などをサポート。

### 3.2 取得スクリプト
1. `scripts/fetch-newsapi.ts`
   - `dotenv/config` で `.env.local` を読み込み。
   - CLI オプション: `--days`（既定1日）、`--query`（search）、`--sources`、`--locale`、`--language`、`--dry-run`。
   - `createDateRange` で現在時刻から `days` 日前を算出し、`published_after` / `published_before` として利用。
   - 無料プランでは 1 リクエストにつき 3 件となるため、必要件数が多い場合は `pages` を増やして複数回呼び出し。
   - `USE_SUPABASE=false` または `--dry-run` の際は Supabase 保存をスキップし、`data/samples/newsapi-{timestamp}.json` に先頭10件を保存。

2. ログ出力
   - 取得期間、クエリ、ソース指定をログに表示。
   - 取得件数、保存件数、スキップ件数、エラー件数を整形して出力。

### 3.3 Supabase 保存ユーティリティ
1. `saveSourceItems`
   - 1 バッチ 10 件程度で upsert。
   - `provider='newsapi'`（TheNewsAPI）と `provider_id`（URL もしくは uuid）の複合一意キーで重複を防止。
   - `raw_data` には TheNewsAPI 固有のフィールド（`snippet`, `categories`, `locale` など）を格納。
2. `getExistingSourceCount`
   - 取得期間に基づき `provider='newsapi'` の件数を参照し、再取得の有無を判断。

### 3.4 ロギングとエラー処理
- 成功時: 取得件数・保存件数・スキップ件数を `console.log`。
- 429 / 5xx / ネットワークエラー時: HTTP クライアント側の指数バックオフ（1,2,4秒）を利用し、最大3回リトライ。
- 致命的エラー時は `process.exit(1)` で終了。CI で検知できるようにする。

## 4. テスト / 検証
- [ ] `pnpm tsx scripts/fetch-newsapi.ts --dry-run`（環境変数 `USE_SUPABASE=false`）で JSON のみ生成が成功。
- [ ] 実行後に Supabase `sources` テーブルへ新規レコードが挿入される（`provider='newsapi'`）。
- [ ] 連続実行で重複がスキップされることを確認。
- [ ] レート制限超過を模したテスト（429 強制）で指数バックオフが機能する。

## 5. 補足
- 無料プランの上限（100 req/day, limit=3）を超える場合は Basic プラン（limit=25）への移行を検討。
- `locale` / `language` / `categories` を指定すると、対象地域・ジャンルを絞ってノイズを減らせる。
- TheNewsAPI は記事公開から約30日間が検索対象。長期保管は Supabase / 自前ストレージで行う。
