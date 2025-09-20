# World News Reader プロジェクト概要

## コンセプト
**「世界の話題をゆっくり知ろう☕️」**
- コーヒーブレイクのような時間に世界の話題を日本語で楽しめるニュースリーダー
- The GuardianやThe New York Timesから厳選された記事を提供
- 5-10分で読める適切なボリューム

## 技術スタック
- **フロントエンド**: Next.js 15 (App Router)
- **バックエンド**: Supabase
- **スタイリング**: Tailwind CSS
- **AI/LLM**: OpenAI API / Anthropic Claude API
- **外部API**: The Guardian API, The New York Times API
- **自動化**: GitHub Actions
- **言語**: TypeScript（厳格な型安全性）

## プロジェクト構造
```
world-news-reader/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # Reactコンポーネント
│   ├── domain/             # ドメイン層（型定義、APIアダプタ）
│   └── lib/                # ユーティリティ
├── supabase/              # Supabaseスキーマ
├── scripts/               # 各種スクリプト
└── docs/                  # ドキュメント
    └── implementation/    # 実装計画
```

## 実装フェーズ
1. **Phase 1: 基盤構築** ✅ 完了（2025-01-09レビュー完了）
2. **Phase 2: データ収集** ❌ 未実装（次の実装対象）
3. **Phase 3: AI処理** ❌ 未実装
4. **Phase 4: 公開システム** ❌ 未実装
5. **Phase 5: 自動化** ❌ 未実装

## フロントエンド実装状況
✅ モックデータでの記事表示
✅ カテゴリー別フィルタリング
✅ タグページ機能
✅ 記事詳細ページ
✅ レスポンシブデザイン
✅ 3テーマ対応（Light/Sepia/Dark）
⏳ 外部API連携（未実装）