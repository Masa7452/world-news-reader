# NewsAPI.org API 設計書

本書は NewsAPI.org が提供する REST API（Top Headlines / Everything / Sources および商用契約向け Content API）のインターフェイス仕様（エンドポイント、認証方式、主要クエリパラメータ、レスポンス構造、ページネーション、レート制限、エラーレスポンス）を整理したものです。実装手順は含みません。

## 概要
- 基底URL: `https://newsapi.org/v2`
- 形式: REST + JSON
- 認証: HTTPヘッダ `X-Api-Key: YOUR_KEY`（またはクエリ `apiKey`）
- 取得内容: 多数のパブリックニュースソースから集約された記事メタデータ
- 期間: `everything` は過去30日以内（無料/スタンダード）、Top Headlines は直近速報
- 文字コード: UTF-8

## 認証と共通仕様
- すべてのリクエストに APIキーが必須。推奨はヘッダ `X-Api-Key`、代替手段として `?apiKey=` クエリをサポート。
- レスポンスの基本構造は `{ "status": "ok" | "error", ... }`。
- 日付は ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`) 形式。
- `everything` と `top-headlines` は `page` + `pageSize`（最大100）でページング。`page` は 1 起点、1〜100 の範囲で指定可能。総件数は `totalResults`。
- 1リクエストあたりの記事数は `pageSize` に依存（既定20、最大100）。無料/スタンダードではページ総数に関係なく最初の100件までしか取得できません。
- 利用規約で記事本文の保管・再配布は制限されます。レスポンスの `content` フィールドは約200〜260文字で切り詰められた要約テキスト（無料/スタンダード）。全文は有償 Content API でのみ提供。

## レート制限とプラン
- Developer（無料）: 100リクエスト/日、1リクエスト/秒（Burst）。非商用のみ。
- Starter / Pro: 1,000〜10,000+ リクエスト/日（プランにより差異）。商用利用・再配信可。`everything` の履歴範囲が最大2年間に拡張、Webhook配信や追加メタデータも利用可能。
- Enterprise: 契約内容に応じてレート・ソース配信がカスタマイズされ、全文配送（Content API）や広範なバックフィルが提供されます。
- 429 (Too Many Requests) 時は `X-RateLimit-Remaining`, `X-RateLimit-Reset` ヘッダを参照し、指数バックオフで再試行すること。

---

## GET /top-headlines
主要ソースの最新ヘッドラインを取得。速報用途に適しています。

例:
```
GET https://newsapi.org/v2/top-headlines
  ?country=us
  &category=technology
  &pageSize=50
  &page=1
Header: X-Api-Key: YOUR_KEY
```

### クエリパラメータ
- `country` (ISO 3166-1 alpha-2, 任意): 国コード。`us`, `gb`, `au`, `jp` など。`sources` と同時指定不可。
- `category` (enum, 任意): `business`, `entertainment`, `general`, `health`, `science`, `sports`, `technology`。国指定がない場合は一部地域のみ対応。
- `sources` (string, 任意): ソースIDをカンマ区切りで指定（例: `bbc-news,techcrunch`）。`country`/`category` と同時指定不可。
- `q` (string, 任意): キーワード検索。空白はURLエンコード。
- `pageSize` (1–100, 任意): 1ページの件数（既定20）。
- `page` (1–100, 任意): ページ番号。
- `language` (ISO 639-1, 任意): 言語フィルタ（例: `en`, `fr`, `de`）。`country` と併用不可。

### レスポンス（抜粋）
```
200 OK
{
  "status": "ok",
  "totalResults": 120,
  "articles": [
    {
      "source": { "id": "bbc-news", "name": "BBC News" },
      "author": "BBC News",
      "title": "Example headline",
      "description": "Short summary ...",
      "url": "https://www.bbc.com/news/example",
      "urlToImage": "https://ichef.bbci.co.uk/news/1024/example.jpg",
      "publishedAt": "2025-02-03T12:45:00Z",
      "content": "Partial content up to ~200 chars … [ +123 chars ]"
    }
  ]
}
```

### 注意事項
- `totalResults` は推計値。無料プランでは 100 件までしか取得できないため、ページ >= 2 で空配列になる場合があります。
- `source.id` が `null` の記事は提携先の個別IDが未付与。

---

## GET /everything
キーワードやドメインで過去記事を検索するエンドポイント。集約対象は主要メディア数千件。

例:
```
GET https://newsapi.org/v2/everything
  ?q=artificial+intelligence
  &from=2025-01-01
  &to=2025-02-03
  &language=en
  &sortBy=publishedAt
  &pageSize=100
  &page=1
