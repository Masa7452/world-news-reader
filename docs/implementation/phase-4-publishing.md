# Phase 4: 公開システム

AI パイプラインで生成したドラフトをレビューし、公開するフローを整備する。TheNewsAPI 単独構成となったことで、出典表示やメタデータの扱いを簡素化できる。

## 1. 目的
- Review → Publish のオペレーションを確立し、少人数でも継続的に記事を公開できる体制を整える。
- Supabase を経由して公開状態を管理し、Next.js 側で ISR を活用して配信。
- 出典表示・タグ・関連記事リンクなど読者体験を整備。

## 2. 下書きレビュー UI
1. `app/dashboard/drafts`（仮）にレビューページを実装。
2. 表示項目:
   - タイトル / 概要 / 公開予定日
   - 出典一覧（`sources`）— TheNewsAPI の元記事 URL
   - 検証結果（`meta/issues.json` から取得）
3. 操作:
   - 承認 → `articles.status` を `VERIFIED`
   - 差し戻し → コメント入力 → `articles` にメモ保存

## 3. 公開処理
1. 承認された記事を `publish_local.ts`（または `publish.ts`）で `/content/published` へ移動。
2. Supabase `articles` テーブルの `published_at` を更新。
3. Next.js の ISR を `POST /api/revalidate` 等で実行。
4. 公開後に Slack / Email で通知。

## 4. フロントエンド反映
- 記事詳細ページ: 出典セクションを TheNewsAPI 情報に合わせて表示。
  ```tsx
  <SourceList
    sources={article.sources.map(source => ({
      name: source.name ?? 'NewsAPI',
      url: source.url,
      date: source.date,
    }))}
  />
  ```
- カテゴリ・タグ: `topic.genre` と `article.tags` を利用し、関連記事を抽出。
- OGP: `imageUrl` がない場合は共通サムネイルを利用。

## 5. フィード / サイトマップ
- RSS/Atom: 公開済み記事から生成。`source` 情報を `<source>` タグに含める。
- サイトマップ: `/sitemap.xml` を日次で再生成。

## 6. 品質管理
- 公開前チェックリスト:
  - [ ] 出典 URL が有効（HEAD リクエストで 200）
  - [ ] 公開日時が未来日の場合は予約投稿として扱う
  - [ ] 検証結果に `error` が残っていない
  - [ ] 主要メタデータ（title/description/canonical）がセット
- 自動テスト: `pnpm test` で記事コンポーネントのレンダリング確認。

## 7. ロールバック
- 公開後に問題が判明した場合は、`articles.status` を `VERIFIED` に戻し `/content/published` から削除。
- ISR を再実行し、キャッシュを無効化。
- Slack で通知を発行し、再編集フローへ戻す。

## 8. 今後の拡張
- 公開後にアクセス解析（Google Analytics など）を紐付け、PV/滞在時間を記録。
- 記事末尾に関連ニュース（同じ `section` や `tags` の記事）を表示。
- TheNewsAPI の `source` 名を利用し、媒体別フィルタページを実装。
