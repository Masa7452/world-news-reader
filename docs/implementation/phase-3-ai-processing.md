# Phase 3: AI 処理パイプライン

NewsAPI から取得したソースをもとに、AI エージェントでアウトライン生成からドラフト作成・校正・検証までのパイプラインを整備する。NewsAPI 単独構成でも、従来の多段エージェント設計を維持する。

## 1. 目的
- `topics` テーブルから記事候補を抽出し、ジャンル別テンプレに従ってアウトラインを生成。
- MDX ドラフトを生成し、出典ブロックに NewsAPI の `source.name` / `url` / `publishedAt` を表示。
- 校正（Polisher）と検証（Verifier）で品質チェックを行い、レビュー担当者にフィードバックを提供。

## 2. トピック選定（Selector）
1. 入力: Supabase `sources` テーブルの未処理レコード。
2. 出力: `topics` テーブルに下記情報を保存。
   - `source`: `'newsapi'`
   - `title`, `url`, `published_at`, `abstract`, `section`
   - `genre`: `detectNewsApiGenre` を活用しつつ、AI に最終判定させる
   - `score`: 0-1 の優先度スコア
3. 実装メモ:
   - LLM へ渡すプロンプトに NewsAPI の `bodyText`（content を整形したもの）を利用。
   - 既存 `rank_topics.ts` を改修し、Provider 固有の分岐を削除。

## 3. アウトライン生成（Outliner）
- 入力: `topics` テーブルから選ばれた 1 件。
- 出力: `topic_outlines` テーブル + `/data/outlines/*.json`（開発用）。
- プロンプト:
  - `genre` に応じてテンプレートを切り替え。
  - 出典情報として `topic.url` と `topic.section` を渡し、記事のトーンを指示。

## 4. ドラフト生成（Writer）
- 入力: Topic + Outline + NewsAPI メタデータ。
- 出力: `/content/drafts/{slug}.mdx`
- 出典ブロック例（MDX 内）:
  ```mdx
  :::source
  **出典**: [{title}]({url}) — {sourceName}（{publishedDate}）
  :::
  ```
  - `{sourceName}` は `item.section` または `article.source.name` を使用し、フォールバックで `NewsAPI`。
  - `publishedDate` は `formatISO9075(new Date(publishedAt))` などで整形。

## 5. 校正（Polisher）
- 目的: 日本語自然化、冗長表現の削除、段落構成の調整。
- 実装: LLM へドラフト全文と修正方針を渡し、差分出力を生成。
- 注意: 元記事と矛盾する表現を追加しないよう、Verifier との連携指示を明記。

## 6. 検証（Verifier）
- 目的: 出典整合、ファクトチェック、誇大表現防止。
- 流れ:
  1. NewsAPI の `url` をユーザーに確認してもらう前提で、要約内容が一致しているか LLM で検証。
  2. 問題点は `meta/issues.json` へ JSON 形式で記録し、Slack などで通知。
- 出力例:
  ```json
  {
    "isValid": false,
    "issues": [
      { "type": "warning", "message": "数値の根拠が曖昧" }
    ],
    "suggestions": [
      "PublishedAt を本文中で触れる" ]
  }
  ```

## 7. 公開準備（Publisher）
- 検証を通過したドラフトを `/content/published` へ移動。
- Supabase `articles` テーブルへメタ情報（slug, sources, publishedAt 等）を保存。
- Next.js ISR を再生成し、公開ページを更新。

## 8. チェックリスト
- [ ] Selector → Outliner → Writer → Polisher → Verifier の各スクリプトが個別に実行可能。
- [ ] ドラフトの出典ブロックが NewsAPI 情報を正しく表示。
- [ ] 検証結果が `meta/issues.json` に蓄積され、再実行時も追記方式になる。
- [ ] `pnpm tsx scripts/pipeline.ts --dry-run` でパイプライン全体をシミュレートできる。

## 9. 補足
- NewsAPI の `content` は 200 文字程度で切り詰められるため、AI には `abstract` と記事タイトル・セクション等を与えて推測させる。
- 本文をより詳細に扱いたい場合は、別途 Web スクレイピングや有料 Content API を検討し、利用規約順守を徹底する。
