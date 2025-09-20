# 実装レビューガイド

## 概要
各フェーズの実装完了時に、このガイドに従ってレビューを実施します。
レビューテンプレートを使用して、品質と完成度を自律的に確認します。

## レビュープロセス

### 1. レビュー開始前の準備
```bash
# TypeScriptの型チェック
pnpm typecheck

# Lintチェック
pnpm lint

# テストスクリプトの実行
pnpm tsx scripts/test-*.ts
```

### 2. レビューテンプレートの使用
1. `review-template.md`をコピー
2. `phase-X-review-complete.md`として保存
3. 各項目を確認して記入

### 3. チェック項目

#### 必須確認事項
- [ ] 計画された全機能が実装されている
- [ ] TypeScriptエラーがない
- [ ] テストが成功している
- [ ] CLAUDE.md原則に準拠している

#### CLAUDE.md準拠チェック
```typescript
// ✅ 良い例
const results = items
  .map(item => transform(item))
  .filter(item => item.valid);

// ❌ 悪い例
for (let i = 0; i < items.length; i++) {
  // 命令的な実装
}
```

#### 型安全性チェック
- `any`の使用は最小限か
- `readonly`が適切に使用されているか
- 型定義が完全か

### 4. 問題の分類

#### 重大な問題（修正必須）
- TypeScriptエラー
- テスト失敗
- CLAUDE.md原則の重大な違反

#### 軽微な問題（TODO）
- 型推論の制約によるanyキャスト
- パフォーマンス最適化の余地
- リファクタリングの可能性

### 5. 判定基準

#### ✅ 完了
- すべての必須要件を満たしている
- 重大な問題がない

#### ⚠️ 条件付き完了
- 軽微な問題はあるが、次フェーズに影響しない
- TODOコメントで問題を明確化している

#### ❌ 未完了
- 必須要件を満たしていない
- 重大な問題が未解決

## レビュー実施時のコマンド

### 自動チェックスクリプト
```bash
# 品質チェックを一括実行
echo "=== TypeScript Check ===" && \
pnpm typecheck && \
echo "=== Lint Check ===" && \
pnpm lint && \
echo "=== Domain Test ===" && \
pnpm tsx scripts/test-domain.ts
```

### ファイル構成確認
```bash
# 実装ファイルの確認
ls -la src/domain/
ls -la src/lib/
ls -la scripts/
ls -la supabase/migrations/
```

## レビュー結果の活用

### 成功パターンの記録
- 良い実装例を記録
- 次フェーズで参考にする

### 改善点の反映
- 発見された問題を次フェーズで改善
- 共通の問題はCLAUDE.mdに追記検討

### 引き継ぎ事項の明確化
- 環境設定の要件
- 未解決のTODO
- 次フェーズへの依存関係

## 各フェーズのレビューファイル

| フェーズ | レビューファイル | 重点確認項目 |
|---------|----------------|-------------|
| Phase 1 | phase-1-review-complete.md | 型定義、ドメイン層、DB設計 |
| Phase 2 | phase-2-review-complete.md | API連携、データ収集、エラーハンドリング |
| Phase 3 | phase-3-review-complete.md | AI処理、プロンプト、品質管理 |
| Phase 4 | phase-4-review-complete.md | 公開システム、フロントエンド連携 |
| Phase 5 | phase-5-review-complete.md | 自動化、監視、運用 |

## 注意事項

### レビュー時の心構え
- 客観的に評価する
- 問題を隠さず記録する
- 改善可能な点を具体的に示す

### 時間管理
- 各フェーズのレビューは30分以内を目安
- 詳細な問題は別途調査

### ドキュメント更新
- レビュー結果は必ず記録
- 重要な発見はREADMEやCLAUDE.mdに反映検討