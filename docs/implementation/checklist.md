# 実装チェックリスト（TheNewsAPI 移行後）

## Phase 1: 基盤構築
- [ ] `src/domain/types.ts` の Provider/SourceItem などが `'newsapi'` 前提になっている
- [ ] `src/domain/newsapi.ts` の正規化ロジックがモックデータで検証済み（TheNewsAPI サンプル）
- [ ] Supabase マイグレーションで `provider` CHECK が `'newsapi'`
- [ ] `.env.local` に `NEWS_API_KEY` を設定

## Phase 2: データ収集
- [ ] `src/lib/api/newsapi-client.ts` のページングとエラーハンドリングが実装済み
- [ ] `scripts/fetch-newsapi.ts` で取得 → Supabase 保存が成功
- [ ] JSON サンプルが `data/samples/` に出力される（開発用）
- [ ] 429 / ネットワークエラー時に指数バックオフが機能

## Phase 3: AI パイプライン
- [ ] Selector / Outliner / Writer / Polisher / Verifier スクリプトが動作
- [ ] ドラフトに TheNewsAPI 出典ブロックが挿入される
- [ ] `meta/issues.json` に検証結果が記録される
- [ ] `pnpm tsx scripts/pipeline.ts --dry-run` で一連の流れが確認できる

## Phase 4: 公開
- [ ] レビュー UI でドラフト一覧・出典・検証結果が確認できる
- [ ] 承認 → 公開 → ISR 再生成のフローが確立されている
- [ ] RSS / サイトマップが TheNewsAPI データで生成される
- [ ] 公開後の Rollback 手順がドキュメント化されている

## Phase 5: 自動化
- [ ] GitHub Actions (`scheduled-intake.yml`) が TheNewsAPI 用パイプラインを実行
- [ ] シークレット（`NEWS_API_KEY` など）が登録済み
- [ ] 成功 / 失敗通知が Slack 等に届く
- [ ] Runbook が最新化されている

## Phase 6: ポストローンチ整備
- [ ] ホーム／記事詳細／ダッシュボードが Supabase 実データを表示
- [ ] Gemini API を用いた Outline/Writer/Polisher/Verifier が実装済み
- [ ] `scripts/pipeline.ts` のメトリクスと Slack 通知が稼働
- [ ] GitHub Actions（dry-run / 本番モード）が成功する
- [ ] README / docs に最新構成（TheNewsAPI & Gemini）が反映
- [ ] 重大エラー（429 / Gemini / Supabase）を Runbook と照合し検証済み
