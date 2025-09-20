# Phase 3: AI処理パイプライン

## 概要
選定されたトピックから、AIを使って日本語記事を自動生成します。
多段階のAIエージェント（構成→執筆→校正→検証）により、品質の高い記事を生成します。
「世界の話題をゆっくり知ろう☕️」のコンセプトに沿った、読みやすい記事を目指します。

## 前提条件
- Phase 2が完了していること
- AIサービスのAPIキーが取得済みであること
  - OpenAI API Key または
  - Anthropic API Key

## 実装タスク

### 3.1 AI基盤の構築

#### 3.1.1 AIクライアント抽象化（src/lib/ai/client.ts）
```typescript
// プロバイダーに依存しない抽象インターフェース
export interface AIClient {
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T>;
}

// OpenAI実装
export class OpenAIClient implements AIClient {
  private readonly apiKey = process.env.OPENAI_API_KEY!;
  private readonly model = 'gpt-4-turbo-preview';

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const text = await this.generateText(
      prompt,
      `${systemPrompt}\n必ず有効なJSONフォーマットで回答してください。`
    );
    
    try {
      return JSON.parse(text) as T;
    } catch {
      // JSONパース失敗時の再試行
      const cleaned = text.match(/\{[\s\S]*\}/)?.[0] || '{}';
      return JSON.parse(cleaned) as T;
    }
  }
}

// Anthropic実装
export class AnthropicClient implements AIClient {
  private readonly apiKey = process.env.ANTHROPIC_API_KEY!;
  private readonly model = 'claude-3-opus-20240229';

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return data.content[0].text;
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const text = await this.generateText(
      prompt,
      `${systemPrompt}\n必ず有効なJSONフォーマットで回答してください。`
    );
    
    const cleaned = text.match(/\{[\s\S]*\}/)?.[0] || '{}';
    return JSON.parse(cleaned) as T;
  }
}

// ファクトリー
export const createAIClient = (): AIClient => {
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicClient();
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIClient();
  }
  throw new Error('No AI API key configured');
};
```

### 3.2 プロンプトテンプレート

#### 3.2.1 基本テンプレート（prompts/templates/base.md）
```markdown
# 記事執筆ガイドライン

## ブランドコンセプト
「世界の話題をゆっくり知ろう☕️」
- コーヒーブレイクのような、ゆったりとした読書体験
- 5-10分で読める適切なボリューム
- 急がず、じっくりと理解できる構成

## 執筆方針
- 日本の読者向けに分かりやすく説明
- 専門用語は必要最小限に留め、使用時は解説を付ける
- 客観的で中立的な視点を保つ
- 誇張表現を避け、事実に基づいた内容にする
- 温かみのある、親しみやすい文体

## 構成の基本
1. 導入：話題の概要と重要性（なぜ今これが話題なのか）
2. 本論：詳細な説明と背景
3. 影響：日本や読者への影響・関連性
4. まとめ：要点の整理と今後の展望

## 注意事項
- 出典を明確にする
- 医療・金融情報には免責事項を付ける
- センシティブな話題は慎重に扱う
```

#### 3.2.2 ジャンル別テンプレート（prompts/templates/technology.md）
```markdown
# テクノロジー記事テンプレート

## 追加ガイドライン
- 技術的な詳細は段階的に説明
- 実生活への影響を具体例で示す
- イノベーションの意義を分かりやすく解説

## 推奨構成
1. **話題の技術とは**
   - 簡潔な定義
   - なぜ注目されているか
   
2. **技術の詳細**
   - 仕組みの説明（図解的な説明を心がける）
   - 従来技術との違い
   
3. **実用例と影響**
   - 具体的な活用シーン
   - メリットとデメリット
   
4. **日本での展開**
   - 国内の動向
   - 私たちの生活への影響
   
5. **今後の展望**
   - 課題と可能性
   - 注目すべきポイント
```

### 3.3 AIエージェントの実装

