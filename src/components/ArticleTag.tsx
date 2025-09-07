interface ArticleTagProps {
  readonly children: string;
  readonly className?: string;
}

// Category color mapping (優先度高)
const categoryColorMap: Record<string, string> = {
  "環境": "tag-green",
  "テクノロジー": "tag-blue", 
  "ライフスタイル": "tag-purple",
  "ヘルスケア": "tag-red",
  "ビジネス": "tag-indigo",
  "カルチャー": "tag-pink",
  "政治": "tag-rose",
  "スポーツ": "tag-orange",
  "エンターテインメント": "tag-fuchsia",
  "科学": "tag-cyan",
  "教育": "tag-amber",
  "旅行": "tag-teal",
  "料理": "tag-lime",
  "音楽": "tag-violet",
  "映画": "tag-sky"
} as const;

// Tag-specific color mapping
const tagColorMap: Record<string, string> = {
  // Tech tags
  "AI": "tag-blue",
  "機械学習": "tag-cyan",
  "ブロックチェーン": "tag-indigo",
  "クラウド": "tag-sky",
  "データサイエンス": "tag-blue",
  "プログラミング": "tag-violet",
  "Web開発": "tag-teal",
  "モバイル": "tag-purple",
  "IoT": "tag-emerald",
  
  // Health tags
  "健康": "tag-red",
  "医療": "tag-rose",
  "ワクチン": "tag-pink",
  "栄養": "tag-green",
  "運動": "tag-orange",
  "睡眠": "tag-indigo",
  "メンタルヘルス": "tag-purple",
  
  // Environment tags
  "気候変動": "tag-green",
  "持続可能性": "tag-emerald",
  "再生可能エネルギー": "tag-lime",
  "環境保護": "tag-teal",
  "カーボンニュートラル": "tag-green",
  
  // Business tags
  "経済": "tag-indigo",
  "スタートアップ": "tag-purple",
  "投資": "tag-blue",
  "マーケティング": "tag-pink",
  "リーダーシップ": "tag-amber",
  "イノベーション": "tag-cyan",
  
  // Lifestyle tags
  "ファッション": "tag-pink",
  "美容": "tag-rose",
  "インテリア": "tag-purple",
  "DIY": "tag-orange",
  "ガーデニング": "tag-green",
  "ペット": "tag-yellow",
  
  // Culture tags
  "アート": "tag-fuchsia",
  "デザイン": "tag-violet",
  "写真": "tag-sky",
  "文学": "tag-indigo",
  "歴史": "tag-amber",
  
  // General tags
  "ニュース": "tag-red",
  "トレンド": "tag-pink",
  "レビュー": "tag-purple",
  "ガイド": "tag-blue",
  "チュートリアル": "tag-green",
  "比較": "tag-orange",
  "分析": "tag-cyan",
  "予測": "tag-violet",
  "研究": "tag-indigo",
  "調査": "tag-teal"
} as const;

const colorOptions = [
  'tag-red', 'tag-orange', 'tag-amber', 'tag-yellow', 'tag-lime',
  'tag-green', 'tag-emerald', 'tag-teal', 'tag-cyan', 'tag-sky',
  'tag-blue', 'tag-indigo', 'tag-violet', 'tag-purple', 'tag-fuchsia',
  'tag-pink', 'tag-rose'
] as const;

const generateHashBasedColor = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return colorOptions[0];
  }
  
  const hash = text
    .split('')
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff, 0);
  
  return colorOptions[Math.abs(hash) % colorOptions.length];
};

const getTagColor = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return colorOptions[0];
  }

  // Early return for category match
  if (categoryColorMap[text]) {
    return categoryColorMap[text];
  }

  // Early return for tag match
  if (tagColorMap[text]) {
    return tagColorMap[text];
  }

  // Fallback to hash-based color
  return generateHashBasedColor(text);
};

export const ArticleTag = ({ children, className = "" }: ArticleTagProps) => {
  if (!children || typeof children !== 'string') {
    return null;
  }
  
  const colorClass = getTagColor(children);
  
  // デバッグ用のログ（開発時のみ）
  if (process.env.NODE_ENV === 'development') {
    console.log(`Tag: "${children}" -> Color: ${colorClass}`);
  }
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all ${colorClass} ${className}`}>
      {children}
    </span>
  );
};