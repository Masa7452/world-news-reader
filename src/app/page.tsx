import React from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { ArticleCard } from "@/components/article-card";
import { getPublishedArticles, getCategoriesWithCount } from "@/lib/supabase-server";
import { convertSupabaseArticle, CATEGORIES, type CategoryKey } from "@/types/article";
import { 
  Sparkles, Coffee, Leaf, Cpu, Heart, ShirtIcon,
  Briefcase, Palette, Building2, Trophy, Music, Beaker, GraduationCap, Plane
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
  travel: Plane
};

export default async function HomePage() {
  // Supabaseから記事を取得
  const supabaseArticles = await getPublishedArticles(50);
  const articles = supabaseArticles.map(convertSupabaseArticle);
  
  // カテゴリー別の記事数を取得
  const categoriesWithCount = await getCategoriesWithCount();
  
  // カテゴリー別に記事をグループ化（DBには英字キーで保存されている前提）
  const articlesByCategory = articles.reduce((acc, article) => {
    // DBのcategoryフィールドは'technology'のような英字キー
    const category = article.category as CategoryKey;
    // CATEGORIESに定義されているキーの場合のみグループ化
    if (category in CATEGORIES) {
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(article);
    }
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
      <section className="hero-gradient py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Coffee className="w-10 h-10 text-amber-600" />
            <Sparkles className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4" style={{ color: 'var(--fg)' }}>
            世界の話題を
            <span className="text-gradient bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">ゆっくり知ろう</span>
          </h1>
          <p className="text-lg md:text-xl mb-8 opacity-80" style={{ color: 'var(--fg-muted)' }}>
            コーヒーブレイクに、世界の興味深いニュースを日本語でお届けします
          </p>
          
          {/* カテゴリー統計 */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {categoriesWithCount.slice(0, 5).map((cat) => {
              // DBのcategory値は英字キー（'technology'など）として保存されていると仮定
              const categoryKey = cat.name as CategoryKey;
              
              // CATEGORIESに定義されていないカテゴリーはスキップ
              if (!(categoryKey in CATEGORIES)) return null;
              
              const Icon = categoryIcons[categoryKey];
              const categoryInfo = CATEGORIES[categoryKey];
              
              return (
                <Link
                  key={cat.name}
                  href={`/tags/${categoryKey}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {Icon && React.createElement(Icon, { className: "w-4 h-4" })}
                  <span>{categoryInfo.name}</span>
                  <span className="text-sm opacity-60">({String(cat.count)})</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="container mx-auto py-8 md:py-12 px-4 md:px-6">
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
    </div>
  );
}