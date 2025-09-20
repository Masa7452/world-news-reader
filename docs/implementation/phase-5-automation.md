# Phase 5: 自動化と運用

NewsAPI 単独構成で稼働するパイプラインを、GitHub Actions と監視で自動運用する。失敗時に即座に検知し、再実行できる体制を整備する。

## 1. 目的
- 定期的に NewsAPI から記事を取得し、AI パイプラインを実行。
- 成功 / 失敗を通知し、メトリクスを蓄積。
- 運用ドキュメントと Runbook を整備。

## 2. スケジュール実行
- `.github/workflows/scheduled-intake.yml`
  - JST 06:00 / 12:00（UTC 21:00 / 03:00）で実行。
  - ステップ例:
    1. チェックアウト
    2. Node.js セットアップ（20）
    3. `pnpm install --frozen-lockfile`
    4. `pnpm lint && pnpm typecheck`
    5. `pnpm tsx scripts/pipeline.ts`
    6. 成功時に報告（GitHub Actions Summary / Slack）

## 3. 環境変数とシークレット
- `NEWS_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`（AI 連携）
- 通知用: `SLACK_WEBHOOK_URL` など

## 4. 監視・通知
- 成功通知: Slack チャンネルへ件数サマリ（取得件数、生成ドラフト数、公開数）。
- エラー通知: 例外メッセージ・スタックトレースを付与。
- 再試行: GitHub Actions の `workflow_run` もしくは手動 `workflow_dispatch`。

## 5. ログ保管
- `scripts/pipeline.ts` で `logs/pipeline-{timestamp}.log` を出力（CI ではアーティファクトに添付）。
- Supabase `sources` / `topics` テーブルに処理フラグ（`processed_at`）を付与し、未処理を可視化。

## 6. Runbook（障害対応）
1. 取得失敗（NewsAPI 429）
   - 原因: レート制限超過
   - 対処: `NEWS_API_KEY` のプランを確認、取得間隔と `pageSize` を調整
2. Supabase 接続失敗
   - 原因: サービスロールキーが無効
   - 対処: 新しいキーを発行しシークレット更新、`pnpm supabase status` で接続確認
3. LLM 失敗
   - 原因: API キー期限切れ / レート超過
   - 対処: リトライポリシーを見直し、必要ならバックアップモデルへ切替
4. デプロイ不具合（ISR 反映遅延）
   - 対処: `pnpm tsx scripts/revalidate.ts`（仮）で手動再生成、Vercel ダッシュボードで確認

## 7. 運用指標
- 取得成功率（%）
- 生成ドラフト数 / 公開数
- 手動レビュー完了までの平均時間
- エラー発生率（種別別）

## 8. 継続改善メモ
- NewsAPI の有料プランに移行した際は、クォータ変更をドキュメント化し、バッチ間隔を最適化。
- Supabase への書き込みがボトルネックになる場合は、バルク挿入やキューイングを検討。
- GitHub Actions の代わりに自前のスケジューラ（Supabase Functions / Cloud Run）へ移行する場合の比較表を作成。
