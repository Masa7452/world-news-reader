# docs/tech-spec.md
## 開発者向け詳細仕様書（MVP/自動運用）

この文書は運用の中心となる技術的な合意事項を定義します。API仕様の詳細は下記の個別設計書を参照してください。
- The Guardian: docs/api-guardian.md
- The New York Times: docs/api-nyt.md

### 0. 重要方針（ドメイン集約）
- API固有ロジック（フィールド差異の吸収・マッピング・前処理）は domain 層に集約し、他レイヤー（選定/構成/執筆/校正/公開）は正規化済み型のみを扱う。
- 正規化の入出力は厳密に型で拘束し、ドメイン契約（contract）としてバージョン管理する。
- パイプラインやUIは provider に依存しない（拡張時は domain にアダプタを追加）。

### 1. 範囲と前提
- データ取得は The Guardian Content API と The New York Times APIs のみを使用。
- 取得するのはメタデータ（タイトル/URL/公開日/要旨/セクション等）。本文の保存はしない。
- AIは多段エージェントで実施：Selector → Outliner → Writer → Polisher → Verifier → Publisher。

### 2. 技術スタック
- Web: Next.js 15 (App Router, MDX, ISR), TypeScript, Tailwind, shadcn/ui
- 自動処理: Node.js (TS) スクリプト + GitHub Actions（cron）
- データ: リポ内ファイル（/data, /content, /meta）→ 将来DB化可能
- AI: OpenAI/Anthropic（ハイブリッド可）
- ホスティング: Vercel（ISRで即時反映）

### 3. ディレクトリ構成（シンプル版）
```
news-to-blog/
├── app/                         # Next.js App Router
├── components/                  # UIコンポーネント
├── lib/                         # 共通ユーティリティ（SEO 等は lib/seo）
├── content/
│   ├── drafts/
│   └── published/
├── domain/                      # API固有のドメイン集約
│   ├── guardian.ts              # Guardianアダプタと型
│   ├── nyt.ts                   # NYTアダプタと型
│   └── types.ts                 # 正規化型（SourceItem/Topic/Article等）
├── scripts/                     # 自動処理（Cron実行対象）
│   ├── fetch_guardian.ts
│   ├── fetch_nyt.ts
│   ├── rank_topics.ts
│   ├── build_outline.ts
│   ├── write_post.ts
│   ├── polish_post.ts
│   ├── verify_post.ts
│   ├── publish_local.ts
│   └── pipeline.ts
├── prompts/
│   └── templates/               # news.md, health.md, product.md, trend.md, glossary.md
├── data/
│   ├── sources.jsonl
│   └── queue.csv
├── meta/
│   └── issues.json
├── docs/
├── public/
├── styles/
├── next.config.mjs
└── .github/workflows/scheduled-intake.yml
```

### 4. データモデル（ドメイン契約）
以下は正規化済みのドメイン契約。provider 差異は domain 層で吸収する。

```
type Provider = 'guardian' | 'nyt'

type SourceItem = {
  provider: Provider;            // 供給元
  providerId: string;            // 供給元の安定識別子（Guardian: id / NYT: uri など）
  url: string;                   // 記事URL
  title: string;                 // 見出し
  abstract?: string;             // 要旨（保存方針に留意）
  publishedAt: string;           // ISO8601
  section?: string;              // 例: Technology / World news
  subsection?: string;           // NYTで利用
  byline?: string;               // 署名
  tags?: string[];               // キーワード/ファセット
  type?: string;                 // 記事種別（analysis/opinion等）
  wordCount?: number;            // 語数
  image?: { url: string; caption?: string; credit?: string };
  sourceName: 'The Guardian' | 'The New York Times';
}

type Topic = {
  id: string;                    // uuid
  source: Provider;              // 供給元
  title: string;
  url: string;
  publishedAt: string;           // ISO8601
  abstract?: string;
  section?: string;
  score: number;                 // 選定スコア
  status: 'NEW'|'QUEUED'|'REJECTED'|'OUTLINED'|'DRAFTED'|'VERIFIED'|'PUBLISHED';
  genre: string;                 // news | health | product | trend | glossary | ...
  canonicalKey: string;          // host + ':' + normalizedTitle
  related?: string[];
}

type Article = {
  id: string;                    // slug
  topicId: string;
  title: string;
  summary: string[];
  bodyMdx: string;
  category: string;
  tags: string[];
  sources: { name: string; url: string; date?: string }[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  status: 'DRAFT' | 'VERIFIED' | 'PUBLISHED';
}
```

補足:
- 正規化の詳細（フィールドの原典）は docs/api-guardian.md / docs/api-nyt.md を参照。
- 画像URLの権利/利用条件に留意（相対URLの前置等は domain 層で処理）。

### 5. パイプライン（MVP）
1) fetch_guardian.ts: Guardian API → 正規化 `SourceItem` を追記（data/sources.jsonl）  
2) fetch_nyt.ts: NYT API → 正規化 `SourceItem` を追記（data/sources.jsonl）  
3) rank_topics.ts: 重複除去（canonicalKey/ID/URL）＋スコアリング → data/queue.csv  
4) build_outline.ts: ジャンルごとにテンプレ選択 → アウトラインJSON  
5) write_post.ts: MDXドラフト生成 → /content/drafts  
6) polish_post.ts: 日本語自然化 → 更新  
7) verify_post.ts: 出典整合・誇大表現チェック → meta/issues.json  
8) publish_local.ts: 承認済み記事を /content/published へ移動＋ISR再生成

レート/再試行:
- 429/5xx は指数バックオフ。日次クォータに配慮し、取得ウィンドウ/ページサイズを最適化。

### 6. AIエージェント
- Selector: 題材採否とジャンル付与  
- Outliner: 構成案生成（柔軟テンプレ）  
- Writer: MDXドラフト生成（出典ブロック含む）  
- Polisher: 日本語自然化・可読性チェック  
- Verifier: 出典整合・誇大表現チェック  
- Publisher: 公開処理（非AI）  

### 7. GitHub Actions（例）
```
name: scheduled-intake
on:
  schedule:
    - cron: '0 21,3 * * *'   # JST 06:00 / 12:00
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Run pipeline
        run: node --loader tsx scripts/pipeline.ts
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY:    ${{ secrets.OPENAI_API_KEY }}
          GUARDIAN_API_KEY:  ${{ secrets.GUARDIAN_API_KEY }}
          NYT_API_KEY:       ${{ secrets.NYT_API_KEY }}
          SITE_URL:          ${{ secrets.SITE_URL }}
      - name: Revalidate
        run: curl -fsSL -X POST "$SITE_URL/api/revalidate"
```

### 8. 環境変数 (.env.example)
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GUARDIAN_API_KEY=
NYT_API_KEY=
SITE_URL=https://your-app.vercel.app
TZ=Asia/Tokyo
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 9. ガバナンス
- 出典明記必須（媒体名・記事タイトル・URL・日付）。
- 本文の直接転載禁止。必ずAIによる要約/再構成に留める。
- 医療・金融テーマは注意文を付加。
