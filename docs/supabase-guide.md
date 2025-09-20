# Supabase 操作ガイド

このドキュメントは、本プロジェクトで Supabase を扱う際の基本的な操作手順と注意点をまとめたものです。ローカル環境、クラウド環境（本番）、GitHub Actions からの利用を順に解説します。

---

## 1. 事前準備

### 必須ソフトウェア
- [Supabase CLI](https://supabase.com/docs/guides/cli): `pnpm dlx supabase init` で設定ファイルを生成。インストール済みの場合は `supabase --version` で確認。
- [Docker Desktop](https://www.docker.com/products/docker-desktop/): ローカル Supabase を利用する場合に必須。
- Node.js / pnpm は既に環境構築済みとする。

### 環境変数
- `.env.local` には以下を設定
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```
- GitHub Secrets にも同じ値を登録（本番パイプラインで参照）。

---

## 2. ローカル Supabase の操作

ローカル環境では Supabase CLI が Docker コンテナを立ち上げ、Postgres + API + Studio がセットで起動します。初めて扱う場合は以下の手順で準備してください。

### 2.1 初期化と起動
```bash
supabase init                # まだ supabase/ ディレクトリが無い場合
supabase start               # Docker コンテナを起動（初回はイメージのダウンロードあり）
```
- `supabase start` がエラーになる場合は Docker Desktop が起動しているか確認。`--debug` を付けると詳細ログが出ます。
- コンテナがどこに保存されるかは `supabase/.branches/<branch>/` ディレクトリを参照。

### 2.2 マイグレーション適用 / リセット
```bash
supabase db reset            # 既存データをクリアして全マイグレーションを適用
```
- `supabase db push` … 直近のマイグレーションだけを反映したい場合
- データベースの状態は `supabase status` で確認可能

### 2.3 停止
```bash
supabase stop
```

---

## 3. クラウド（本番） Supabase の操作

Supabase のダッシュボードで Project を作成済みの場合、CLI を使ってマイグレーションを適用できます。

### 3.1 CLI でログイン
```bash
supabase login
```
- Supabase ダッシュボードから取得した Access Token を入力

### 3.2 プロジェクトにリンク
```bash
supabase link --project-ref <プロジェクトID>
```
- `supabase/config.toml` に `project_ref` が設定されていれば省略可

### 3.3 マイグレーションを適用
```bash
supabase db push
```
- これにより `supabase/migrations/*.sql` がクラウド DB に反映される

### 3.4 注意事項
- 誤って本番データを消さないよう、`supabase db reset` はローカルでのみ使用
- 本番環境のバックアップは Supabase ダッシュボードでスケジュール設定しておくことを推奨

---

## 4. マイグレーションの追加作成

スキーマ変更が必要になった場合は、以下の手順で新しいマイグレーションファイルを作成します。

```bash
supabase migration new add_some_table
# supabase/migrations/<timestamp>_add_some_table.sql が生成される
```
- SQL を編集し、ローカル DB (`supabase db reset`) で動作確認
- 問題なければ `supabase db push` で本番へ反映

---

## 5. モックデータの投入（任意）

開発中にテストデータを用意したい場合は、以下のコマンドで SQL を流し込めます。

```bash
supabase db query < seed.sql
```
- `supabase/seed.sql` などに INSERT 文をまとめておくと便利

---

## 6. GitHub Actions との連携

- `.github/workflows/scheduled-intake.yml` では Supabase の値を Secrets から読み込み
- Secrets に設定するキー例
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- dry-run 実行では DB 書き込みを行わないフラグ（`USE_SUPABASE`）を使って制御

---

## 7. よくあるトラブルシュート

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| `supabase db reset` が "supabase start is not running" で失敗 | Docker コンテナが起動していない | Docker Desktop を起動 → `supabase start` → 再度 `supabase db reset` |
| CLI コマンドで `permission denied` | Docker ソケットにアクセスできない | Docker の権限設定を確認。Mac の場合は Terminal を再起動 |
| `supabase db push` で認証エラー | `supabase login` していない、または token が期限切れ | `supabase login` を再実行 |
| マイグレーションが二重適用される | `supabase db reset` を繰り返し実行 | 必要に応じて `supabase status` で状態確認し、SQL を調整 |

---

## 8. 参考リンク
- Supabase CLI Docs: https://supabase.com/docs/guides/cli
- Supabase Database Migration Guide: https://supabase.com/docs/guides/database
- Supabase Docker Troubleshooting: https://supabase.com/docs/guides/cli/local-development

以上の手順を踏めば、Supabase のローカル開発環境／本番環境を安全に操作できます。手戻りを防ぐため、作業前に必ずバックアップを取り、コマンド実行前に対象（ローカル or 本番）を確認してください。
