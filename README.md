# World News Reader ☕️

**世界の話題をゆっくり知ろう**

コーヒーブレイクのようなゆったりとした時間に、世界の興味深い話題を日本語で楽しめるニュースリーダーです。

## プロジェクト概要

World News Readerは、The GuardianやThe New York Timesなどの信頼できる国際メディアから厳選された記事を、読みやすい日本語で提供するWebアプリケーションです。急がず、じっくりと読める記事構成で、英語学習にもお使いいただけます。

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
- **AI/LLM**: OpenAI API / Anthropic Claude API
- **外部API**: New York Times API, The Guardian API

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
- ✅ モックデータでの記事表示
- ✅ カテゴリー別記事フィルタリング
- ✅ タグページ機能
- ✅ 記事詳細ページ
- ✅ レスポンシブデザイン
- ⏳ 外部API連携（今後の予定）

## 開発ガイドライン
開発時のコーディング規約や詳細な実装ガイドラインについては、[CLAUDE.md](./CLAUDE.md)を参照してください。

## ドキュメント
- [開発ガイドライン](./CLAUDE.md)
- [要件定義書](./docs/requirement-spec.md)
- [技術仕様書](./docs/tech-spec.md)
- [UI/UX仕様書](./docs/ui-spec.md)

---

Made with ☕ for thoughtful readers | © 2025 World News Reader