#### 3.3.1 構成生成エージェント（scripts/build_outline.ts）
```typescript
import { createAIClient } from '../src/lib/ai/client';
import { supabaseAdmin } from '../src/lib/supabase';
import { readFileSync } from 'fs';
import path from 'path';

type Outline = {
  title: string;
  summary: string[];
  sections: Array<{
    heading: string;
    points: string[];
  }>;
  tags: string[];
};

const buildOutline = async () => {
  console.log('記事構成の生成を開始...');
  
  const aiClient = createAIClient();
  
  // 未処理のトピックを取得
  const { data: topics, error } = await supabaseAdmin
    .from('topics')
    .select('*')
    .eq('status', 'NEW')
    .gte('score', 0.5) // スコア0.5以上
    .order('score', { ascending: false })
    .limit(10);

  if (error || !topics?.length) {
    console.log('処理対象のトピックがありません');
    return;
  }

  // 基本テンプレートを読み込み
  const baseTemplate = readFileSync(
    path.join(__dirname, '../prompts/templates/base.md'),
    'utf-8'
  );

  for (const topic of topics) {
    try {
      // ジャンル別テンプレートを読み込み
      const genreTemplate = readFileSync(
        path.join(__dirname, `../prompts/templates/${topic.genre}.md`),
        'utf-8'
      ).catch(() => ''); // ジャンル別がない場合は空

      const prompt = `
以下の海外ニュースについて、日本語の記事構成を作成してください。

【元記事情報】
タイトル: ${topic.title}
URL: ${topic.url}
要約: ${topic.abstract || 'なし'}
セクション: ${topic.section || 'なし'}
ジャンル: ${topic.genre}

【ガイドライン】
${baseTemplate}
${genreTemplate}

【要求事項】
1. 日本の読者に分かりやすい記事タイトル（30文字以内）
2. 記事の要点（3-5個の箇条書き）
3. 記事の構成（見出しと各セクションの要点）
4. 関連タグ（5-8個）

JSONフォーマットで回答してください。
`;

      const outline: Outline = await aiClient.generateJSON<Outline>(prompt);
      
      // 構成を保存
      await supabaseAdmin
        .from('topic_outlines')
        .insert({
          topic_id: topic.id,
          title: outline.title,
          summary: outline.summary,
          sections: outline.sections,
          tags: outline.tags,
        });

      // ステータス更新
      await supabaseAdmin
        .from('topics')
        .update({ status: 'OUTLINED' })
        .eq('id', topic.id);

      console.log(`構成生成完了: ${outline.title}`);
      
      // レート制限対策
      await sleep(2000);
      
    } catch (error) {
      console.error(`構成生成エラー (${topic.title}):`, error);
    }
  }
  
  console.log('構成生成が完了しました');
};

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// 実行
buildOutline();
```

#### 3.3.2 記事執筆エージェント（scripts/write_post.ts）
```typescript
import { createAIClient } from '../src/lib/ai/client';
import { supabaseAdmin } from '../src/lib/supabase';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const writePost = async () => {
  console.log('記事執筆を開始...');
  
  const aiClient = createAIClient();
  
  // 構成済みのトピックを取得
  const { data: topics, error } = await supabaseAdmin
    .from('topics')
    .select(`
      *,
      topic_outlines (*)
    `)
    .eq('status', 'OUTLINED')
    .limit(5);

  if (error || !topics?.length) {
    console.log('執筆対象のトピックがありません');
    return;
  }

  for (const topic of topics) {
    const outline = topic.topic_outlines[0];
    if (!outline) continue;

    try {
      const prompt = `
以下の構成に基づいて、日本語の記事を執筆してください。

【記事構成】
タイトル: ${outline.title}
要点: ${outline.summary.join(', ')}
セクション:
${outline.sections.map(s => `- ${s.heading}: ${s.points.join(', ')}`).join('\n')}

【元記事情報】
元タイトル: ${topic.title}
URL: ${topic.url}
公開日: ${format(new Date(topic.published_at), 'yyyy年MM月dd日', { locale: ja })}

【執筆要件】
1. MDX形式で記述
2. 各セクションはH2見出し（##）で開始
3. 重要なポイントは太字や箇条書きで強調
4. 読者への問いかけや共感を適度に含める
5. 記事の最初に出典情報ブロックを配置
6. 記事の最後にも出典リンクを配置
7. 全体で2000-3000文字程度

