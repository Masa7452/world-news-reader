# Phase 5: 自動化と運用

## 概要
GitHub Actionsを使用して、データ収集から記事公開までの全工程を自動化します。
定期実行、エラー監視、通知システムを構築し、安定した運用体制を確立します。

## 前提条件
- Phase 1-4が完了していること
- GitHub リポジトリが設定されていること
- 各種APIキーが取得済みであること

## 実装タスク

### 5.1 統合パイプライン

#### 5.1.1 メインパイプライン（scripts/pipeline.ts）
```typescript
#!/usr/bin/env tsx
import { config } from 'dotenv';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// 環境変数の読み込み
config();

// 各処理モジュールのインポート
import { fetchGuardianArticles } from './fetch_guardian';
import { fetchNYTArticles } from './fetch_nyt';
import { rankTopics } from './rank_topics';
import { buildOutline } from './build_outline';
import { writePost } from './write_post';
import { polishPost } from './polish_post';
import { verifyPost } from './verify_post';
import { publishArticles } from './publish_local';

// ログユーティリティ
const log = (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss', { locale: ja });
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

// エラー通知
const notifyError = async (error: Error, stage: string) => {
  log(`エラー発生 (${stage}): ${error.message}`, 'error');
  
  // Slack/Discord通知（オプション）
  if (process.env.WEBHOOK_URL) {
    await fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 パイプラインエラー\nステージ: ${stage}\nエラー: ${error.message}`,
      }),
    }).catch(console.error);
  }
};

// メインパイプライン
const runPipeline = async () => {
  const startTime = Date.now();
  log('=== World News Reader パイプライン開始 ===');
  
  const results = {
    guardian: 0,
    nyt: 0,
    topics: 0,
    outlines: 0,
    drafts: 0,
    published: 0,
  };

  try {
    // Phase 1: データ収集
    log('Phase 1: データ収集を開始');
    
    // Guardian記事取得
    try {
      results.guardian = await fetchGuardianArticles();
      log(`Guardian: ${results.guardian}件の新規記事を取得`);
    } catch (error) {
      await notifyError(error as Error, 'Guardian取得');
    }
    
    // NYT記事取得
    try {
      results.nyt = await fetchNYTArticles();
      log(`NYT: ${results.nyt}件の新規記事を取得`);
    } catch (error) {
      await notifyError(error as Error, 'NYT取得');
    }
    
    // トピック選定
    if (results.guardian > 0 || results.nyt > 0) {
      results.topics = await rankTopics();
      log(`${results.topics}件のトピックを選定`);
    }
    
    // Phase 2: AI処理
    if (results.topics > 0) {
      log('Phase 2: AI処理を開始');
      
      // 構成生成
      results.outlines = await buildOutline();
      log(`${results.outlines}件の構成を生成`);
      
      // 記事執筆
      if (results.outlines > 0) {
        results.drafts = await writePost();
        log(`${results.drafts}件の記事を執筆`);
        
        // 校正
        await polishPost();
        log('記事の校正完了');
        
        // 検証
        const verified = await verifyPost();
        log(`${verified}件の記事が検証を通過`);
      }
    }
    
    // Phase 3: 公開
    log('Phase 3: 記事公開を開始');
    results.published = await publishArticles();
    log(`${results.published}件の記事を公開`);
    
    // 完了
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`=== パイプライン完了 (${duration}秒) ===`);
    
    // サマリー通知
    await notifySummary(results, duration);
    
  } catch (error) {
    await notifyError(error as Error, 'パイプライン全体');
    process.exit(1);
  }
};

// サマリー通知
const notifySummary = async (results: any, duration: number) => {
  const summary = `
📊 パイプライン実行結果
━━━━━━━━━━━━━━━━━━
Guardian取得: ${results.guardian}件
NYT取得: ${results.nyt}件
トピック選定: ${results.topics}件
構成生成: ${results.outlines}件
記事執筆: ${results.drafts}件
公開: ${results.published}件
実行時間: ${duration}秒
━━━━━━━━━━━━━━━━━━
`;

  console.log(summary);
  
  if (process.env.WEBHOOK_URL) {
    await fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: summary }),
    }).catch(console.error);
  }
};

