# World News Reader ☕️

TheNewsAPI から取得した最新トピックを Supabase に蓄積し、AI パイプラインで日本語記事を生成・公開するためのリポジトリです。ここでは **ローカル検証** と **本番運用** を最小限の手順で切り替えられるようにまとめています。

---

## 1. 前提ツール
| ツール | バージョンの目安 | 用途 |
| --- | --- | --- |
| Node.js | v18 以上 | Next.js / スクリプト実行 |
| pnpm | v8 以上 | パッケージ管理 |
| Supabase CLI | v1 以上 | ローカル Supabase 起動（`supabase start`） |
| Docker | 最新 | Supabase ローカル実行に必要 |
| dotenv CLI | 付属（pnpm scripts 内） | `.env` の切り替え実行 |

---

## 2. 環境ファイルの切り替え
| ファイル | 用途 | 主な値 |
| --- | --- | --- |
| `.env.local` | ローカル検証用（Supabase ローカル） | `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`、`supabase/.branches/main/.env` に記載の `anon/service_role` キー |
| `.env.prod`  | 本番／ステージング用 | Supabase 本番 URL・鍵、NewsAPI/Gemini の本番キー |

コマンド実行時は **dotenv CLI** で対象の `.env` を指定します。

以降のコマンドは npm scripts にまとめてあります（`pnpm <script>` で実行）。

> `.env.prod` には本番用の機密値を記載してください（リポジトリにはコミットしない）。

---

## 3. 初期セットアップ

