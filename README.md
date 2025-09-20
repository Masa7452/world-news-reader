# World News Reader ☕️

**世界の話題をゆっくり知ろう**

コーヒーブレイクのようなゆったりとした時間に、世界の興味深い話題を日本語で楽しめるニュースリーダーです。

## 🌐 Live Demo

**https://world-news-reader-ado6.vercel.app/**

## プロジェクト概要

World News Readerは、TheNewsAPI（https://www.thenewsapi.com/）から取得した記事をもとに、読みやすい日本語で提供するWebアプリケーションです。急がず、じっくりと読める記事構成で、英語学習にもお使いいただけます。

## 主な特徴

### 📰 厳選されたコンテンツ
- 信頼できる国際メディアから質の高い記事を厳選
- 5分程度で読める適切な記事長
- 複雑な国際情勢も分かりやすく要約

### 🎨 Pocket風のモダンなデザイン
- シンプル＆読みやすさを重視したUI/UX
- 3つのテーマ: Light（白ベース）/ Sepia（温かみのある色調）/ Dark（ダーク）
- カテゴリー別にカラフルなタグで視覚的に分類

### 🌍 幅広いカテゴリー
- 環境・サステナビリティ
- テクノロジー・AI
- ライフスタイル・ウェルネス
- ヘルスケア・医療
- ビジネス・経済
- カルチャー・アート
- 政治・社会
- スポーツ・エンターテインメント
- 科学・教育・旅行

### 🎯 ユーザー体験の最適化
- レスポンシブデザインで全デバイス対応
- 記事の要点を箇条書きで事前表示
- 関連記事の自動表示
- ネイティブシェア機能

## 技術スタック
- **フロントエンド**: Next.js (App Router)
- **バックエンド**: Supabase
- **スタイリング**: Tailwind CSS
- **AI/LLM**: Gemini API（Google AI Studio）
- **外部API**: TheNewsAPI

## プロジェクト構造
```
world-news-reader/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── about/          # Aboutページ
│   │   ├── news/[slug]/    # 記事詳細ページ
│   │   ├── tags/           # タグ関連ページ
│   │   ├── globals.css     # グローバルスタイル
│   │   ├── layout.tsx      # レイアウト
│   │   └── page.tsx        # ホームページ
│   ├── components/          # Reactコンポーネント
│   │   ├── layout/         # レイアウトコンポーネント
│   │   ├── ui/             # UI基盤コンポーネント
│   │   ├── ArticleCard.tsx # 記事カード
│   │   ├── ArticleTag.tsx  # カラフルタグ
│   │   └── TopBar.tsx      # ヘッダーナビ
│   ├── data/
│   │   └── mock/           # モックデータ
│   └── lib/                # ユーティリティ
├── docs/                   # プロジェクトドキュメント
├── tailwind.config.ts      # Tailwind設定
├── components.json         # shadcn/ui設定
└── CLAUDE.md              # 開発ガイドライン
```

## セットアップ

### 必要な環境
- Node.js 18.0.0以上
- pnpm（推奨）または npm

### インストール
```bash
# リポジトリのクローン
git clone [repository-url]
cd world-news-reader

# 依存関係のインストール
pnpm install
```

### 開発サーバーの起動
```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## パイプライン運用

### 自動実行スケジュール
- **JST 06:00 / 12:00** (UTC 21:00 / 03:00) に自動実行
- GitHub Actions により TheNewsAPI から記事を取得し、AI処理を経て記事を生成

### 手動実行
```bash
# 基本的な実行
pnpm tsx scripts/pipeline.ts

# オプション付き実行
pnpm tsx scripts/pipeline.ts --dry-run              # DB操作なしで動作確認
pnpm tsx scripts/pipeline.ts --skip-fetch            # 記事取得をスキップ
pnpm tsx scripts/pipeline.ts --only-rank             # トピック選定まで実行
pnpm tsx scripts/pipeline.ts --days 3 --query "AI"   # 3日間のAI関連記事を取得
```

### 障害対応（Runbook）

#### 1. レート制限エラー（HTTP 429）
```
原因: TheNewsAPI の利用制限超過
対処:
  - NEWS_API_KEY のプランを確認（無料プラン: 100req/day）
  - --days オプションで取得期間を短縮
  - 1時間後に再実行
```

#### 2. 認証エラー（HTTP 401）
```
原因: APIキーが無効または期限切れ
対処:
  - .env.local の NEWS_API_KEY を確認
  - TheNewsAPI ダッシュボードでキーの有効性を確認
  - GitHub Secrets の NEWS_API_KEY を更新
```

#### 3. Supabase接続エラー
```
原因: サービスロールキーが無効
対処:
  - Supabaseダッシュボードで新しいキーを発行
  - GitHub Secrets の SUPABASE_SERVICE_ROLE_KEY を更新
  - pnpm supabase status で接続確認
```

#### 4. AI API エラー
```
原因: OpenAI/Anthropic APIの問題
対処:
  - APIキーの有効期限を確認
  - 利用制限を確認
  - 5分後に再実行
```

### 監視とアラート
- 成功/失敗は GitHub Actions Summary に記録
- Slack通知（SLACK_WEBHOOK_URL 設定時）
- エラーログは GitHub Actions Artifacts に7日間保存

## 技術仕様

### デザインシステム
- **3テーマ対応**: Light / Sepia / Dark
- **CSS Variables**: テーマ切り替えに対応した設計
- **カラフルタグ**: 17色のPocket/Google風タグシステム
- **レスポンシブ**: モバイルファーストなデザイン

### 主要コンポーネント
- `TopBar`: テーマ切り替え機能付きヘッダー
- `ArticleCard`: 記事カード表示
- `ArticleTag`: カテゴリー別カラフルタグ
- `MarkdownContent`: 記事本文表示

### 現在の実装状況
- ✅ TheNewsAPI連携による記事取得
- ✅ AIによる記事生成パイプライン
- ✅ モックデータでの記事表示
- ✅ カテゴリー別記事フィルタリング
- ✅ タグページ機能
- ✅ 記事詳細ページ
- ✅ レスポンシブデザイン
- ✅ GitHub Actions による自動化

## 開発ガイドライン
開発時のコーディング規約や詳細な実装ガイドラインについては、[CLAUDE.md](./CLAUDE.md)を参照してください。

## ドキュメント
- [開発ガイドライン](./CLAUDE.md)
- [要件定義書](./docs/requirement-spec.md)
- [技術仕様書](./docs/tech-spec.md)
- [UI/UX仕様書](./docs/ui-spec.md)
- [Supabase 操作ガイド](./docs/supabase-guide.md)

---

Made with ☕ for thoughtful readers | © 2025 World News Reader
