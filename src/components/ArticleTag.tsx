interface ArticleTagProps {
  children: string;
  className?: string;
}

// Pocket/Google-style color mapping for categories and tags
const getTagColor = (text: string): string => {
  // Category color mapping (優先度高)
  const categoryMap: Record<string, string> = {
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
  };

  // Check for exact category match first
  if (categoryMap[text]) {
    return categoryMap[text];
  }

  // Tag-specific color mapping
  const tagMap: Record<string, string> = {
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
  };

  if (tagMap[text]) {
    return tagMap[text];
  }

  // Hash-based color for consistency
  const colors = [
    'tag-red', 'tag-orange', 'tag-amber', 'tag-yellow', 'tag-lime',
    'tag-green', 'tag-emerald', 'tag-teal', 'tag-cyan', 'tag-sky',
    'tag-blue', 'tag-indigo', 'tag-violet', 'tag-purple', 'tag-fuchsia',
    'tag-pink', 'tag-rose'
  ];

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff;
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export const ArticleTag = ({ children, className = "" }: ArticleTagProps) => {
  const colorClass = getTagColor(children);
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all ${colorClass} ${className}`}>
      {children}
    </span>
  );
};