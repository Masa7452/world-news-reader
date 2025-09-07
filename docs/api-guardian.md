# The Guardian Content API 設計書

本書は The Guardian Content API の利用に必要なインターフェイス仕様（エンドポイント、認証、クエリパラメータ、レスポンス構造、ページネーション、レート制限、エラーハンドリング）を整理したものです。実装詳細は含みません。

## 概要
- 基底URL: `https://content.guardianapis.com`
- 形式: REST + JSON
- 認証: クエリ `api-key=YOUR_KEY`
- データ種別: 記事、ライブブログ、ギャラリー、音声/動画等（本書では主に記事メタデータを対象）
- 文字コード: UTF-8

## 認証と共通仕様
- 認証はクエリパラメータ `api-key` を付与します。
  - 例: `GET /search?api-key=YOUR_KEY`
- レスポンスは JSON。トップレベルに `response` オブジェクトを持ちます。
- 日付の形式は主に ISO 8601（例: `2025-09-07T03:15:00Z`）。日付フィルタの指定は `YYYY-MM-DD` を使用します。
- レート制限があり、短時間の高頻度呼び出しは 429 を返す場合があります。実運用の上限は発行キー/契約に依存します。
- 目安（Developer Key/非商用）: おおむね 1 req/sec・500/day 程度。本文アクセスはキー登録で可能（非商用）。商用利用は別契約が必要です（最新の利用条件を要確認）。

## エンドポイント一覧
- `GET /search` — コンテンツ横断検索（推奨の取得手段）
- `GET /{id}` — 単一コンテンツの詳細取得（`{id}` はスラッグ形式のコンテンツID）
- `GET /tags` — タグの検索/参照
- `GET /sections` — セクションの一覧/参照

---

## GET /search
コンテンツ（主に記事）の横断検索。メタデータ中心の取得に適しています。

例:
```
GET https://content.guardianapis.com/search
  ?q=technology
  &from-date=2025-09-01
  &to-date=2025-09-07
  &order-by=newest
  &page=1
  &page-size=50
  &show-fields=headline,trailText,byline,thumbnail,wordcount,shortUrl,lastModified
  &show-tags=keyword,contributor,series,publication
  &api-key=YOUR_KEY
```

### クエリパラメータ
- `q` (string, 任意): フリーテキスト検索（語句/フレーズ）。
- `section` (string, 任意): セクションIDで絞り込み（例: `world`, `technology`）。複数指定はカンマ区切りが利用可能です。
- `tag` (string, 任意): タグIDで絞り込み（例: `type/opinion`, `tone/analysis`, `profile/著者ID`, `keyword/キーワード`）。複数指定可。
- `from-date` (string, 任意): 開始日（`YYYY-MM-DD`）。
- `to-date` (string, 任意): 終了日（`YYYY-MM-DD`）。
- `order-by` (enum, 任意): 並び順。`newest` | `oldest` | `relevance`。
- `page` (number, 任意): ページ番号（1始まり）。
- `page-size` (number, 任意): 1ページの件数（既定: 10）。上限は環境/キーにより異なるため固定値の断定は避け、レスポンスのページ情報に追従してください。
- `show-fields` (string, 任意): 追加フィールドを返却。例: `headline,trailText,byline,thumbnail,wordcount,shortUrl,lastModified`。
- `show-fields=body|bodyText`（任意）: 本文（HTML）または本文テキストの返却を要求。ライセンス/利用条件に留意。
- `show-tags` (string, 任意): タグ詳細を付加。例: `keyword,contributor,series,publication`。
- `show-elements` (string, 任意): 画像/動画/音声/インタラクティブ要素の情報を付加（例: `image,video,audio,interactive`）。
- `show-blocks` (string, 任意): コンテンツブロックを付加（例: `main` | `body` | `all` | `body:latest...`）。
- `ids` (string, 任意): 複数IDの明示指定（カンマ区切り）。
- `api-key` (string, 必須): APIキー。

注意: 本文テキストの保存/再配布はライセンス/規約により制約があります。本文の取得（`show-blocks` 等）は利用目的/権利に留意してください。

### レスポンス（抜粋）
```
200 OK
{
  "response": {
    "status": "ok",
    "userTier": "developer",
    "total": 1234,
    "startIndex": 1,
    "pageSize": 50,
    "currentPage": 1,
    "pages": 25,
    "orderBy": "newest",
    "results": [
      {
        "id": "world/2025/sep/01/example-article-slug",
        "type": "article",
        "sectionId": "world",
        "sectionName": "World news",
        "webPublicationDate": "2025-09-01T10:30:00Z",
        "webTitle": "Example article title",
        "webUrl": "https://www.theguardian.com/world/2025/sep/01/example-article-slug",
        "apiUrl": "https://content.guardianapis.com/world/2025/sep/01/example-article-slug",
        "fields": {
          "headline": "Example article title",
          "trailText": "Short standfirst or summary ...",
          "byline": "Author Name",
          "thumbnail": "https://media.guim.co.uk/.../500.jpg",
          "shortUrl": "https://gu.com/p/abcd",
          "wordcount": "850",
          "lastModified": "2025-09-01T12:00:00Z"
        },
        "tags": [
          { "id": "keyword/example", "type": "keyword", "webTitle": "Example", "webUrl": "https://www.theguardian.com/...", "apiUrl": "https://content.guardianapis.com/..." }
        ]
      }
    ]
  }
}
```

