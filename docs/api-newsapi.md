# TheNewsAPI 設計書

本書は TheNewsAPI (https://www.thenewsapi.com/) が提供する REST API の仕様を整理したものです。Top / Latest / All ニュース取得とソース情報参照を対象に、エンドポイント、認証方式、主要クエリパラメータ、レスポンス構造、レート制限、エラーレスポンスをまとめます。実装コードは別資料を参照してください。

## 概要
- 基底URL: `https://api.thenewsapi.com/v1`
- 形式: REST + JSON
- 認証: クエリ `api_token=YOUR_TOKEN` または `Authorization: Bearer YOUR_TOKEN`
- 取得内容: 国内外の主要メディアから収集された記事メタデータ（本文スニペット含む）
- 対象期間: `/news/latest` は直近、`/news/top` は編集部選定、`/news/all` は過去30日程度の全文検索
- 文字コード: UTF-8

## 認証と共通仕様
- すべてのエンドポイントで API トークンが必須。推奨はクエリ `api_token`。
- レスポンスのトップレベルは `{ "data": [...], "meta": {...} }`。`data` が記事配列、`meta` がページ情報。
- 日付は ISO8601 (`YYYY-MM-DDTHH:mm:ssZ`) 形式で返却・指定。
- ページングは `page` (1 起点) と `limit` (無料: 最大3、Basic: 最大25 などプランに依存)。
- 言語・地域は `language` / `locale` で指定。無指定時は英語圏（`en`）中心。

## レート制限とプラン（2025年02月時点）
| プラン | 月額 | リクエスト/日 | 1リクエストあたり上限 (`limit`) | 商用利用 |
| --- | --- | --- | --- | --- |
| Free | 無料 | 100 | 3 | 小規模用途は可（配信先でのクレジット表記必須） |
| Basic | $16 | 2,500 | 25 | 商用可 |
| Pro | $64 | 10,000 | 50 | 商用可 |
| Business | 個別見積もり | カスタム | カスタム | 商用可 |

- 1 秒あたり 1 リクエスト程度が目安。超過すると HTTP 429 を返す。
- 日次クォータは UTC 00:00 にリセット。

---

## GET /news/top
トップニュース（編集部選定の注目記事）を取得します。

例:
```
GET https://api.thenewsapi.com/v1/news/top
  ?api_token=YOUR_TOKEN
  &locale=us
  &language=en
  &limit=3
```

### クエリパラメータ
- `locale` (string, 任意): ニュース地域。例: `us`, `gb`, `ca`, `au`, `in`, `jp` など。
- `language` (string, 任意): ISO639-1 コード。例: `en`, `es`, `fr`, `de`, `pt`。
- `categories` (string, 任意): カンマ区切りのカテゴリ。例: `business,technology`。
- `limit` (number, 任意): 返却件数。無料は 1–3、Basic 以上は最大25/50。
- `page` (number, 任意): 1 起点のページ番号。
- `not_sources` / `sources` (string, 任意): 除外・包含するソース名をカンマ区切りで指定。

### レスポンス（抜粋）
```
200 OK
{
  "data": [
    {
      "uuid": "706fd910-d49f-45db-9ed0-1b6c6a6ff4e1",
      "title": "Example headline",
      "description": "Short standfirst ...",
      "snippet": "Expanded summary text ...",
      "url": "https://www.cnn.com/example",
      "image_url": "https://cdn.cnn.com/example.jpg",
      "language": "en",
      "published_at": "2025-02-03T12:30:00Z",
      "source": "CNN",
      "categories": ["business"],
      "locale": "us"
    }
  ],
  "meta": {
    "found": 12345,
    "returned": 3,
    "limit": 3,
    "page": 1
  }
}
```

---

## GET /news/latest
時系列順の最新記事を取得します。

例:
```
GET https://api.thenewsapi.com/v1/news/latest
  ?api_token=YOUR_TOKEN
  &countries=us,gb
  &language=en
  &limit=3
```

### 主なパラメータ
- `countries` (string, 任意): カンマ区切りの国コード。例: `us,gb,ca`。
- `language`: Top と同様。
- `published_after` / `published_before` (ISO8601, 任意): 公開日時で範囲指定。
- `search` (string, 任意): 単純キーワード検索（AND 検索）。
- その他 `sources`, `not_sources`, `categories`, `limit`, `page` は `/news/top` と同様。

### 用途
- 定期バッチで最新記事を拾う用途に適し、`published_after` を直近24時間に設定すると日次クローリングを実装しやすい。

---

## GET /news/all
全文検索。過去30日分が対象です。

```
GET https://api.thenewsapi.com/v1/news/all
  ?api_token=YOUR_TOKEN
  &search=artificial%20intelligence
  &language=en
  &sort=published_desc
  &limit=25
```

### 主なパラメータ
- `search` (string): フリーテキスト検索。スペースは AND。引用符でフレーズ検索。
- `search_fields` (string, 任意): `title,description,snippet` のいずれかをカンマ区切りで指定。
- `sort` (enum, 任意): `published_desc`（既定）, `published_asc`, `relevance`。
- `published_after` / `published_before`: ISO8601。最大 30 日の範囲。
- `locale`, `language`, `categories`, `sources`, `not_sources`, `limit`, `page`。

### レスポンス注意点
- `meta.found` にヒット総数。`meta.returned` は実際に返した件数。
- 追加フィールド `relevance_score` が付く場合がある（検索適合度 0-1）。

---

## GET /news/sources
利用可能なニュースソースのリストを取得します。

```
GET https://api.thenewsapi.com/v1/news/sources
  ?api_token=YOUR_TOKEN
  &language=en
```

### 主なパラメータ
- `language` (string, 任意)
- `locale` (string, 任意)
- `categories` (string, 任意)

### レスポンス例
```
{
  "data": [
    {
      "id": "cnn",
      "name": "CNN",
      "url": "https://www.cnn.com",
      "categories": ["general"],
      "language": "en",
      "locale": "us"
    }
  ],
  "meta": {
    "returned": 1
  }
}
```

---

## エラーハンドリング
- 認証失敗: `401 Unauthorized` / `"message": "Invalid authentication credentials"`
- レート超過: `429 Too Many Requests`
- パラメータ不備: `400 Bad Request`
- サーバエラー: `500 Internal Server Error`

レスポンス例:
```
400 Bad Request
{
  "message": "Invalid locale parameter provided"
}
```

実装時は HTTP ステータスを優先し、`429` の場合は指数バックオフを行うこと。

## 実装時のベストプラクティス
- API キーはサーバー側で安全に管理（env ファイルやシークレット管理を使用）。
- バッチ処理では `published_after` を前回取得時刻に更新し、重複取得やクォータ消費を抑える。
- `limit` はプランごとの上限以内に収める。無料プランでは 3 を固定値として扱う。
- レスポンスは記事本文全文を返さないため、全文が必要であれば元記事 URL を辿るか、上位プランを検討する。
- `source`（媒体名）や `categories` は標準化されていないため、内部でマッピングテーブルを用意すると分類が安定する。

---

## 参考リンク
- 公式ドキュメント: https://www.thenewsapi.com/documentation
- FAQ / 利用規約: https://www.thenewsapi.com/faq
- プラン比較: https://www.thenewsapi.com/pricing
