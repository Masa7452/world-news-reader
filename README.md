# News to Blog

## プロジェクト概要
本プロジェクトは、国際的な主要メディアのAPIを情報源として活用し、日本の読者に価値のある多様なコンテンツを自動生成・提供するWebアプリケーションです。ニュースだけでなく、ライフスタイル、テクノロジー、カルチャー、ビジネスなど、幅広いジャンルの記事を日本語で提供します。

## 主な機能
### 多様なコンテンツ収集
- New York TimesとThe Guardian のAPIを情報源として活用
- ニュースだけでなく、コラム、特集記事、トレンド情報など幅広いコンテンツを収集

### AI活用による価値創造
- 収集した情報から日本の読者に需要の高いトピックを自動選定
- カテゴリー別（ビジネス、テクノロジー、ライフスタイル、カルチャー、健康、教育など）に記事を分類
- 選定されたトピックを基に、読者のニーズに合わせた日本語記事を自動生成
- 生成された記事の品質向上のための自動添削・校正

### 幅広いコンテンツカテゴリー
- 国際ニュース・政治経済
- テクノロジー・イノベーション
- ライフスタイル・ウェルネス
- カルチャー・エンターテインメント
- ビジネス・起業
- 教育・学習
- その他、読者の関心が高いトピック

### その他の特徴
- **完全自動化**: 情報収集から記事公開まで、すべてのプロセスを自動化
- **多言語対応**: 英語圏の情報源を日本の読者向けにローカライズ

## 技術スタック
- **フロントエンド**: Next.js (App Router)
- **バックエンド**: Supabase
- **スタイリング**: Tailwind CSS
- **AI/LLM**: OpenAI API / Anthropic Claude API
- **外部API**: New York Times API, The Guardian API

## プロジェクト構造
```
news-to-blog/
├── app/                 # Next.js App Router
├── components/          # Reactコンポーネント
├── lib/                 # ユーティリティ関数
├── hooks/              # カスタムフック
├── types/              # TypeScript型定義
├── styles/             # グローバルスタイル
├── public/             # 静的ファイル
└── docs/               # プロジェクトドキュメント
    ├── requirement-spec.md  # 要件定義書
    ├── tech-spec.md        # 技術仕様書
    └── ui-spec.md          # UI/UX仕様書
```

## セットアップ

### 必要な環境
- Node.js 18.0.0以上
- npm または yarn

### インストール
```bash
# リポジトリのクローン
git clone [repository-url]
cd news-to-blog

# 依存関係のインストール
npm install
```

### 環境変数の設定
`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys
NYT_API_KEY=your_nyt_api_key
GUARDIAN_API_KEY=your_guardian_api_key
OPENAI_API_KEY=your_openai_api_key
```

### 開発サーバーの起動
```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 開発ガイドライン
開発時のコーディング規約や詳細な実装ガイドラインについては、[CLAUDE.md](./CLAUDE.md)を参照してください。

## ドキュメント
- [要件定義書](./docs/requirement-spec.md)
- [技術仕様書](./docs/tech-spec.md)
- [UI/UX仕様書](./docs/ui-spec.md)

## ライセンス
[ライセンス情報をここに記載]