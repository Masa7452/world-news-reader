# The New York Times APIs 設計書

本書は The New York Times が提供する主要API（Article Search, Times Newswire, Top Stories, Most Popular, Archive）の利用に必要なインターフェイス仕様（エンドポイント、認証、クエリパラメータ、レスポンス構造、ページネーション、レート制限、エラーハンドリング）を整理したものです。実装詳細は含みません。

## 概要
- 基底URL（共通プレフィックス）: `https://api.nytimes.com/svc`
- 形式: REST + JSON
- 認証: クエリ `api-key=YOUR_KEY`
- 文字コード: UTF-8
- 主タクソノミ: セクション、サブセクション、ニュースデスク、ファセット（`des_facet`, `org_facet`, `per_facet`, `geo_facet`）

## 認証と共通仕様
- 認証はクエリパラメータ `api-key` を付与します。
  - 例: `GET .../articlesearch.json?api-key=YOUR_KEY`
- レスポンスは JSON。API によりトップレベル構造（`status`, `response`, `results` など）が異なります。
- 多くのエンドポイントにレート制限（分間・日次）が設定されています。過剰な呼び出しで 429 が返る場合があります。

---

## Article Search API v2
広範囲のアーカイブから記事を検索・絞り込み。期間指定とフィルタ（Lucene 互換の `fq`）が利用可能。

- エンドポイント: `GET /search/v2/articlesearch.json`

### クエリパラメータ
- `api-key` (string, 必須): APIキー。
- `q` (string, 任意): フリーテキスト検索。
- `fq` (string, 任意): フィルタクエリ（Lucene 構文）。例: `news_desk:("Business" "Technology") AND type_of_material:("News" "Analysis")`。
- `begin_date` (string, 任意): 期間開始（`YYYYMMDD`）。
- `end_date` (string, 任意): 期間終了（`YYYYMMDD`）。
- `sort` (enum, 任意): `newest` | `oldest` | `relevance`。
- `page` (number, 任意): 0 起点のページ番号（1ページ=10件）。
- `fl` (string, 任意): 返却フィールドの限定（例: `web_url,uri,_id,pub_date,headline,abstract,byline,section_name,subsection_name,news_desk,type_of_material,word_count,multimedia`）。
- `facet` (boolean, 任意): ファセット情報（件数集計）の返却を有効化。
- `facet_field` (string | repeatable, 任意): ファセット対象フィールドを指定（例: `section_name`, `source`, `type_of_material`, `news_desk` など）。複数指定はパラメータの繰り返しで表現。
- `facet_filter` (boolean, 任意): クエリ/フィルタ条件をファセット集計にも適用。

### レスポンス（抜粋）
```
200 OK
{
  "status": "OK",
  "response": {
    "docs": [
      {
        "web_url": "https://www.nytimes.com/2025/09/01/technology/example.html",
        "uri": "nyt://article/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "_id": "nyt://article/xxxxxxxx-...",
        "pub_date": "2025-09-01T10:30:00+0000",
        "headline": { "main": "Example article title" },
        "abstract": "Short abstract ...",
        "byline": { "original": "By Author Name" },
        "section_name": "Technology",
        "subsection_name": "",
        "news_desk": "Business",
        "type_of_material": "News",
        "word_count": 850,
        "multimedia": [ { "url": "/images/2025/09/01/.../image-articleLarge.jpg", "type": "image", "subtype": "photo", "height": 400, "width": 600, "caption": "..." } ]
      }
    ],
    "meta": { "hits": 12345, "offset": 0, "time": 45 }
  }
}
```

### ページネーション
- `page` は 0 起点。各ページ 10 件固定。
- 総件数は `response.meta.hits` を参照。
- 取得上限の目安: 最大100ページ（=1,000件）まで。広い期間の取得時は `begin_date`/`end_date` で時間範囲を分割してください。

---

## Times Newswire API
最新入稿（速報）の一覧を取得。軽量で新着巡回に適します。

- エンドポイント: `GET /news/v3/content/{source}/{section}.json`
  - `source`: `all` など。
  - `section`: `all` または特定セクション（例: `technology`, `world` など）。
  - 便利エンドポイント: `GET /news/v3/content/section-list.json`（利用可能なセクション一覧）

### クエリパラメータ
- `api-key` (string, 必須)
- `limit` (number, 任意): 取得件数（1–20）。
- `offset` (number, 任意): ページオフセット（0起点）。
- `time-period` (number, 任意): 直近の時間数で絞り込み（例: `24`）。

### レスポンス（抜粋）
```
200 OK
{
  "status": "OK",
  "num_results": 50,
  "results": [
    {
      "title": "Example title",
      "abstract": "Short abstract ...",
      "url": "https://www.nytimes.com/2025/09/01/...",
      "byline": "By Author Name",
      "source": "New York Times",
      "published_date": "2025-09-01T10:30:00-05:00",
      "updated_date": "2025-09-01T11:00:00-05:00",
      "section": "Technology",
      "subsection": "",
      "des_facet": ["Artificial Intelligence"],
      "org_facet": [],
      "per_facet": [],
      "geo_facet": [],
      "multimedia": [
        { "url": "https://static01.nyt.com/images/.../merlin_....jpg", "format": "superJumbo", "height": 1365, "width": 2048, "type": "image", "subtype": "photo", "caption": "...", "copyright": "..." }
      ]
    }
  ]
}
```

### ページネーション
- `limit` と `offset` で制御。

---

## Top Stories API
編集部がキュレートした各セクションのトップ記事を取得。

