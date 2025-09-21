import React from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/layout/footer";
import { ArticleCard } from "@/components/article-card";
import { getPublishedArticles, getCategoriesWithCount } from "@/lib/supabase-server";
import { convertSupabaseArticle, CATEGORIES, type CategoryKey } from "@/types/article";
import { 
  Sparkles, Coffee, Leaf, Cpu, Heart, ShirtIcon,
  Briefcase, Palette, Building2, Trophy, Music, Beaker, GraduationCap, Plane,
  LayoutGrid
} from "lucide-react";

// カテゴリーアイコンのマッピング
const categoryIcons: Record<CategoryKey, React.ComponentType<{className?: string}>> = {
  environment: Leaf,
  technology: Cpu,
  lifestyle: ShirtIcon,
  health: Heart,
  business: Briefcase,
  culture: Palette,
  politics: Building2,
  sports: Trophy,
  entertainment: Music,
  science: Beaker,
  education: GraduationCap,
  travel: Plane,
  other: LayoutGrid  // その他カテゴリー用のアイコン
};

export default async function HomePage() {
  // Supabaseから記事を取得
  const supabaseArticles = await getPublishedArticles(50);
  const articles = supabaseArticles.map(convertSupabaseArticle);
  
  // カテゴリー別の記事数を取得
  const categoriesWithCount = await getCategoriesWithCount();
  
  // カテゴリー別に記事をグループ化（DBには英字キーで保存されている前提）
  const articlesByCategory = articles.reduce((acc, article) => {
    // カテゴリーの安全な取得
    const category = article.category;
    let categoryKey: CategoryKey = 'other'; // デフォルトは「その他」
    
    if (category && category in CATEGORIES) {
      categoryKey = category as CategoryKey;
    }
    
    if (!acc[categoryKey]) {
      acc[categoryKey] = [];
    }
    acc[categoryKey].push(article);
    
    return acc;
  }, {} as Record<CategoryKey, typeof articles>);

  // 最新記事（上位6件）
  const latestArticles = articles.slice(0, 6);
  
  // 人気記事（仮：ランダムに6件選択）
  const popularArticles = [...articles].sort(() => Math.random() - 0.5).slice(0, 6);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopBar />
      
      {/* Hero Section */}
      <section className="hero-gradient py-16 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Coffee className="w-10 h-10 text-amber-600" />
            <Sparkles className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4" style={{ color: 'var(--fg)' }}>
            世界の話題を
            <span className="text-gradient bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">ゆっくり知ろう</span>
          </h1>
          <p className="text-lg md:text-xl mb-6 opacity-80" style={{ color: 'var(--fg-muted)' }}>
            コーヒーブレイクのような穏やかな時間に、世界のニュースを丁寧に読み解く☕️<br />英語学習にもぴったりです
          </p>
        </div>
      </section>

      <div className="container mx-auto py-6 md:py-8 px-4 md:px-6">
        {/* 最新記事 */}
        {latestArticles.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--fg)' }}>
                最新記事
              </h2>
              <Link 
                href="/tags/all"
                className="text-sm text-blue-600 hover:underline"
              >
                すべて見る →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

        {/* カテゴリー別セクション */}
        {Object.entries(articlesByCategory).slice(0, 3).map(([category, categoryArticles]) => {
          const categoryKey = category as CategoryKey;
          const categoryInfo = CATEGORIES[categoryKey];
          const Icon = categoryIcons[categoryKey];
          
          if (categoryArticles.length === 0) return null;
          
          return (
            <section key={category} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <Icon className="w-6 h-6" />
                <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--fg)' }}>
                  {categoryInfo.name}
                </h2>
                <Link 
                  href={`/tags/${category}`}
                  className="ml-auto text-sm text-blue-600 hover:underline"
                >
                  もっと見る →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryArticles.slice(0, 3).map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          );
        })}

        {/* 記事がない場合 */}
        {articles.length === 0 && (
          <div className="text-center py-20">
            <Coffee className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              記事を準備中です
            </h2>
            <p style={{ color: 'var(--fg-muted)' }}>
              まもなく新しい記事が公開されます。少々お待ちください。
            </p>
          </div>
        )}
      </div>

      {/* カテゴリータグセクション - フッターの上に配置 */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg)' }}>
              カテゴリー別に記事を探す
            </h2>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              興味のあるトピックから記事を見つけてください
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {categoriesWithCount.map((cat) => {
              // カテゴリーの安全な取得とフォールバック
              const categoryKey = cat.name && cat.name in CATEGORIES 
                ? cat.name as CategoryKey 
                : null;
              
              if (!categoryKey) return null;
              
              const Icon = categoryIcons[categoryKey];
              const categoryInfo = CATEGORIES[categoryKey];
              
              return (
                <Link
                  key={cat.name}
                  href={`/tags/${categoryKey}`}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
                >
                  {Icon && React.createElement(Icon, { className: "w-5 h-5 text-gray-600 dark:text-gray-400" })}
                  <span className="font-medium">{categoryInfo.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">({String(cat.count)})</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}