【MDXテンプレート】
\`\`\`mdx
<SourceInfo 
  title="${topic.title}"
  url="${topic.url}"
  date="${format(new Date(topic.published_at), 'yyyy年MM月dd日', { locale: ja })}"
  provider="${topic.source === 'guardian' ? 'The Guardian' : 'The New York Times'}"
/>

${outline.title}

${outline.summary.map(s => `- ${s}`).join('\n')}

## セクション1の見出し

本文...

## セクション2の見出し

本文...

<IMAGE TODO>

## まとめ

本文...

---

**出典**: [${topic.title}](${topic.url}) - ${topic.source === 'guardian' ? 'The Guardian' : 'The New York Times'} (${format(new Date(topic.published_at), 'yyyy年MM月dd日', { locale: ja })})
\`\`\`
`;

      const articleMdx = await aiClient.generateText(prompt);
      
      // スラッグ生成
      const slug = outline.title
        .toLowerCase()
        .replace(/[^a-z0-9ぁ-んァ-ヶー一-龠]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) + 
        '-' + Date.now().toString(36);

      // 記事を保存
      await supabaseAdmin
        .from('articles')
        .insert({
          slug,
          topic_id: topic.id,
          title: outline.title,
          summary: outline.summary,
          body_mdx: articleMdx,
          category: topic.genre,
          tags: outline.tags,
          sources: [{
            name: topic.source === 'guardian' ? 'The Guardian' : 'The New York Times',
            url: topic.url,
            date: format(new Date(topic.published_at), 'yyyy-MM-dd'),
          }],
          status: 'DRAFT',
        });

      // ステータス更新
      await supabaseAdmin
        .from('topics')
        .update({ status: 'DRAFTED' })
        .eq('id', topic.id);

      console.log(`記事執筆完了: ${outline.title}`);
      
      await sleep(3000);
      
    } catch (error) {
      console.error(`執筆エラー (${topic.title}):`, error);
    }
  }
  
  console.log('記事執筆が完了しました');
};

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// 実行
writePost();
```

#### 3.3.3 校正エージェント（scripts/polish_post.ts）
```typescript
import { createAIClient } from '../src/lib/ai/client';
import { supabaseAdmin } from '../src/lib/supabase';

const polishPost = async () => {
  console.log('記事の校正を開始...');
  
  const aiClient = createAIClient();
  
  // 下書き記事を取得
  const { data: articles, error } = await supabaseAdmin
    .from('articles')
    .select('*')
    .eq('status', 'DRAFT')
    .limit(5);

  if (error || !articles?.length) {
    console.log('校正対象の記事がありません');
    return;
  }

  for (const article of articles) {
    try {
      const prompt = `
以下の記事を校正してください。

【現在の記事】
${article.body_mdx}

【校正ポイント】
1. 日本語の自然さ（不自然な表現を修正）
2. 読みやすさ（長すぎる文を分割、段落を適切に配置）
3. 誤字脱字の修正
4. 専門用語の説明が適切か確認
5. 「です・ます」調で統一
6. 温かみのある表現になっているか

【注意事項】
- 事実や数値は変更しない
- 出典情報は削除しない
- MDX構造を保持する
- 誇張表現があれば控えめに修正

校正後の記事全文をMDX形式で返してください。
`;

      const polishedMdx = await aiClient.generateText(prompt);
      
      // 校正済み記事を更新
      await supabaseAdmin
        .from('articles')
        .update({
          body_mdx: polishedMdx,
          updated_at: new Date().toISOString(),
        })
        .eq('id', article.id);

      console.log(`校正完了: ${article.title}`);
      
      await sleep(2000);
      
    } catch (error) {
      console.error(`校正エラー (${article.title}):`, error);
    }
  }
  
  console.log('記事校正が完了しました');
};

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// 実行
polishPost();
```

#### 3.3.4 検証エージェント（scripts/verify_post.ts）
```typescript
import { createAIClient } from '../src/lib/ai/client';
import { supabaseAdmin } from '../src/lib/supabase';

type VerificationResult = {
  isValid: boolean;
  issues: Array<{
    type: 'error' | 'warning';
    message: string;
  }>;
  suggestions: string[];
};

