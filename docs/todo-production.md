# 本番稼働までのTODOリスト

この一覧は TheNewsAPI を唯一のソースとする本番運用に向けて必要な残作業を整理したものです。着手前に以下の事前準備を完了させてください。

## 事前準備（オーナーが対応）
- [x] TheNewsAPI の API トークンを取得し、`.env.local` および GitHub Secrets (`NEWS_API_KEY`) に設定
- [x] Supabase の URL / anon key / service role key を `.env.local` と GitHub Secrets に設定
- [ ] Slack Webhook URL を取得（通知を利用する場合）し、環境変数 `SLACK_WEBHOOK_URL` に設定
- [x] Google AI Studio で Gemini API キーを発行し、`.env.local` と GitHub Secrets (`GEMINI_API_KEY`) に登録
- [x] Supabase データベースを最新のマイグレーションに適用し、`sources` / `topics` / `articles` テーブルが空で用意されていることを確認

---

## フロントエンドの実データ対応
- [ ] `src/app/page.tsx` での `mockArticles` 依存を削除し、Supabase から最新記事を取得する処理を実装
- [ ] `src/app/news/[slug]/page.tsx` を実データ読み込み（Supabaseまたは API Route 経由）に置き換え、記事未存在時の 404 ハンドリングを実装
- [ ] `src/components/article-card.tsx` の型定義をモック依存から Supabase レコードベースに刷新し、OGP 取得ロジックとの連携を再確認
- [ ] カテゴリー一覧／記事件数表示を Supabase から動的生成する仕組みに変更
- [ ] モックデータ (`src/data/mock/*`) が不要になった時点で削除、または Storybook 等に限定

## パイプライン実装の本格化
- [ ] `scripts/build-outline.ts` ・ `write-post.ts` ・ `polish-post.ts` ・ `verify-post.ts` のモック処理を Gemini API 呼び出し実装へ更新
- [ ] Gemini 用のプロンプト／パラメータ（モデル選択・安全設定など）を整理し、記事構成・校正・検証の要件に沿うか検証
- [ ] `scripts/pipeline.ts` 内のメトリクス（取得件数・選定件数など）を実際の処理結果から集計するように修正
- [ ] パイプラインをローカルで**フル実行**（dry-run ではなく Supabase 書き込みあり）し、`sources → topics → outlines → drafts → verified → published` の一連が成功することを確認
- [ ] 本番運用前にステージング相当環境でパイプラインを再実行し、想定どおりの件数が生成されるか検証
- [ ] pipeline 成功/失敗時に Slack 通知を送信する処理を有効化し、`SLACK_WEBHOOK_URL` 未設定時の挙動を確認
- [ ] Gemini API 呼び出し時のレート制限・リクエストサイズ上限に対するリトライ／フォールバック処理を実装

## GitHub Actions / 運用
- [ ] `.github/workflows/scheduled-intake.yml` を本番実行用に調整（Secrets が有効か確認、ドライラン時の振る舞い確認）
- [ ] ワークフローに `GEMINI_API_KEY` を注入し、パイプライン実行で Gemini 呼び出しが可能か確認
- [ ] Slate/Artifacts の保存先・保持期間を運用方針に合わせて見直し
- [ ] ワークフローの手動実行 (`workflow_dispatch`) で dry-run と本番モードの両方が成功するか確認

## ドキュメント更新
- [ ] README, About ページ, requirement-spec 等から Guardian / NYT の文言を削除し、TheNewsAPI 前提の説明に更新
- [ ] README に Gemini API の設定手順と利用注意を追記
- [ ] `scripts/setup-supabase.ts` の案内文を TheNewsAPI / Slack / Gemini キー取得手順へ差し替え
- [ ] docs 配下の設計書（特に requirement-spec.md）を最新構成へ統一

## データ・インフラ整理
- [ ] Supabase の初期データ挿入スクリプト（必要であれば）を作成し、本番環境へ投入
- [ ] 既存の `mock` ディレクトリや未使用アセットを精査・削除
- [ ] Supabase の RLS 設定／Policy をレビューし、本番公開前にセキュリティを確認

## テスト計画
- [ ] フロントエンド：主要ページ（ホーム／記事詳細／ダッシュボード）が実データで開くことを確認
- [ ] パイプライン：`pnpm tsx scripts/pipeline.ts --dry-run --skip-fetch` で動作確認後、実データ投入モードで試験実行
- [ ] Gemini 呼び出し部を含む長時間ジョブが GitHub Actions 内でタイムアウトしないことを確認
- [ ] 重大な失敗パターン（TheNewsAPI 429, Supabase エラー, Gemini API エラー）を手動で発生させ、Runbook に記載した対処法が機能するか検証

## モニタリング／通知
- [ ] Slack 通知のメッセージフォーマットとチャンネルを確定
- [ ] GitHub Actions Summary に記録される情報が運用に十分か確認
- [ ] 追加の監視（例: Supabase ログ、Vercel 側の監視）が必要か検討

以上の項目を完了すると、TheNewsAPI ベースで本番公開できる体制が整います。進捗に応じてチェックボックスを更新し、必要に応じてさらに細分化してください。
