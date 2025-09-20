# docs/tech-spec.md
## 開発者向け詳細仕様書（MVP/自動運用）

この文書は運用の中心となる技術的な合意事項を定義します。TheNewsAPI の詳細仕様は [docs/api-newsapi.md](./api-newsapi.md) を参照してください。

### 0. 重要方針（ドメイン集約）
- API 固有ロジック（フィールド差異の吸収・マッピング・前処理）は domain 層に集約し、他レイヤー（選定 / 構成 / 執筆 / 校正 / 公開）は正規化済み型のみを扱う。
- 正規化の入出力は厳密に型で拘束し、ドメイン契約（contract）としてバージョン管理する。
- 将来別ソースを追加する場合も domain にアダプタを追加することで拡張可能な構造を維持する。

### 1. 範囲と前提
- ニュースデータは TheNewsAPI の `/news/top` / `/news/latest` / `/news/all` エンドポイントから取得する。
- 取得対象は記事メタデータ（タイトル / URL / 公開日 / 要約 / 画像URL / 提供元など）。本文の保存・再配布は行わない。
- AI 処理は多段エージェント構成：Selector → Outliner → Writer → Polisher → Verifier → Publisher。
- データベースは Supabase（PostgreSQL）を利用し、取得済みソース・生成トピック・下書き記事を永続化する。

### 2. 技術スタック
- Web: Next.js 15 (App Router, MDX, ISR), TypeScript, Tailwind CSS, shadcn/ui
- 自動処理: Node.js (TS) スクリプト + GitHub Actions（cron 実行）
- データ: Supabase（本番） / リポジトリ内ファイル（開発用サンプル）
- AI: OpenAI API / Anthropic Claude API（切り替え可能）
- ホスティング: Vercel（ISR で即時反映）

### 3. ディレクトリ構成（シンプル版）
```
world-news-reader/
├── app/                         # Next.js App Router
├── components/                  # UI コンポーネント
├── content/
│   ├── drafts/
│   └── published/
├── docs/
├── domain/
│   ├── newsapi.ts               # TheNewsAPI アダプタと型（名称は互換のため維持）
│   └── types.ts                 # 正規化型（SourceItem / Topic / Article 等）
├── lib/
│   ├── api/newsapi-client.ts    # TheNewsAPI HTTP クライアント（名称は互換のため維持）
│   ├── database-utils.ts
│   ├── http-client.ts
│   └── ...
├── scripts/
│   ├── fetch-newsapi.ts
│   ├── rank_topics.ts
│   ├── build_outline.ts
│   ├── write_post.ts
│   ├── polish_post.ts
│   ├── verify_post.ts
│   ├── publish_local.ts
│   └── pipeline.ts
├── supabase/
│   └── migrations/
├── data/
│   └── samples/
├── meta/
│   └── issues.json
└── ...
```

### 4. データモデル（ドメイン契約）
TheNewsAPI のレスポンスを正規化したドメイン契約。provider 差異は domain 層で吸収する。

```
type Provider = 'newsapi';

type SourceItem = {
  provider: Provider;            // 供給元（固定値: newsapi）
  providerId: string;            // 安定識別子（URL もしくは uuid）
  url: string;                   // 記事 URL
  title: string;                 // 見出し
  abstract?: string;             // 要約（description または content）
  publishedAt: string;           // ISO8601
  section?: string;              // source.name など
  subsection?: string;           // 将来の拡張用（現状は未使用）
  byline?: string;               // 著者名
  tags?: string[];               // ソース名や著者名などから推定
  type?: string;                 // 取得元の分類（未使用）
  wordCount?: number;            // TheNewsAPI では提供されない（未使用）
  image?: { url: string; caption?: string; credit?: string };
  body?: string;                 // HTML 本文（未使用）
  bodyText?: string;             // 要約テキスト
  sourceName: 'NewsAPI';         // 表示用媒体名（互換目的で名称を維持）
}

type Topic = {
  id: string;                    // uuid
  source: Provider;              // 供給元
  title: string;
  url: string;
  publishedAt: string;           // ISO8601
  abstract?: string;
  section?: string;
  subsection?: string;
  score: number;                 // 選定スコア
  status: 'NEW'|'QUEUED'|'REJECTED'|'OUTLINED'|'DRAFTED'|'VERIFIED'|'PUBLISHED';
  genre: 'news'|'health'|'product'|'trend'|'glossary'|'technology'|'lifestyle'|'culture'|'business'|'science';
  canonicalKey: string;          // host + ':' + normalizedTitle 等で生成
  related?: string[];
}

type Article = {
  id: string;                    // slug
  topicId?: string;
  title: string;
  summary: string[];
  bodyMdx: string;
  category: string;
  tags: string[];
  sources: { name: string; url: string; date?: string }[];
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  status: 'DRAFT' | 'VERIFIED' | 'PUBLISHED';
}
```

補足:
- 正規化ロジックは `domain/newsapi.ts` を参照。
- 画像の利用条件・著作権に注意。`urlToImage` が空の場合は画像なしとして扱う。

### 5. パイプライン（MVP）
1. `fetch-newsapi.ts`: TheNewsAPI → 正規化 `SourceItem` → Supabase `sources` テーブルへ upsert / 開発時は JSON 保存  
2. `rank_topics.ts`: 重複除去（canonicalKey / URL）＋スコアリング → `topics` テーブル / `data/queue.csv`  
3. `build_outline.ts`: ジャンルごとにテンプレ選択 → アウトライン JSON 生成  
4. `write_post.ts`: MDX ドラフト生成 → `/content/drafts`  
5. `polish_post.ts`: 日本語自然化 → ドラフト更新  
6. `verify_post.ts`: 出典整合・事実確認 → `meta/issues.json`  
7. `publish_local.ts`: 承認済み記事を `/content/published` へ移動し ISR を再生成

レート / 再試行:
- TheNewsAPI の無料枠基準: 100 req/day（limit=3）。429/5xx は指数バックオフ＋最大リトライ 3 回。
- 多量取得時は `/news/all` などのエンドポイントで `published_after` を分割し、クォータを超えないよう調整する。

### 6. AI エージェント
- Selector: `sources` から topics 候補を選定しジャンル付与  
- Outliner: Topics ベースのアウトライン生成  
- Writer: MDX ドラフト生成（出典ブロック含む）  
- Polisher: 日本語校正・可読性調整  
- Verifier: 出典整合・誇大表現チェック  
- Publisher: 公開処理（手動 or 自動）

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
      - run: pnpm install --frozen-lockfile
      - name: Run pipeline
        run: pnpm tsx scripts/pipeline.ts
        env:
          NEWS_API_KEY: ${{ secrets.NEWS_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

パイプライン実行後は Supabase / ISR をウォームアップし、失敗時は通知（Slack / Email）を送る。

### 8. 品質ゲート
- `pnpm lint` と `pnpm typecheck` を CI に組み込み、main へのマージ時に破綻がないことを保証。
- ドラフト生成後は `verify_post.ts` の結果をもとに手動レビューを実施。
- 生成記事には出典セクションを必須表示し、TheNewsAPI 経由の元記事 URL を利用者に示す。

### 9. 今後の拡張メモ
- TheNewsAPI の有料プランで提供される追加フィールドを導入する場合は `domain/newsapi.ts` に全文フィールドを追加し、AI の入力長を最適化。
- 他ニュースプロバイダを追加する際は、`Provider` のユニオン型と domain アダプタを拡張し、Supabase 側の CHECK 制約を更新。
- 取得頻度を上げる場合はレート制限とクォータを踏まえ、必要に応じてバッチを時間分散する。
