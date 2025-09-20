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

## Phase TheNewsAPI Migration
- [ ] Guardian / NYT 関連ファイル・ドキュメントが削除済み
- [ ] 旧サンプルデータが TheNewsAPI ベースに置き換わっている
- [ ] README / tech-spec / 各フェーズ設計書が TheNewsAPI 仕様を反映
- [ ] Supabase 既存レコードの `provider` が `'newsapi'` に統一