// 実行
if (require.main === module) {
  runPipeline().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runPipeline };
```

### 5.2 GitHub Actions設定

#### 5.2.1 定期実行ワークフロー（.github/workflows/scheduled-intake.yml）
```yaml
name: Scheduled Article Intake

on:
  schedule:
    # 日本時間 6:00 と 12:00 に実行（UTC 21:00 と 3:00）
    - cron: '0 21 * * *'
    - cron: '0 3 * * *'
  workflow_dispatch: # 手動実行も可能

env:
  TZ: Asia/Tokyo

jobs:
  intake:
    name: Run Article Intake Pipeline
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run pipeline
        env:
          # API Keys
          GUARDIAN_API_KEY: ${{ secrets.GUARDIAN_API_KEY }}
          NYT_API_KEY: ${{ secrets.NYT_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          
          # Supabase
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          
          # Site
          SITE_URL: ${{ secrets.SITE_URL }}
          
          # Notification (optional)
          WEBHOOK_URL: ${{ secrets.WEBHOOK_URL }}
        run: |
          npx tsx scripts/pipeline.ts

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: pipeline-logs-${{ github.run_id }}
          path: |
            logs/
            *.log

      - name: Notify on failure
        if: failure()
        run: |
          if [ -n "${{ secrets.WEBHOOK_URL }}" ]; then
            curl -X POST ${{ secrets.WEBHOOK_URL }} \
              -H 'Content-Type: application/json' \
              -d '{"text":"🚨 定期実行パイプラインが失敗しました\nRun: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}'
          fi
```

#### 5.2.2 手動実行ワークフロー（.github/workflows/manual-pipeline.yml）
```yaml
name: Manual Pipeline Run

on:
  workflow_dispatch:
    inputs:
      stages:
        description: '実行するステージ'
        required: true
        default: 'all'
        type: choice
        options:
          - all
          - fetch
          - process
          - publish
      debug:
        description: 'デバッグモード'
        required: false
        type: boolean
        default: false

jobs:
  run:
    name: Manual Pipeline Execution
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run selected stages
        env:
          STAGES: ${{ inputs.stages }}
          DEBUG: ${{ inputs.debug }}
          # 環境変数（省略）
        run: |
          if [ "$DEBUG" = "true" ]; then
            export DEBUG='*'
          fi
          
          case "$STAGES" in
            fetch)
              npx tsx scripts/fetch_guardian.ts
              npx tsx scripts/fetch_nyt.ts
              npx tsx scripts/rank_topics.ts
              ;;
            process)
              npx tsx scripts/build_outline.ts
              npx tsx scripts/write_post.ts
              npx tsx scripts/polish_post.ts
              npx tsx scripts/verify_post.ts
              ;;
            publish)
              npx tsx scripts/publish_local.ts
              ;;
            all)
              npx tsx scripts/pipeline.ts
              ;;
          esac
```

#### 5.2.3 デプロイワークフロー（.github/workflows/deploy.yml）
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_run:
    workflows: ["Scheduled Article Intake"]
    types: [completed]

jobs:
  deploy:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    if: ${{ github.event_name == 'push' || github.event.workflow_run.conclusion == 'success' }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Vercel CLI
        run: npm i -g vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### 5.3 監視とログ

#### 5.3.1 ログ管理（scripts/utils/logger.ts）
```typescript
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';

export class Logger {
  private logStream: NodeJS.WritableStream;
  private logDir = join(process.cwd(), 'logs');

  constructor(private name: string) {
    // ログディレクトリ作成
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    // ログファイル作成
    const logFile = join(
      this.logDir,
      `${name}-${format(new Date(), 'yyyy-MM-dd')}.log`
    );
    this.logStream = createWriteStream(logFile, { flags: 'a' });
  }