### 3.1 必要なAPIキーの取得
本プロジェクトの運用には以下のAPIキーが必要です：
- **TheNewsAPI**: [newsapi.org](https://newsapi.org/) でアカウント作成し、APIキーを取得
- **Google Gemini API**: [Google AI Studio](https://aistudio.google.com/) でAPIキーを発行
- **Supabase**: プロジェクト作成後、URL・Anonキー・Service Roleキーを取得

### 3.2 ローカル環境セットアップ
1. **Docker起動**（Supabase ローカル実行に必要）
   ```bash
   # Docker Desktopを起動してから実行
   ```

2. **Supabaseローカル環境を起動**
   ```bash
   supabase start            # 初回は Docker イメージの取得に時間がかかります
   ```

3. **環境変数を設定**
   ```bash
   # Supabase CLI が生成したキーを .env.local にコピー
   cp supabase/.branches/main/.env .env.local
   
   # 追加で以下を .env.local に設定
   NEWS_API_KEY=your_newsapi_key
   GEMINI_API_KEY=your_gemini_key
   TARGET_ARTICLE_COUNT=5
   ```

4. **依存関係をインストール**
   ```bash
   pnpm install
   ```

5. **データベース初期化**
   ```bash
   pnpm supabase db reset    # マイグレーション適用とテーブル作成
   ```

6. **動作確認**
   ```bash
   # パイプラインのドライラン（DB書き込みなし）
   pnpm pipeline:local:dry
   
   # 実データでのテスト実行
   pnpm pipeline:local
   
   # フロントエンド起動
   pnpm dev
   # http://localhost:3000 を開いて記事を確認
   ```

### 3.3 Supabase管理画面
- **ローカル**: `http://127.0.0.1:54323` でSupabase Studioにアクセス
- **テーブル確認**: `sources` / `topics` / `articles` テーブルでデータフローを追跡可能
- **データリセット**: `supabase db reset` で全データクリア

---

## 4. コマンド一覧（よく使う操作）
| 目的 | ローカル | 本番 |
| --- | --- | --- |
| トップニュースを取得（デフォルト20件） | `pnpm fetch:local` | `pnpm fetch:prod` |
| カテゴリ限定で取得 | `pnpm fetch:local -- --categories="business,technology" --limit=15` | `pnpm fetch:prod -- --categories=...` |
| パイプライン実行 | `pnpm pipeline:local` | `pnpm pipeline:prod` |
| ドライラン（書き込みなし） | `pnpm pipeline:local:dry` | `pnpm pipeline:prod:dry` |
| ニュース取得のみスキップ | `pnpm pipeline:local -- --skip-fetch` | `pnpm pipeline:prod -- --skip-fetch` |
| トピック選定までで停止 | `pnpm pipeline:local -- --only-rank` | `pnpm pipeline:prod -- --only-rank` |

※ `.env` で以下の環境変数を設定可能：
- `NEWS_TOP_CATEGORIES`, `NEWS_TOP_LIMIT`, `NEWS_TOP_LOCALE` - 記事取得のデフォルト値
- `TARGET_ARTICLE_COUNT` - パイプラインで生成する記事の最大数（デフォルト: 5）

---

## 5. パイプラインの詳細フロー

### 5.1 各ステップの役割と処理内容

| ステップ | スクリプト | 役割 | 入力 | 出力 | Gemini API |
| --- | --- | --- | --- | --- | --- |
| 1. ニュース取得 | `fetch-newsapi.ts` | TheNewsAPIから最新記事を取得 | APIパラメータ（カテゴリ、件数等） | `sources` テーブルに記事メタデータを保存 | 使用なし |
| 2. トピック選定 | `rank-topics.ts` | 記事の重要度をスコアリングし選別 | `sources` の未処理記事（processed_at=null） | `topics` テーブルに選定結果を保存、上位5件を選出 | 使用なし |
| 3. アウトライン生成 | `build-outline.ts` | 記事構成を設計 | `topics` の未処理記事 | `topics.outline` にJSON形式で保存 | **Flash × 1回/記事** |
| 4. 記事執筆 | `write-post.ts` | 日本語記事本文を生成 | `topics` のアウトライン | `articles` テーブルにMDXドラフトを保存 | **Pro × 1回/記事** |
| 5. 記事校正 | `polish-post.ts` | 文章の洗練と読みやすさ向上 | `articles` のドラフト | `articles.content` を更新 | **Flash × 1回/記事** |
| 6. 記事検証 | `verify-post.ts` | 事実確認と中立性チェック | `articles` の校正済み記事 | 検証結果をメタデータに追加 | **Flash × 1回/記事** |
| 7. 公開処理 | `publish-local.ts` | 記事を公開状態に変更 | `articles` の検証済み記事 | `status` を 'published' に更新 | 使用なし |

### 5.2 データフローの詳細

```
[TheNewsAPI] → (1)fetch → [sources テーブル]
                              ↓
                          (2)rank → [topics テーブル]
                                        ↓
                                    (3)outline → [topics.outline]
                                                    ↓
                                                (4)write → [articles テーブル]
                                                              ↓
                                                          (5)polish → [articles.content]
                                                                        ↓
                                                                    (6)verify → [articles.metadata]
                                                                                  ↓
                                                                              (7)publish → [articles.status='published']
                                                                                            ↓
                                                                                      [フロントエンド表示]
```

### 5.3 処理の特徴

- **段階的処理**: 各ステップは前のステップの出力を入力として使用
- **冪等性**: `processed_at` フラグにより同じ記事を重複処理しない設計
- **スコアリング基準**: 記事の新鮮度、要約の充実度、画像の有無等を総合評価（0.0〜1.0のスコア）
- **重複排除**: `canonical_key` により類似記事を自動除外

### 5.4 Gemini API 利用状況と料金推定

#### API呼び出し回数（TARGET_ARTICLE_COUNT=5の場合）

| モデル | 用途 | 呼び出し回数 | 平均トークン数（推定） |
| --- | --- | --- | --- |
| Gemini 1.5 Flash | アウトライン生成 | 5回 | 入力: 500 / 出力: 300 |
| Gemini 1.5 Pro | 記事本文生成 | 5回 | 入力: 1,000 / 出力: 2,000 |
| Gemini 1.5 Flash | 記事校正 | 5回 | 入力: 2,500 / 出力: 2,000 |
| Gemini 1.5 Flash | 記事検証 | 5回 | 入力: 2,500 / 出力: 500 |

#### 料金推定（2025年1月時点の情報に基づく概算）

**注意**: 以下は2025年1月の調査に基づく推定値です。実際の料金はGoogle AI Studioで確認してください。

- **Gemini 2.5 Flash-Lite** を使用する場合（最も経済的）:
  - 入力: $0.10/1M トークン
  - 出力: $0.40/1M トークン
  - 5記事の推定コスト: **約 $0.01〜0.02**

- **Gemini 2.5 Flash** を使用する場合:
  - 入力: $0.30/1M トークン  
  - 出力: $2.50/1M トークン
  - 5記事の推定コスト: **約 $0.05〜0.10**

**月間コスト目安**（1日1回実行、月30回の場合）:
- Flash-Lite使用: 約 $0.30〜0.60/月
- Flash使用: 約 $1.50〜3.00/月

> ⚠️ 実際のコストは記事の長さ、複雑さ、再試行回数により変動します。
> 本番運用前に少量のテストを実施し、実際のトークン消費量を確認することを推奨します。

> `sources.processed_at` が null のものだけが処理対象です。動作がおかしい場合は Supabase Studio で `processed_at` の値を確認してください。

---

## 6. 本番環境セットアップ

### 6.1 Supabase本番環境
1. **プロジェクト作成**: [supabase.com](https://supabase.com/) でプロジェクト作成
2. **CLI接続**:
   ```bash
   supabase login
   supabase link --project-ref <プロジェクトID>
   ```
3. **マイグレーション適用**:
   ```bash
   supabase db push  # migrations/*.sql を本番DBに反映
   ```

### 6.2 GitHub Actionsの設定
以下のSecretsをGitHubリポジトリに設定：
- `NEWS_API_KEY`: TheNewsAPIキー
- `GEMINI_API_KEY`: Google Gemini APIキー  
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase本番URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anonキー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Roleキー

### 6.3 自動化パイプライン
- `.github/workflows/scheduled-intake.yml` で定期実行
- 手動実行: Actions画面から「Run workflow」
- 本番実行: `pnpm pipeline:prod`

---

## 7. トラブルシュート
| 症状 | よくある原因 | 対処 |
| --- | --- | --- |
| 記事取得が 0 件 | TheNewsAPI の件数不足／ロケールが絞り込みすぎ | `pnpm fetch:local -- --locale=...` で条件を緩める、時間を置いて再実行 |
| Supabase に書き込まれない | `.env` の `USE_SUPABASE` が `false`、またはキー未設定 | `.env` を見直し、`USE_SUPABASE=true` に設定 |
| パイプラインが topics を生成しない | `sources` の `processed_at` が null でない | Supabase Studio で `processed_at` を null に戻すか、新しい `sources` を投入 |
| articles が生成されない | Gemini API キー未設定／利用制限 | `.env` の `GEMINI_API_KEY` を設定し、ログのエラーメッセージを参照 |
| `supabase start` 失敗 | Docker未起動 | Docker Desktopを起動してから再実行 |
| マイグレーション失敗 | 接続設定エラー | `supabase status` で状態確認、`supabase login` で再認証 |
| Gemini API エラー | レート制限／認証エラー | APIキー確認、しばらく待ってから再実行 |

---

## 8. 開発ガイド

### 8.1 コーディング規約
- **ブランドコンセプト**: 「世界の話題をゆっくり知ろう☕️」
- **TypeScript**: `any`禁止、型安全性を最優先
- **関数**: アロー関数のみ、`map`/`filter`/`reduce`を優先
- **命名**: 説明的な名前、`enhancedX`等の曖昧な修飾子を避ける
- **コメント**: ビジネスロジックの意図のみ、実装詳細は書かない

### 8.2 開発フロー
1. **小さなステップ**: 1つのタスク → 実装 → コミット
2. **型チェック**: `pnpm typecheck` で型安全性確認
3. **リント**: `pnpm lint` でコードスタイル確認
4. **テスト**: 主要機能の動作確認

### 8.3 プロジェクト構成
```
src/
├── app/              # Next.js App Router
├── components/       # UIコンポーネント
├── domain/          # ドメインロジック・型定義
├── lib/             # ユーティリティ・API クライアント
└── types/           # 型定義

scripts/             # パイプライン実行スクリプト
supabase/           # DB マイグレーション
```

---

Made with ☕ for thoughtful readers | © 2025 World News Reader
