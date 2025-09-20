# Phase 6: ポストローンチ整備

TheNewsAPI を基盤とした記事生成パイプラインが稼働し始めた後、運用に耐える品質と自動化を仕上げるフェーズです。以下は docs/todo-production.md の項目を実行可能な手順に落とし込んだものです。

## ゴール
- 実データでフロントエンドが動く状態を確認し、モック依存を排除
- Gemini を用いた AI 処理を実装し、パイプラインを本番相当で実行
- Supabase / GitHub Actions / モニタリングの設定を固め、ローンチ後の運用に備える

## 事前準備（完了確認）
- [ ] `docs/todo-production.md` の「事前準備（オーナーが対応）」がすべて ✅ になっている
- [ ] TheNewsAPI トークン、Supabase Keys、Gemini API Key、Slack Webhook が `.env.local` と GitHub Secrets に登録済み

---

## Step 1. フロントエンドを実データ対応にする
1. `src/app/page.tsx` で Supabase から記事一覧を取得する (`getServerSideProps` 相当の server component で `supabase.from('articles')` を利用)
2. `src/app/news/[slug]/page.tsx` を実データの詳細取得に変更し、該当 slug が無い場合は `notFound()` で 404 を返す
3. `src/components/article-card.tsx` の型を Supabase `articles` レコードに合わせて更新
4. カテゴリー／タグ一覧を Supabase から動的生成、モックデータを削除
5. 必要に応じて Skeleton/Loading 状態やエラー表示を追加

---

## Step 2. Gemini ベースのパイプラインを実装
1. `scripts/build-outline.ts`: モックではなく Gemini API を呼び出し、アウトラインを生成（モデル名 `gemini-pro` を想定）
2. `scripts/write-post.ts`: Gemini から記事本文のドラフトを生成し、frontmatter と本文を構築
3. `scripts/polish-post.ts`: Gemini による校正ロジックを実装（調整可能なプロンプト）
4. `scripts/verify-post.ts`: Gemini で検証（出典整合・誇大表現チェック等）を実施し、`meta/issues.json` を更新
5. `scripts/pipeline.ts`: 実際の生成件数等を計測し metrics へ反映。通知とログを整備
6. Supabase への書き込み (`publish-local.ts`) が処理済み記事を正しく保存するか確認

---

## Step 3. Supabase / ワークフローの調整
1. `.github/workflows/scheduled-intake.yml` で Secrets が正しく渡るか確認
2. 手動実行 (`workflow_dispatch`) で dry-run と本番モードの両方をテスト
3. Slack 通知 (`lib/notifications.ts`) の呼び出しを pipeline に統合し、成功・失敗を通知
4. Runbook (`README.md`、`docs/supabase-guide.md`) に Gemini 関連の注意点を追記

---

## Step 4. テストと検証
1. `pnpm tsx scripts/pipeline.ts --dry-run --skip-fetch` で最終確認
2. Supabase へ書き込みを行うモードで 1 回実行し、`sources → topics → articles` が想定どおり生成されるかを確認
3. API エラー（TheNewsAPI 429、Gemini レート超過など）を意図的に発生させ、ログと通知が実行されるか検証
4. フロントエンドを実データで確認（ホーム／記事詳細／ダッシュボード）

---

## Step 5. ローンチ準備
1. README や About ページの文言を最新構成に更新
2. docs/todo-production.md の該当項目をチェック済みにし、残項目を洗い出す
3. 追加の監視（Supabase ログ、Vercel 側モニタリングなど）を設定

これらをすべて完了すると、TheNewsAPI + Gemini ベースの自動生成ブログとして本番公開できる状態になります。
