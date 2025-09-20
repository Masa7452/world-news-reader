# 開発コマンド

## 開発サーバー
```bash
pnpm dev          # Next.js開発サーバー起動（http://localhost:3000）
```

## ビルド & 本番
```bash
pnpm build        # Next.jsアプリのビルド
pnpm start        # 本番サーバー起動
```

## コード品質チェック（タスク完了時に必ず実行）
```bash
pnpm typecheck    # TypeScript型チェック
pnpm lint         # ESLintチェック
pnpm lint:fix     # ESLint自動修正
pnpm format       # Prettier自動整形
pnpm check:strict # 厳格なチェック（エラー0件必須）
```

## テスト
```bash
pnpm test         # テスト実行
pnpm test:watch   # テストウォッチモード
```

## スクリプト実行
```bash
pnpm tsx scripts/test-domain.ts      # ドメイン層テスト
pnpm tsx scripts/test-supabase.ts    # Supabase接続テスト
pnpm tsx scripts/setup-supabase.ts   # Supabaseセットアップ
```

## パッケージ管理
```bash
pnpm install      # 依存関係インストール
pnpm add [pkg]    # パッケージ追加
pnpm add -D [pkg] # 開発用パッケージ追加
```

## システムコマンド（macOS）
```bash
ls -la            # ファイル一覧（隠しファイル含む）
cat file          # ファイル内容表示
grep -r "text"    # 再帰的検索
find . -name "*"  # ファイル検索
```

## Git
```bash
git status        # 変更状況確認
git diff          # 差分確認
git add .         # 全ファイルステージング
git commit -m ""  # コミット
```