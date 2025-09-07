# 開発実装計画書（5フェーズ／段階デプロイ対応） — *world-news-reader*

> 本計画は提供されたドキュメント群（要件定義・UI仕様・技術仕様・API仕様・コーディング規約）を踏まえ、  
> **UI先行／Mockデータ駆動 → バックエンド・AI接続 → 本番運用** の流れで段階的にデプロイ可能な形で進めるための計画です。  
> 初期フェーズでは **型チェック・Lint を緩めに設定**し、開発スピードを優先します。後のフェーズで必要に応じて厳格化します。

---

## 0. 全体方針

- **UIから着手**：まずは Mock データを使い、フロントエンドの価値を早期に公開。  
- **段階的に機能追加**：フェーズごとにリリース可能な状態を作る。  
- **ドメイン集約**：APIごとの差異は `domain/` で吸収し、UIやパイプラインは正規化データ型のみ扱う。  
- **品質ゲート（ゆるめ運用）**：
  - `pnpm lint` → 警告は許容  
  - `pnpm typecheck` → `strict=false`（初期）  
  - `pnpm test` → 最低限のユニットテスト  
  - `check:strict` を用意し、必要に応じて実行  

---

## フェーズ計画

### フェーズ1：UIスケルトン & Mockデータ
**目的**: 最小限の閲覧体験を提供し、Vercelに初回デプロイする。  

- ページ構成: `/`（記事一覧）, `/news/[slug]`, `/tags/[tag]`, `/about`  
- コンポーネント: Card, Badge, Breadcrumb, Separator, Skeleton, Toggle (ダークモード)  
- Tailwind + shadcn/ui 導入  
- Mockデータ (`/data/mock/`) を用いた記事カード表示  
- 出典ブロック（媒体名・URL・日付をダミー表示）  
- CI: `pnpm lint`, `pnpm typecheck`, `pnpm test` の最低限実行  

**デプロイ成果物**:  
- 一覧ページ・記事詳細ページが動作し、モック記事が閲覧できる状態  

---

### フェーズ2：MDX対応 & 検索・ナビゲーション
**目的**: 記事表示の完成度を高め、UXを改善する。  

- MDX レンダリング対応（本文を `bodyMdx` として表示）  
- H2/H3 から自動目次生成  
- Cmd+K コマンドパレット（記事検索）  
- シェアボタン（X / FB / リンクコピー）  
- 空状態・エラーメッセージ表示  
- ページネーション（初期版）  
- SEO対策: OGP・サイトマップ・構造化データ  

**デプロイ成果物**:  
- 本番環境で「記事らしいページ」を表示可能  

---

### フェーズ3：ドメイン契約 & パイプライン雛形（Mock接続）
**目的**: API差異を吸収するドメイン層と、記事生成パイプラインの土台を構築。  

- `domain/types.ts` に正規化型 (`SourceItem`, `Topic`, `Article`) を定義  
- `domain/guardian.ts`, `domain/nyt.ts` にモックレスポンス→正規化の変換処理  
- `scripts/` にパイプライン雛形作成：
  - `fetch_guardian.ts`, `fetch_nyt.ts` → `data/sources.jsonl` 追記  
  - `rank_topics.ts`（重複排除・スコア付与）  
  - `build_outline.ts`（ジャンル別アウトライン）  
  - `write_post.ts`（MDXドラフト）  
  - `polish_post.ts`（日本語整形）  
  - `verify_post.ts`（出典整合性チェック）  
  - `publish_local.ts`（承認済み記事を `/content/published` に移動）  
- CLIから `node --loader tsx scripts/pipeline.ts --dry-run` で通るように  

**デプロイ成果物**:  
- UI は `/content/drafts` を参照して記事を表示（モック下書きファイル）  

---

### フェーズ4：実API接続 & 定期バッチ
**目的**: NYT／Guardian APIから実データを取り込み、AIを通して下書きを生成。  

- 実API呼び出し実装（NYT/Guardian APIキー利用、429/5xx時は指数バックオフ）  
- `scripts/fetch_guardian.ts` / `fetch_nyt.ts` を実データ取得に切り替え  
- AIエージェント（Selector, Outliner, Writer, Polisher, Verifier）連携  
- GitHub Actions (`.github/workflows/scheduled-intake.yml`) で朝/昼に自動実行  
- 承認ダッシュボード（下書き→公開操作）  

**デプロイ成果物**:  
- 実ニュースから自動生成した下書き記事を確認できる  
- 承認後に公開し、ISRで即時反映  

---

### フェーズ5：Supabase永続化 & 本番運用
**目的**: データ管理・運用を本番レベルに引き上げる。  

- Supabase DB 連携：記事メタ情報／タグ／公開状態を保存  
- ダッシュボードでDBベースの記事管理  
- エラーログ／通知（再試行／失敗時アラート）  
- Core Web Vitals 改善（ISR・キャッシュ戦略・画像最適化）  
- 広告／アフィリエイトUI実装（ポリシー準拠で本文H2直下・末尾・PCサイド）  
- 本番ドメイン運用  

**デプロイ成果物**:  
- 安定稼働する本番サイト  
- 自動生成＋レビュー承認フロー＋収益化導線  

---