Header: X-Api-Key: YOUR_KEY
```

### クエリパラメータ
- `q` (string, 任意): フリーテキスト検索。複数語は `AND`。引用符でフレーズ検索、`NOT`/`OR`/括弧による論理検索が可能。
- `qInTitle` (string, 任意): タイトルのみを対象に検索。
- `sources` (string, 任意): ソースIDのカンマ区切り。`domains` と併用可だが `country`/`category` は指定不可。
- `domains` / `excludeDomains` (string, 任意): ドメイン（ホスト名）で絞り込み。
- `from` / `to` (ISO 8601, 任意): 期間指定。タイムゾーンを含む。無料/スタンダードでは過去30日までが対象。
- `language` (ISO 639-1, 任意): 言語（例: `en`, `ja`, `fr`）。
- `sortBy` (enum, 任意): `relevancy`（関連度）, `popularity`（ソースの人気度）, `publishedAt`（最新順）。
- `searchIn` (enum list, 任意): `title`, `description`, `content` のいずれかをカンマ区切りで指定（2024年追加）。
- `pageSize` / `page`: ページング制御（前述の共通仕様参照）。

### レスポンス（抜粋）
```
200 OK
{
  "status": "ok",
  "totalResults": 3462,
  "articles": [
    {
      "source": { "id": "the-verge", "name": "The Verge" },
      "author": "Jane Doe",
      "title": "AI startup launches new model",
      "description": "A quick summary ...",
      "url": "https://www.theverge.com/2025/02/03/ai-startup-model",
      "urlToImage": "https://cdn.vox-cdn.com/thumbor/.../image.jpg",
      "publishedAt": "2025-02-03T09:12:34Z",
      "content": "Partial content up to ~200 chars …"
    }
  ]
}
```

### 注意事項
- `totalResults` が 0 でも HTTP 200 が返る（`articles` は空配列）。
- `sortBy=popularity` は主要英語ソース中心、`language` 指定がなければ英語優先でヒット。
- 高頻度キーワードで 100 件を超える場合、取得は最新順に限定されるため、日ごとに `from`/`to` を分割するなど再取得戦略が必要です。

---

## GET /sources
利用可能なニュースソースのメタデータ一覧を取得。

例:
```
GET https://newsapi.org/v2/sources
  ?language=en
  &country=us
Header: X-Api-Key: YOUR_KEY
```

### クエリパラメータ
- `category` (enum, 任意): `business`, `entertainment`, `general`, `health`, `science`, `sports`, `technology`。
- `language` (ISO 639-1, 任意)
- `country` (ISO 3166-1 alpha-2, 任意)

### レスポンス（抜粋）
```
200 OK
{
  "status": "ok",
  "sources": [
    {
      "id": "bbc-news",
      "name": "BBC News",
      "description": "Use BBC News for up-to-the-minute news...",
      "url": "http://www.bbc.co.uk/news",
      "category": "general",
      "language": "en",
      "country": "gb"
    }
  ]
}
```

---

## Content API（有償オプション）
- プロ/エンタープライズ契約で提供される全文配信API。専用エンドポイント（例: `https://newsapi.org/v2/content`）と追加フィールド（全文HTML、著作権情報、トピック分類、画像メタデータ等）が利用可能。
- REST構造は `everything` に類似しつつ、`articles[]` に `fullContent`, `topics`, `entities`, `sentiment` などが付加される。
- エンドポイント/スキーマは契約プランごとに異なるため、導入時は NewsAPI サポートから提供される最新仕様書を参照すること。

---

## エラーハンドリング
- 認証失敗: `401` / `status: "error"`, `code: "apiKeyInvalid"`, `message` に詳細。
- リクエスト制限: `429` / `code: "rateLimited"`。
- パラメータエラー: `400` / `code: "parameterInvalid"`。
- サーバエラー: `500` / `code: "unexpectedError"`。

例:
```
401 Unauthorized
{
  "status": "error",
  "code": "apiKeyInvalid",
  "message": "Your API key is invalid or incorrect."
}
```

- エラー時は HTTP ステータスを優先し、`status === "error"` の場合は `code` と `message` をログした上で再試行/フォールバックを実装すること。

## 実装時のベストプラクティス
- APIキーはサーバー側で安全に管理し、クライアントアプリに埋め込まない。
- 短時間に連続リクエストする場合は 1req/sec を超えないようスロットリングを実装。
- `everything` の長期巡回では期間ごと（日次など）に区切り、`from`/`to` をスライドさせながら取得する。
- ソース名とIDは定期的に `/sources` で同期し、無効なIDをリクエストしない。
- レスポンスの `content` はトリミング済みであるため、本文が必須な場合は NewsAPI Content API へのアップグレードまたは別の提供元を利用する。

