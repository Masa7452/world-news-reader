# Phase 2: データ収集パイプライン実装計画

## 目的
Guardian/NYT APIからデータを取得し、正規化してSupabaseに保存

## 実装タスク（優先順位順）

### 1. 共通ユーティリティ
- `src/lib/http-client.ts` - 指数バックオフ付きHTTPクライアント
- `src/lib/date-utils.ts` - 日付処理ユーティリティ

### 2. Guardian API連携
- `src/lib/api/guardian-client.ts` - APIクライアント
- `scripts/fetch-guardian.ts` - データ取得スクリプト

### 3. NYT API連携
- `src/lib/api/nyt-client.ts` - APIクライアント
- `scripts/fetch-nyt.ts` - データ取得スクリプト

### 4. トピック選定
- `scripts/rank-topics.ts` - 重複排除とスコアリング

### 5. バリデーション
- `scripts/validate-data.ts` - データ整合性チェック

## 技術要件
- レート制限対応（Guardian: 1req/sec、NYT: 5req/min）
- 指数バックオフによる再試行
- 重複排除（canonical_key使用）
- エラーハンドリング

## 環境変数（必要）
```
GUARDIAN_API_KEY=xxx
NYT_API_KEY=xxx
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## 完了基準
- APIクライアント実装完了
- データ取得・保存が動作
- レート制限・再試行が機能
- 重複排除が正常動作
- エラーハンドリング完備