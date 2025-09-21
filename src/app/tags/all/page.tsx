import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArticleCard } from "@/components/article-card";
import { getPublishedArticles, getCategoriesWithCount } from "@/lib/supabase-server";
import { convertSupabaseArticle, CATEGORIES, type CategoryKey } from "@/types/article";
import { 
  Leaf, Cpu, Heart, ShirtIcon,
  Briefcase, Palette, Building2, Trophy, Music, Beaker, GraduationCap, Plane,
  LayoutGrid, Home, ArrowLeft, Filter
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
  other: LayoutGrid
};

export default async function AllArticlesPage() {
  // 全記事を取得（100件まで）
  const supabaseArticles = await getPublishedArticles(100);
  const articles = supabaseArticles.map(convertSupabaseArticle);
  
  // カテゴリー一覧を取得
  const categoriesWithCount = await getCategoriesWithCount();

  // カテゴリー別に記事をグループ化
  const articlesByCategory = articles.reduce((acc, article) => {
    const category = article.category;
    let categoryKey: CategoryKey = 'other';
    
    if (category && category in CATEGORIES) {
      categoryKey = category as CategoryKey;
    }
    
    if (!acc[categoryKey]) {
      acc[categoryKey] = [];
    }
    acc[categoryKey].push(article);
    
    return acc;
  }, {} as Record<CategoryKey, typeof articles>);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header />

      <main className="container py-8 md:py-12">
        {/* パンくずリスト */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                ホーム
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                すべての記事
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* 戻るボタン */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          ホームに戻る
        </Link>

        {/* ページヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <LayoutGrid className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--fg)' }}>
              すべての記事
            </h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--fg-muted)' }}>
            世界の話題をカテゴリー別に整理してお届けします
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
            全{articles.length}件の記事
          </p>
        </div>

        {/* カテゴリーフィルター */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
              カテゴリーで絞り込み
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {categoriesWithCount.map((cat) => {
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
                >
                  {Icon && <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                  <span className="font-medium">{categoryInfo.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {cat.count as number}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 記事一覧（時系列順） */}
        {articles.length > 0 ? (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--fg)' }}>
                最新記事（時系列順）
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>

            {/* カテゴリー別セクション */}
            {Object.entries(articlesByCategory).map(([category, categoryArticles]) => {
              const categoryKey = category as CategoryKey;
              const categoryInfo = CATEGORIES[categoryKey];
              const Icon = categoryIcons[categoryKey];
              
              if (categoryArticles.length === 0) return null;
              
              return (
                <section key={category}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6" />
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                        {categoryInfo.name}
                      </h2>
                      <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {categoryArticles.length}件
                      </span>
                    </div>
                    <Link 
                      href={`/tags/${category}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      もっと見る →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryArticles.slice(0, 6).map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <LayoutGrid className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              記事がありません
            </h2>
            <p className="mb-6" style={{ color: 'var(--fg-muted)' }}>
              まだ記事が公開されていません。まもなく新しい記事が追加されます。
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              ホームに戻る
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}