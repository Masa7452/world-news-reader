# Phase NewsAPI Migration

NewsAPI への全面移行に伴い、既存の Guardian / NYT 依存コード・データ・ドキュメントを撤廃し、単一プロバイダ構成へ収束させるための実装計画を整理する。作業は影響範囲ごとに順序立てて行い、型やデータフローの破綻を避けつつ段階的に反映する。

## ゴールと非ゴール
- ゴール
  - NewsAPI のみを利用するデータフローとし、Guardian / NYT 関連コード・設定・ドキュメントを廃止。
  - ドメイン層・DB・スクリプト・テスト・UI で NewsAPI の正規化データを一貫して扱える状態にする。
  - 既存の `SourceItem` インターフェイスを極力保ちつつ、`provider`, `sourceName` などを NewsAPI 向けに整備。
- 非ゴール
  - NewsAPI の有償 Content API 実装や追加 UI 機能拡張。
  - Supabase スキーマの大幅な再設計（必要最小限の修正のみとする）。

## 前提・調査
1. `docs/api-newsapi.md` を参照し、取得対象エンドポイント・レスポンス構造・制約を理解。
2. 使用予定の API キーを `.env.local` に設定済みであることを確認（`NEWS_API_KEY`）。
3. 依存ファイルの洗い出し: `rg "guardian"` / `rg "nyt"` で現状の参照状況を把握。
4. Supabase 側の `sources.provider` カラム制約（CHECK / ENUM）を更新可能か確認。

## 実装ステップ

### 1. ドメイン層の整理
- [ ] `src/domain/types.ts` の `Provider` や `SourceItem.sourceName` を NewsAPI 専用に更新（完了済みの場合は確認のみ）。
- [ ] `src/domain/newsapi.ts` を追加し、NewsAPI レスポンス正規化とジャンル推定を実装。
- [ ] `src/domain/index.ts` から Guardian / NYT のエクスポートを削除し、NewsAPI アダプタを公開。
- [ ] 旧 `src/domain/guardian.ts` / `src/domain/nyt.ts` を削除し、依存を解消。

### 2. API クライアント層
- [ ] `src/lib/api/newsapi-client.ts` を作成し、Top Headlines / Everything 取得とページング処理を実装。
- [ ] `src/lib/api/guardian-client.ts` / `src/lib/api/nyt-client.ts` を削除し、呼び出し元を置換。
- [ ] `httpClient` の再試行ポリシーを NewsAPI のレート制限（一律 1req/sec 目安）に合わせて見直し（必要なら待機時間調整）。

### 3. スクリプト・バッチ
- [ ] `scripts/fetch-newsapi.ts`（仮称）を新規作成し、NewsAPI クライアント＋Supabase 書き込みを接続。
- [ ] `scripts/fetch-guardian.ts` / `scripts/fetch-nyt.ts` / `scripts/test-guardian-api.ts` / `scripts/test-nyt.ts` など旧スクリプトを削除。
- [ ] `scripts/setup-supabase.ts` などヘルパーにある Guardian / NYT 参照を NewsAPI に置換。
- [ ] `.env.example` / `.env.local` テンプレートから不要なキー（`GUARDIAN_API_KEY`, `NYT_API_KEY` など）を除去し、`NEWS_API_KEY` の説明を追記。

### 4. データベース・型
- [ ] Supabase マイグレーション `supabase/migrations/001_initial_schema.sql` の `CHECK (provider IN (...))` を `'newsapi'` 単体に変更。
- [ ] `src/lib/database.types.ts` の `provider` enum を更新済みか確認。
- [ ] `src/lib/database-utils.ts` の `saveSourceItems` / `getExistingSourceCount` で NewsAPI 前提のロジックに整合が取れているか確認（キーワード抽出の変更有無など）。
- [ ] 既存の seeded データ（`data/*.json` や `scripts/test-domain.ts` のモック）を NewsAPI サンプルに刷新し、Guardian / NYT のフィールドを削除。

### 5. アプリケーション・UI 層
- [ ] `src/domain` を参照するコンポーネント／API ルートで Guardian / NYT 前提の分岐がないか確認し、必要なら NewsAPI 固有プロパティに合わせて整理。
- [ ] `src/domain/guardian.ts` などの削除に伴い、`import` エラーがないか全ファイルでチェック。
- [ ] Presentation レイヤーで `sourceName` 表記が NYT/GUARDIAN 固定になっていないか確認し、NewsAPI 対応へと名称変更（例: ソース名は記事単位の `article.source.name` を UI に表示）。

### 6. ドキュメント・運用
- [ ] `docs/tech-spec.md` と各実装フェーズドキュメントから Guardian / NYT 記述を削除し、NewsAPI 単独構成に書き換え。
- [ ] `docs/imp-plan.md` など上位計画書でニュースソースの構成変更を説明。
- [ ] README やセットアップ手順で必要な API キーが NewsAPI のみである旨を明記。
- [ ] GitHub Actions / CI で動作している取得ジョブ（存在する場合）を NewsAPI スクリプトに差し替え。

### 7. テスト・検証
- [ ] `scripts/test-domain.ts` などのユニットテスト／スモークスクリプトを NewsAPI サンプルに置換。
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`（存在する場合）を実行し、エラーがないことを確認。
- [ ] NewsAPI のレスポンスをモックした簡易エンドツーエンドテスト（最低限: 正規化結果が Supabase 保存可能な形になるか）を実施。
- [ ] 必要であれば実際に NewsAPI を叩いて `scripts/fetch-newsapi.ts` を試験的に実行し、Supabase へレコードが投入されることを確認。

## 移行後の確認事項
- Supabase テーブルに Guardian / NYT の既存レコードが残る場合、削除または `provider` 値を NewsAPI に揃える移行スクリプトを別途検討。
- NewsAPI の `content` 切り詰め仕様により本文が短いことをフロントエンドでどう扱うか（要約表示やリンク誘導ルール）を明文化。
- レート制限や利用規約に抵触しない取得頻度での運用確認。

## ロールバック戦略
- 必要に応じて NewsAPI への切り替えブランチを分け、Guardian / NYT バージョンとの差分を保持。
- Supabase で `provider IN ('guardian','nyt')` を削除する前にバックアップを取得。
- 実運用で問題が検出された場合は Guardian 取得ロジックを戻すためのバックアップブランチを温存（削除ファイルの履歴を保持）。

---
上記ステップを順次実施し、各フェーズ完了時に lint/typecheck/スモークテストで健全性を確認することで、安全に NewsAPI 単独構成へ移行する。
