# Phase TheNewsAPI Migration

TheNewsAPI への全面移行に伴い、既存の Guardian / NYT 依存コード・データ・ドキュメントを撤廃し、単一プロバイダ構成へ収束させるための実装計画を整理する。ファイル名や型名は互換性維持のため `newsapi` の名称を引き続き使用するが、実体は TheNewsAPI を指す。

## ゴールと非ゴール
- ゴール
  - TheNewsAPI のみを利用するデータフローとし、Guardian / NYT 関連コード・設定・ドキュメントを廃止。
  - ドメイン層・DB・スクリプト・テスト・UI で TheNewsAPI の正規化データを一貫して扱える状態にする。
  - 既存の `SourceItem` インターフェイスを極力保ちつつ、`provider`, `sourceName` などを TheNewsAPI 向けに整備。
- 非ゴール
  - TheNewsAPI の有償プラン特有機能（例: limit 拡張以上のメタデータ）や追加 UI 機能拡張。
  - Supabase スキーマの大幅な再設計（必要最小限の修正のみとする）。

## 前提・調査
1. `docs/api-newsapi.md` を参照し、取得対象エンドポイント・レスポンス構造・制約を理解。
2. 使用予定の API トークンを `.env.local` に設定済みであることを確認（`NEWS_API_KEY`）。
3. 依存ファイルの洗い出し: `rg "guardian"` / `rg "nyt"` で現状の参照状況を把握。
4. Supabase 側の `sources.provider` カラム制約（CHECK / ENUM）を更新可能か確認。

## 実装ステップ

### 1. ドメイン層の整理
- [ ] `src/domain/types.ts` の `Provider` や `SourceItem.sourceName` を TheNewsAPI 専用に更新（互換名称だが意味を合わせる）。
- [ ] `src/domain/newsapi.ts` を TheNewsAPI 向けに実装（`normalizeNewsApiArticle` など）。
- [ ] `src/domain/index.ts` から Guardian / NYT のエクスポートを削除し、TheNewsAPI アダプタを公開。
- [ ] 旧 `src/domain/guardian.ts` / `src/domain/nyt.ts` を削除し、依存を解消。

### 2. API クライアント層
- [ ] `src/lib/api/newsapi-client.ts` を TheNewsAPI 用に実装。`/news/top` / `/news/latest` / `/news/all` をサポートし、`meta` 情報を用いたページングを行う。
- [ ] `src/lib/api/guardian-client.ts` / `src/lib/api/nyt-client.ts` を削除し、呼び出し元を置換。
- [ ] `httpClient` の再試行ポリシーを TheNewsAPI のレート制限（100 req/day, 429 時は待機）に合わせて見直し。

### 3. スクリプト・バッチ
- [ ] `scripts/fetch-newsapi.ts` を TheNewsAPI 用に更新し、Supabase 書き込みまで実装。
- [ ] `scripts/fetch-guardian.ts` / `scripts/fetch-nyt.ts` / `scripts/test-guardian-api.ts` / `scripts/test-nyt.ts` など旧スクリプトを削除。
- [ ] `scripts/setup-supabase.ts` などヘルパーにある Guardian / NYT 参照を TheNewsAPI に置換。
- [ ] `.env.example` / `.env.local` テンプレートから不要なキー（`GUARDIAN_API_KEY`, `NYT_API_KEY` など）を除去し、`NEWS_API_KEY` の説明を TheNewsAPI 向けに更新。

### 4. データベース・型
- [ ] Supabase マイグレーション `supabase/migrations/001_initial_schema.sql` の `CHECK (provider IN (...))` を `'newsapi'`（TheNewsAPI を表す）単体に変更。
- [ ] `src/lib/database.types.ts` の `provider` enum を更新済みか確認。
- [ ] `src/lib/database-utils.ts` の `saveSourceItems` / `getExistingSourceCount` で TheNewsAPI 前提のロジックに整合が取れているか確認（`snippet` や `categories` の取り扱いなど）。
- [ ] 既存の seeded データ（`data/*.json` や `scripts/test-domain.ts` のモック）を TheNewsAPI サンプルに刷新。

### 5. アプリケーション・UI 層
- [ ] `src/domain` を参照するコンポーネント／API ルートで Guardian / NYT 前提の分岐がないか確認し、必要なら TheNewsAPI 固有プロパティに合わせて整理。
- [ ] `src/domain/guardian.ts` などの削除に伴い、`import` エラーがないか全ファイルでチェック。
- [ ] Presentation レイヤーで `sourceName` が NYT/GUARDIAN 固定になっていないか確認し、TheNewsAPI 情報（`article.source` など）を表示。

### 6. ドキュメント・運用
- [ ] `docs/tech-spec.md` と各実装フェーズドキュメントから Guardian / NYT 記述を削除し、TheNewsAPI 単独構成に書き換え。
- [ ] `docs/imp-plan.md` など上位計画書でニュースソースの構成変更を説明。
- [ ] README やセットアップ手順で必要な API トークンが TheNewsAPI のみである旨を明記。
- [ ] GitHub Actions / CI で動作している取得ジョブ（存在する場合）を TheNewsAPI スクリプトに差し替え。

### 7. テスト・検証
- [ ] `scripts/test-domain.ts` などのユニットテスト／スモークスクリプトを TheNewsAPI サンプルに置換。
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`（存在する場合）を実行し、エラーがないことを確認。
- [ ] TheNewsAPI のレスポンスをモックした簡易エンドツーエンドテスト（最低限: 正規化結果が Supabase 保存可能な形になるか）を実施。
- [ ] 必要であれば実際に TheNewsAPI を叩いて `scripts/fetch-newsapi.ts` を試験的に実行し、Supabase へレコードが投入されることを確認。

## 移行後の確認事項
- Supabase テーブルに Guardian / NYT の既存レコードが残る場合、削除または `provider` 値を `'newsapi'`（TheNewsAPI）に揃える移行スクリプトを検討。
- TheNewsAPI は本文の抜粋（`snippet`）のみを返すため、フロントエンドでの要約表示やリンク誘導ルールを明文化。
- レート制限や利用規約に抵触しない取得頻度での運用確認。

## ロールバック戦略
- 必要に応じて TheNewsAPI への切り替えブランチを分け、Guardian / NYT バージョンとの差分を保持。
- Supabase で `provider IN ('guardian','nyt')` を変更する前にバックアップを取得。
- 実運用で問題が検出された場合は Guardian 取得ロジックを戻すためのバックアップブランチを温存（削除ファイルの履歴を保持）。

---
上記ステップを順次実施し、各フェーズ完了時に lint/typecheck/スモークテストで健全性を確認することで、安全に TheNewsAPI 単独構成へ移行する。