const verifyPost = async () => {
  console.log('記事の検証を開始...');
  
  const aiClient = createAIClient();
  
  // 校正済み記事を取得
  const { data: articles, error } = await supabaseAdmin
    .from('articles')
    .select(`
      *,
      topics (*)
    `)
    .eq('status', 'DRAFT')
    .limit(5);

  if (error || !articles?.length) {
    console.log('検証対象の記事がありません');
    return;
  }

  for (const article of articles) {
    const topic = article.topics;
    
    try {
      const prompt = `
以下の記事を検証してください。

【記事内容】
${article.body_mdx}

【元記事情報】
タイトル: ${topic.title}
URL: ${topic.url}
要約: ${topic.abstract || 'なし'}

【検証項目】
1. 出典が正しく記載されているか
2. 事実の歪曲や誇張がないか
3. 誤解を招く表現がないか
4. 医療・金融情報に適切な免責事項があるか
5. センシティブな内容の扱いが適切か
6. 記事の長さが適切か（2000-3000文字）

【要求事項】
以下のJSON形式で検証結果を返してください：
{
  "isValid": true/false,
  "issues": [
    {"type": "error|warning", "message": "問題の説明"}
  ],
  "suggestions": ["改善提案"]
}
`;

      const result = await aiClient.generateJSON<VerificationResult>(prompt);
      
      if (result.isValid) {
        // 検証通過
        await supabaseAdmin
          .from('articles')
          .update({
            status: 'VERIFIED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', article.id);

        // トピックも更新
        await supabaseAdmin
          .from('topics')
          .update({ status: 'VERIFIED' })
          .eq('id', topic.id);

        console.log(`検証通過: ${article.title}`);
      } else {
        // 問題を記録
        await supabaseAdmin
          .from('article_issues')
          .insert({
            article_id: article.id,
            issues: result.issues,
            suggestions: result.suggestions,
          });

        console.log(`検証失敗: ${article.title}`);
        console.log('問題:', result.issues);
      }
      
      await sleep(2000);
      
    } catch (error) {
      console.error(`検証エラー (${article.title}):`, error);
    }
  }
  
  console.log('記事検証が完了しました');
};

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// 実行
verifyPost();
```

### 3.4 パイプライン統合

#### 3.4.1 AI処理統合スクリプト（scripts/ai_pipeline.ts）
```typescript
import { buildOutline } from './build_outline';
import { writePost } from './write_post';
import { polishPost } from './polish_post';
import { verifyPost } from './verify_post';

const runAIPipeline = async () => {
  console.log('=== AI処理パイプライン開始 ===');
  
  try {
    // 1. 構成生成
    console.log('\n[1/4] 構成生成...');
    await buildOutline();
    
    // 2. 記事執筆
    console.log('\n[2/4] 記事執筆...');
    await writePost();
    
    // 3. 校正
    console.log('\n[3/4] 校正...');
    await polishPost();
    
    // 4. 検証
    console.log('\n[4/4] 検証...');
    await verifyPost();
    
    console.log('\n=== AI処理パイプライン完了 ===');
    
  } catch (error) {
    console.error('パイプラインエラー:', error);
    process.exit(1);
  }
};

// 実行
runAIPipeline();
```

## テストとバリデーション

### 3.5.1 プロンプトテスト
```typescript
// scripts/test-prompts.ts
const testPrompts = async () => {
  const aiClient = createAIClient();
  
  // サンプルトピックでテスト
  const sampleTopic = {
    title: "AI Breakthrough in Medical Diagnosis",
    abstract: "New AI system achieves 95% accuracy...",
    genre: "technology",
  };
  
  // 構成生成テスト
  const outline = await generateOutline(sampleTopic);
  console.log('生成された構成:', outline);
  
  // 品質チェック
  assert(outline.title.length <= 30, 'タイトルが長すぎます');
  assert(outline.summary.length >= 3, '要点が少なすぎます');
};
```

### 3.5.2 品質メトリクス
```typescript
// scripts/measure-quality.ts
const measureQuality = async () => {
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('*')
    .eq('status', 'VERIFIED');

  const metrics = {
    averageLength: 0,
    readabilityScore: 0,
    sourceAttribution: 0,
  };

  // 記事ごとに品質を測定
  for (const article of articles) {
    metrics.averageLength += article.body_mdx.length;
    // その他のメトリクス計算
  }

  console.log('品質メトリクス:', metrics);
};
```

## 完了基準
- [ ] AIクライアントの抽象化が実装されている
- [ ] プロンプトテンプレートが整備されている
- [ ] 構成生成エージェントが機能している
- [ ] 記事執筆エージェントが機能している
- [ ] 校正エージェントが機能している
- [ ] 検証エージェントが機能している
- [ ] エラーハンドリングが適切に実装されている
- [ ] 生成される記事が品質基準を満たしている

## 運用上の注意
- API利用料金を監視（特にGPT-4/Claude-3は高額）
- レート制限を守る（OpenAI: 90,000 TPM、Anthropic: 要確認）
- プロンプトのバージョン管理
- 生成品質の定期的な確認
- コストと品質のバランスを考慮したモデル選択

## 次のフェーズへの準備
Phase 3が完了すると、以下が利用可能になります：
- 自動生成された日本語記事
- 品質検証済みのコンテンツ
- MDX形式の記事データ

これらを基に、Phase 4で公開システムを構築します。