  private write(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      name: this.name,
      message,
      ...(data && { data }),
    };

    // コンソール出力
    console.log(`[${level}] ${message}`, data || '');

    // ファイル出力
    this.logStream.write(JSON.stringify(logEntry) + '\n');
  }

  info(message: string, data?: any) {
    this.write('INFO', message, data);
  }

  warn(message: string, data?: any) {
    this.write('WARN', message, data);
  }

  error(message: string, error?: Error) {
    this.write('ERROR', message, {
      error: error?.message,
      stack: error?.stack,
    });
  }

  close() {
    this.logStream.end();
  }
}
```

#### 5.3.2 ヘルスチェック（src/app/api/health/route.ts）
```typescript
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: false,
      articles: 0,
      lastPublished: null as string | null,
    },
  };

  try {
    // データベース接続チェック
    const { error: dbError } = await supabase
      .from('articles')
      .select('count')
      .limit(1);
    
    checks.checks.database = !dbError;

    // 記事数チェック
    const { count } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PUBLISHED');
    
    checks.checks.articles = count || 0;

    // 最終公開日チェック
    const { data: latest } = await supabase
      .from('articles')
      .select('published_at')
      .eq('status', 'PUBLISHED')
      .order('published_at', { ascending: false })
      .limit(1)
      .single();
    
    checks.checks.lastPublished = latest?.published_at || null;

    // 全体ステータス判定
    if (!checks.checks.database) {
      checks.status = 'unhealthy';
    } else if (checks.checks.articles === 0) {
      checks.status = 'degraded';
    }

    return NextResponse.json(checks, {
      status: checks.status === 'healthy' ? 200 : 503,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    }, { status: 503 });
  }
}
```

### 5.4 エラーハンドリングと復旧

#### 5.4.1 リトライメカニズム（scripts/utils/retry.ts）
```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        
        if (onRetry) {
          onRetry(attempt, lastError);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError!;
}

