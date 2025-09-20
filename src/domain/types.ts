/**
 * ドメイン層の型定義
 * すべての型はイミュータブル（readonly）として定義
 */

// ========================================
// 基本型定義
// ========================================

/** データプロバイダー */
export type Provider = 'newsapi';

/** 記事のジャンル */
export type Genre = 
  | 'news'
  | 'health'
  | 'product'
  | 'trend'
  | 'glossary'
  | 'technology'
  | 'lifestyle'
  | 'culture'
  | 'business'
  | 'science';

/** トピックのステータス */
export type TopicStatus = 
  | 'NEW'
  | 'QUEUED'
  | 'REJECTED'
  | 'OUTLINED'
  | 'DRAFTED'
  | 'VERIFIED'
  | 'PUBLISHED';

/** 記事のステータス */
export type ArticleStatus = 'DRAFT' | 'VERIFIED' | 'PUBLISHED';

// ========================================
// APIから取得したデータの正規化型
// ========================================

/** 画像情報 */
export type ImageInfo = {
  readonly url: string;
  readonly caption?: string;
  readonly credit?: string;
};

/** 
 * APIから取得した記事の正規化型
 * NewsAPI のレスポンスを統一的に扱う
 */
export type SourceItem = {
  readonly provider: Provider;
  readonly providerId: string;            // 供給元の安定識別子（URL使用）
  readonly url: string;                   // 記事URL
  readonly title: string;                 // 見出し
  readonly abstract?: string;             // 要旨
  readonly publishedAt: string;           // ISO8601形式
  readonly section?: string;              // セクション
  readonly subsection?: string;           // サブセクション
  readonly byline?: string;               // 署名・著者
  readonly tags?: readonly string[];      // タグ・キーワード
  readonly type?: string;                 // 記事種別
  readonly wordCount?: number;            // 語数
  readonly image?: ImageInfo;             // メイン画像
  readonly body?: string;                 // 本文（HTML形式）
  readonly bodyText?: string;             // 本文（プレーンテキスト）
  readonly sourceName: 'NewsAPI';         // NewsAPI固定
};

// ========================================
// 選定されたトピック
// ========================================

/**
 * 記事選定後のトピック情報
 */
export type Topic = {
  readonly id: string;                    // UUID
  readonly sourceId?: string;             // ソースID（参照）
  readonly source: Provider;              // 供給元
  readonly title: string;                 // タイトル
  readonly url: string;                   // 元記事URL
  readonly publishedAt: string;           // 公開日時（ISO8601）
  readonly abstract?: string;             // 要旨
  readonly section?: string;              // セクション
  readonly subsection?: string;           // サブセクション
  readonly score: number;                 // 選定スコア（0.00-1.00）
  readonly status: TopicStatus;           // ステータス
  readonly genre: Genre;                  // ジャンル
  readonly canonicalKey: string;          // 重複排除用キー
  readonly related?: readonly string[];   // 関連トピックID
  readonly createdAt: string;             // 作成日時
  readonly updatedAt: string;             // 更新日時
};

// ========================================
// 記事構成（アウトライン）
// ========================================

/** セクション情報 */
export type OutlineSection = {
  readonly heading: string;
  readonly points: readonly string[];
};

/**
 * AIが生成した記事構成
 */
export type TopicOutline = {
  readonly id: string;
  readonly topicId: string;
  readonly title: string;                 // 日本語タイトル
  readonly summary: readonly string[];    // 要点（箇条書き）
  readonly sections: readonly OutlineSection[];
  readonly tags: readonly string[];       // 記事タグ
  readonly createdAt: string;
};

// ========================================
// 生成された記事
// ========================================

/** 記事の出典情報 */
export type ArticleSource = {
  readonly name: string;                  // 媒体名
  readonly url: string;                   // 記事URL
  readonly date?: string;                 // 公開日
};

/**
 * 生成・公開される記事データ
 */
export type Article = {
  readonly id: string;                    // UUID
  readonly slug: string;                  // URLスラッグ
  readonly topicId?: string;              // トピックID（参照）
  readonly title: string;                 // 記事タイトル
  readonly summary: readonly string[];    // 要点リスト
  readonly bodyMdx: string;               // MDX形式の本文
  readonly category: string;              // カテゴリー
  readonly tags: readonly string[];       // タグ
  readonly sources: readonly ArticleSource[];  // 出典情報
  readonly imageUrl?: string;             // サムネイル画像URL
  readonly status: ArticleStatus;         // ステータス
  readonly createdAt: string;             // 作成日時
  readonly updatedAt: string;             // 更新日時
  readonly publishedAt?: string;          // 公開日時
};

// ========================================
// 検証結果
// ========================================

/** 検証で発見された問題 */
export type VerificationIssue = {
  readonly type: 'error' | 'warning';
  readonly message: string;
};

/**
 * 記事の検証結果
 */
export type VerificationResult = {
  readonly isValid: boolean;
  readonly issues: readonly VerificationIssue[];
  readonly suggestions: readonly string[];
};

// ========================================
// ユーティリティ型
// ========================================

/** ページネーション情報 */
export type PaginationInfo = {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalCount: number;
  readonly pageSize: number;
};

/** API応答の基本型 */
export type ApiResponse<T> = {
  readonly data: T;
  readonly pagination?: PaginationInfo;
  readonly error?: string;
};

/** バッチ処理結果 */
export type BatchResult = {
  readonly processed: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly errors: readonly string[];
};