- エンドポイント: `GET /topstories/v2/{section}.json`
  - `section`: `home`, `world`, `us`, `business`, `technology`, `science`, `health`, `arts`, `books`, `movies`, `theater`, `fashion`, `food`, `travel`, `magazine`, `realestate`, `sports`, `opinion`, `sundayreview`, `upshot` など。

### クエリパラメータ
- `api-key` (string, 必須)

### レスポンス（抜粋）
```
200 OK
{
  "status": "OK",
  "results": [
    {
      "section": "Technology",
      "subsection": "",
      "title": "Example title",
      "abstract": "Short abstract ...",
      "url": "https://www.nytimes.com/2025/09/01/...",
      "byline": "By Author Name",
      "item_type": "Article",
      "updated_date": "2025-09-01T12:00:00-05:00",
      "created_date": "2025-09-01T11:30:00-05:00",
      "published_date": "2025-09-01T11:30:00-05:00",
      "des_facet": ["Artificial Intelligence"],
      "org_facet": [],
      "per_facet": [],
      "geo_facet": [],
      "multimedia": [ { "url": "https://static01.nyt.com/images/.../superJumbo.jpg", "format": "superJumbo", "type": "image", "subtype": "photo", "height": 1365, "width": 2048, "caption": "...", "copyright": "..." } ]
    }
  ]
}
```

---

## Most Popular API
閲覧数・共有数・メール送信数などで人気の記事を取得。

- エンドポイント: `GET /mostpopular/v2/{type}/{period}.json`
  - `type`: `mostviewed` | `mostshared` | `mostemailed`
  - `period`: `1` | `7` | `30`（日数）
- `mostshared` の場合は共有媒体を指定する `shared-type`（例: `facebook`）が必要になる場合があります。

### クエリパラメータ
- `api-key` (string, 必須)

### レスポンス（抜粋）
```
200 OK
{
  "status": "OK",
  "results": [
    {
      "id": 100000009999999,
      "url": "https://www.nytimes.com/2025/09/01/...",
      "title": "Example title",
      "abstract": "Short abstract ...",
      "byline": "By Author Name",
      "published_date": "2025-09-01",
      "section": "Technology",
      "des_facet": ["Artificial Intelligence"],
      "media": [ { "type": "image", "caption": "...", "media-metadata": [ { "url": "https://static01.nyt.com/.../mediumThreeByTwo440.jpg", "format": "mediumThreeByTwo440", "height": 293, "width": 440 } ] } ]
    }
  ]
}
```

---

## Archive API
月単位のアーカイブ一覧を取得（大量で重い。初期バックフィル向け）。

- エンドポイント: `GET /archive/v1/{year}/{month}.json`
  - `year`: 西暦、`month`: 1–12

### クエリパラメータ
- `api-key` (string, 必須)

### レスポンス（抜粋）
```
200 OK
{
  "status": "OK",
  "response": {
    "docs": [ { "web_url": "...", "uri": "nyt://article/...", "pub_date": "...", "headline": {"main": "..."}, ... } ]
  }
}
```

---

## よく使うフィールド（横断的）
- `web_url` (string): 記事URL
- `uri` (string): 安定識別子（例: `nyt://article/...`）
- `_id` (string): 旧来の識別子
- `pub_date` (string): 公開日時（ISO 8601）
- `headline.main` (string): 見出し
- `abstract` (string): 要旨
- `byline.original` (string): 署名
- `section_name` / `subsection_name` (string)
- `news_desk` (string)
- `type_of_material` (string)
- `word_count` (number)
- `multimedia[]` (array): 画像等。`url` が相対パスの場合は `https://www.nytimes.com/` を前置。

## ページネーション
- Article Search: `page`（0 起点）、ページあたり 10 件。`meta.hits` で総件数確認。
- Newswire: `limit` と `offset`。Top Stories/Most Popular はページングなし（結果件数は固定/上限あり）。

## レート制限と再試行
- 多くのエンドポイントで分間・日次の上限が設定されています（キー/契約により異なる）。
- 429（Too Many Requests）受信時は指数バックオフで再試行。

注意:
- 公開情報に相反が見られるケースがあります（例: 10/分・4,000/日 vs 5/分・500/日 など）。実際の上限は開発者ポータル（自身のAPIキーのダッシュボード）で必ず確認してください。

## エラーハンドリング
- 401/403: APIキー不正/権限不足
- 404: リソース未存在
- 429: レート超過
- 5xx: 一時的障害
エンドポイントによりエラーボディの形は異なりますが、`status`/`message` 等を含む JSON が返るのが一般的です。

## 品質・コンプライアンス留意事項
- 本文の転載/保存は行わず、メタデータ（見出し、URL、公開日、セクション等）の利用に留めます。
- 画像を利用する場合はライセンス条件（複製・商用利用・クレジット表記等）に留意してください。
- 出典（媒体名・記事タイトル・URL・日付）を明確に表示します。

## 運用上の注意（共通ガイダンス）
- バックオフ: 429を受信した場合は指数バックオフ（例: 1s→2s→4s→…）で再試行し、上限を跨ぐ連続アクセスを避ける。
- キャッシュ: Top Stories / Newswire / Most Popular は短TTL（60–300秒）を推奨。Article Search / Archive は長めTTLが適切。
- 大規模取得: Article Search のページ上限（100ページ）に留意し、広い期間は `begin_date`/`end_date` で区切る。
- 法務・配信: メタデータ中心の利用が原則。研究/商用の再配布要件・レート制限はポータルの最新規約を参照し、都度確認する。
