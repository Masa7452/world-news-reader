/**
 * Gemini API クライアント
 * Google Generative AI を使用した記事生成・校正・検証
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from '@google/generative-ai';

// 安全性設定（緩めに設定してニュース記事に対応）
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// モデル設定
export const MODELS = {
  FLASH: 'gemini-1.5-flash', // 高速・低コスト
  PRO: 'gemini-1.5-pro',     // 高精度
} as const;

// デフォルトの生成設定
const defaultGenerationConfig: GenerationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 4096,
};

let cachedClient: GoogleGenerativeAI | null = null;
let cachedApiKey: string | null = null;

const getModel = (
  modelName: string,
  config?: Partial<GenerationConfig>
) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenerativeAI(apiKey);
    cachedApiKey = apiKey;
  }

  return cachedClient.getGenerativeModel({
    model: modelName,
    safetySettings,
    generationConfig: { ...defaultGenerationConfig, ...config },
  });
};

/**
 * エラー処理付きのGemini API呼び出し
 */
const callGeminiWithRetry = async (
  prompt: string,
  modelName: string = MODELS.FLASH,
  config?: Partial<GenerationConfig>,
  maxRetries: number = 3
): Promise<string> => {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = getModel(modelName, config);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }
      
      return text;
    } catch (error) {
      lastError = error as Error;
      
      // レート制限エラーの場合は指数バックオフ
      if (error instanceof Error && 
          (error.message.includes('429') || 
           error.message.includes('RATE_LIMIT') ||
           error.message.includes('quota'))) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2^attempt 秒待機
        console.warn(`⚠️ Rate limit hit, waiting ${waitTime}ms before retry (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // その他のエラーは即座に投げる
      throw error;
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
};

/**
 * アウトライン生成
 */
export const generateOutline = async (
  title: string,
  abstract: string,
  genre: string,
  template?: string
): Promise<string> => {
  const prompt = `
あなたは優秀な日本語ニュース編集者です。
以下のニュース記事について、読者が理解しやすい記事構成のアウトラインを作成してください。

【記事情報】
タイトル: ${title}
ジャンル: ${genre}
要約: ${abstract}

${template ? `【参考構成例】\n${template}\n` : ''}

【要件】
- 日本語で作成
- 4-5セクション構成
- 各セクション2-3の要点
- 読者の興味を引く構成
- 5分程度で読める分量

【出力形式】
JSON形式で以下の構造で出力:
{
  "sections": [
    {
      "title": "セクションタイトル",
      "points": ["要点1", "要点2", "要点3"]
    }
  ]
}
`;

  const response = await callGeminiWithRetry(prompt, MODELS.FLASH, {
    temperature: 0.6,
    maxOutputTokens: 2048,
  });

  // JSONを抽出（コードブロックがある場合も考慮）
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse outline JSON from response');
  }

  return jsonMatch[0];
};

/**
 * 記事本文生成
 */
export const generateArticle = async (
  title: string,
  outline: string,
  sources: Array<{ title: string; url: string; abstract?: string }>
): Promise<string> => {
  const prompt = `
あなたは優秀な日本語ニュースライターです。
以下のアウトラインに基づいて、読みやすい日本語記事を作成してください。

【記事タイトル】
${title}

【アウトライン】
${outline}

【参考ソース】
${sources.map((s, i) => `${i + 1}. ${s.title}\n   ${s.abstract || ''}`).join('\n')}

【要件】
- 自然な日本語で執筆
- 事実に基づく内容
- 中立的な視点
- 読者にわかりやすい説明
- 専門用語には簡単な説明を追加
- 5分程度で読める分量（1500-2000文字）

【出力形式】
Markdown形式で記事本文のみを出力してください。
見出しはアウトラインのセクションに対応させてください。
`;

  const response = await callGeminiWithRetry(prompt, MODELS.PRO, {
    temperature: 0.7,
    maxOutputTokens: 4096,
  });

  return response;
};

/**
 * 記事校正
 */
export const polishArticle = async (
  articleContent: string
): Promise<string> => {
  const prompt = `
あなたは優秀な日本語校正者です。
以下の記事を読みやすく自然な日本語に校正してください。

【元記事】
${articleContent}

【校正ポイント】
- 文法・語法の誤りを修正
- 読みやすい文章構成に調整
- 専門用語の説明を確認
- 論理的な流れを確保
- 冗長な表現を簡潔に

【注意事項】
- 事実や数値は変更しない
- 記事の主旨を変えない
- Markdown形式を維持

校正後の記事全文をMarkdown形式で出力してください。
`;

  const response = await callGeminiWithRetry(prompt, MODELS.FLASH, {
    temperature: 0.5,
    maxOutputTokens: 4096,
  });

  return response;
};

/**
 * 記事検証
 */
export const verifyArticle = async (
  articleContent: string,
  sources: Array<{ title: string; url: string }>
): Promise<{ issues: string[]; suggestions: string[] }> => {
  const prompt = `
あなたは優秀なファクトチェッカーです。
以下の記事を検証し、問題点と改善提案を提示してください。

【記事内容】
${articleContent}

【元ソース】
${sources.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}

【検証項目】
1. 事実関係の正確性
2. 誇大表現の有無
3. 出典の適切性
4. 中立性・バランス
5. 誤解を招く表現

【出力形式】
JSON形式で以下の構造で出力:
{
  "issues": ["問題点1", "問題点2"],
  "suggestions": ["改善提案1", "改善提案2"]
}
`;

  const response = await callGeminiWithRetry(prompt, MODELS.FLASH, {
    temperature: 0.3, // 検証は厳密に
    maxOutputTokens: 2048,
  });

  // JSONを抽出
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { issues: [], suggestions: [] };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { issues: ['検証結果の解析に失敗しました'], suggestions: [] };
  }
};

/**
 * トピック選定用のスコアリング
 */
export const scoreTopics = async (
  topics: Array<{ title: string; abstract: string }>
): Promise<Array<{ title: string; score: number; reason: string }>> => {
  const prompt = `
あなたは優秀なニュース編集者です。
以下のトピックを日本の読者向けにスコアリングしてください。

【トピック一覧】
${topics.map((t, i) => `${i + 1}. ${t.title}\n   ${t.abstract}`).join('\n\n')}

【評価基準】
- 日本の読者への関連性（40%）
- ニュース価値・重要性（30%）
- 興味深さ・話題性（20%）
- 情報の新規性（10%）

【出力形式】
JSON形式で以下の構造で出力:
[
  {
    "title": "記事タイトル",
    "score": 85,
    "reason": "スコアリングの理由"
  }
]

スコアは0-100の整数で評価してください。
`;

  const response = await callGeminiWithRetry(prompt, MODELS.FLASH, {
    temperature: 0.5,
    maxOutputTokens: 2048,
  });

  // JSONを抽出
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse scoring JSON from response');
  }

  return JSON.parse(jsonMatch[0]);
};