// 使用例
const result = await withRetry(
  () => fetchGuardianArticles(),
  {
    maxAttempts: 3,
    delay: 2000,
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}: ${error.message}`);
    },
  }
);
```

#### 5.4.2 復旧スクリプト（scripts/recovery.ts）
```typescript
import { supabaseAdmin } from '../src/lib/supabase';
import { Logger } from './utils/logger';

const logger = new Logger('recovery');

const recoverFailedArticles = async () => {
  logger.info('復旧処理を開始');

  // 失敗した記事を取得
  const { data: failedTopics } = await supabaseAdmin
    .from('topics')
    .select('*')
    .in('status', ['OUTLINED', 'DRAFTED'])
    .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('score', { ascending: false });

  if (!failedTopics?.length) {
    logger.info('復旧対象の記事はありません');
    return;
  }

  logger.info(`${failedTopics.length}件の記事を復旧対象として検出`);

  for (const topic of failedTopics) {
    try {
      // ステータスをリセット
      await supabaseAdmin
        .from('topics')
        .update({ status: 'NEW' })
        .eq('id', topic.id);

      logger.info(`リセット完了: ${topic.title}`);
    } catch (error) {
      logger.error(`復旧失敗: ${topic.title}`, error as Error);
    }
  }

  logger.info('復旧処理完了');
  logger.close();
};

// クリーンアップ
const cleanupOldData = async () => {
  logger.info('古いデータのクリーンアップを開始');

  // 30日以上前の未使用ソースを削除
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const { error } = await supabaseAdmin
    .from('sources')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .is('processed_at', null);

  if (error) {
    logger.error('クリーンアップエラー', error);
  } else {
    logger.info('クリーンアップ完了');
  }

  logger.close();
};

// 実行
if (require.main === module) {
  Promise.all([
    recoverFailedArticles(),
    cleanupOldData(),
  ]).catch(console.error);
}
```

### 5.5 環境変数管理

#### 5.5.1 環境変数テンプレート（.env.example）
```bash
# API Keys
GUARDIAN_API_KEY=your_guardian_api_key
NYT_API_KEY=your_nyt_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site Configuration
SITE_URL=https://your-domain.com
TZ=Asia/Tokyo

# Monitoring (Optional)
WEBHOOK_URL=https://hooks.slack.com/services/xxx
SENTRY_DSN=https://xxx@sentry.io/xxx

# Vercel (for deployment)
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

#### 5.5.2 シークレット管理スクリプト（scripts/setup-secrets.sh）
```bash
#!/bin/bash

# GitHub Secretsの設定
echo "Setting up GitHub Secrets..."

# 必須の環境変数チェック
required_vars=(
  "GUARDIAN_API_KEY"
  "NYT_API_KEY"
  "OPENAI_API_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "SITE_URL"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: $var is not set"
    exit 1
  fi
done

# GitHub CLIを使用してシークレットを設定
gh secret set GUARDIAN_API_KEY --body "$GUARDIAN_API_KEY"
gh secret set NYT_API_KEY --body "$NYT_API_KEY"
gh secret set OPENAI_API_KEY --body "$OPENAI_API_KEY"
gh secret set ANTHROPIC_API_KEY --body "$ANTHROPIC_API_KEY"
gh secret set NEXT_PUBLIC_SUPABASE_URL --body "$NEXT_PUBLIC_SUPABASE_URL"
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY"
gh secret set SITE_URL --body "$SITE_URL"

echo "GitHub Secrets setup complete!"
```

## テストとバリデーション

### 5.6.1 エンドツーエンドテスト
```typescript
// scripts/e2e-test.ts
const runE2ETest = async () => {
  console.log('E2Eテスト開始');

  // 1. データ取得テスト
  const fetchResult = await testDataFetch();
  assert(fetchResult.success, 'データ取得失敗');

  // 2. AI処理テスト
  const aiResult = await testAIProcessing();
  assert(aiResult.success, 'AI処理失敗');

  // 3. 公開テスト
  const publishResult = await testPublishing();
  assert(publishResult.success, '公開処理失敗');

  // 4. フロントエンド表示テスト
  const frontendResult = await testFrontendDisplay();
  assert(frontendResult.success, 'フロントエンド表示失敗');

  console.log('E2Eテスト完了: すべて成功');
};
```

### 5.6.2 負荷テスト
```bash
# k6を使用した負荷テスト
k6 run scripts/load-test.js

# Apache Benchを使用
ab -n 1000 -c 10 https://your-domain.com/
```

## 完了基準
- [ ] 統合パイプラインスクリプトが正常に動作する
- [ ] GitHub Actionsの定期実行が設定されている
- [ ] エラー通知システムが機能している
- [ ] ログ管理システムが実装されている
- [ ] ヘルスチェックエンドポイントが利用可能
- [ ] リトライとエラー復旧メカニズムが実装されている
- [ ] 環境変数とシークレットが適切に管理されている
- [ ] E2Eテストが通過している

## 運用マニュアル

### 日次確認項目
1. ヘルスチェックエンドポイントの確認
2. 最新記事の公開状況確認
3. エラーログの確認
4. API利用量の確認

### 週次メンテナンス
1. ログファイルのローテーション
2. 古いデータのクリーンアップ
3. パフォーマンスメトリクスの確認
4. コスト分析（API利用料）

### トラブルシューティング
- **記事が公開されない**: パイプラインログを確認、復旧スクリプトを実行
- **API制限エラー**: レート制限の調整、実行間隔の変更
- **AI処理エラー**: プロンプトの確認、APIキーの有効性確認
- **Supabase接続エラー**: 接続数制限の確認、接続プールの調整

## まとめ
Phase 5の完了により、World News Readerの完全自動運用が可能になります。
定期的な監視とメンテナンスにより、安定したサービス提供を実現します。