### ページネーション
- レスポンスの `currentPage`, `pages`, `pageSize`, `total`, `startIndex` を利用してページ送りを行います。
- `page` は 1 起点です。`page-size` の実効上限は環境差があるため、過大な値での固定呼び出しは避け、取得失敗時は段階的に縮小するなどフォールバックを実装してください。

### エラーレスポンス（例）
```
401 Unauthorized
{
  "response": {
    "status": "error",
    "message": "Invalid or missing api key"
  }
}
```
一般的に 4xx/5xx を返し、429（Too Many Requests）時は一定の待機後に再試行します。

---

## GET /{id}
単一コンテンツの詳細を返します。`{id}` は `/search` の `results[].id` で得られるスラッグ形式の識別子です。

例:
```
GET https://content.guardianapis.com/world/2025/sep/01/example-article-slug
  ?show-fields=headline,trailText,byline,thumbnail,wordcount,shortUrl,lastModified
  &show-tags=keyword,contributor,series,publication
  &api-key=YOUR_KEY
```

### クエリパラメータ
- `show-fields`, `show-tags`, `show-elements`, `show-blocks`, `api-key`: `/search` と同様。

本文取得に関する注意:
- `show-fields=body` は本文HTML、`show-fields=bodyText` は本文テキストを返却します。
- 画像は本文HTML内ではなく `elements` に格納される場合があります。本文再構成時は `blocks.body` と `elements` の突合が必要になることがあります。

### レスポンス（抜粋）
```
200 OK
{
  "response": {
    "status": "ok",
    "content": {
      "id": "world/2025/sep/01/example-article-slug",
      "type": "article",
      "sectionId": "world",
      "sectionName": "World news",
      "webPublicationDate": "2025-09-01T10:30:00Z",
      "webTitle": "Example article title",
      "webUrl": "https://www.theguardian.com/world/2025/sep/01/example-article-slug",
      "apiUrl": "https://content.guardianapis.com/world/2025/sep/01/example-article-slug",
      "fields": { ... },
      "tags": [ ... ]
    }
  }
}
```

---

## GET /tags
タグの検索/参照。

例:
```
GET https://content.guardianapis.com/tags?q=technology&type=keyword&page-size=50&api-key=YOUR_KEY
```

### 主なクエリパラメータ
- `q` (string, 任意): タグ名の全文検索。
- `type` (enum, 任意): `keyword` | `contributor` | `series` | `publication` など。
- `page`, `page-size` (任意): ページネーション。
- `api-key` (必須)

### レスポンス（抜粋）
```
200 OK
{
  "response": {
    "status": "ok",
    "total": 123,
    "results": [
      { "id": "keyword/technology", "type": "keyword", "webTitle": "Technology", "webUrl": "https://www.theguardian.com/technology", "apiUrl": "https://content.guardianapis.com/technology" }
    ]
  }
}
```

---

## GET /sections
セクション一覧/参照。

例:
```
GET https://content.guardianapis.com/sections?page-size=200&api-key=YOUR_KEY
```

### レスポンス（抜粋）
```
200 OK
{
  "response": {
    "status": "ok",
    "total": 50,
    "results": [
      { "id": "world", "webTitle": "World news", "webUrl": "https://www.theguardian.com/world", "apiUrl": "https://content.guardianapis.com/world" }
    ]
  }
}
```

---

## レート制限と再試行
- レート上限はキー/契約により異なります。HTTP 429 受信時は指数バックオフ（例: 1s, 2s, 4s, ...）で再試行してください。
- 長期の大量取得は日次クォータを消費します。時間帯分散や `page-size` 最適化を推奨します。

注意:
- Developer Key（非商用）の目安は 1 req/sec・500/day。本文アクセスはキー登録で可能。商用は別契約が必要です。

## エラーハンドリング
- 401/403: APIキー不正/権限不足
- 404: リソース未存在（ID間違い等）
- 429: レート超過
- 5xx: 一時的障害
可能な場合はレスポンス本文の `response.status`/`response.message` を参照してください。

## 品質・コンプライアンス留意事項
- 本文の転載や恒久的保存は行わず、メタデータ（見出し、URL、公開日、セクション等）の利用に留めます。
- 出典（媒体名・記事タイトル・URL・日付）を明確に表示します。

## 運用上の注意（共通ガイダンス）
- バックオフ: 429を受信した場合は指数バックオフ（例: 1s→2s→4s→…）で再試行。
- キャッシュ: セクション/タグ/検索は比較的変動が早いため短TTL（60–300秒）を、個別コンテンツ/セクション一覧は長めTTLを推奨。
- 大規模取得: 日次クォータに抵触しやすいため、期間・セクション・タグで分割し、`page-size` はレスポンスや失敗状況に応じて調整。
- 法務・配信: 開発者キーは非商用が前提。商用利用や再配布はオープンプラットフォームの最新規約・契約条件を参照。
