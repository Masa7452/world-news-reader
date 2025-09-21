import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArticleCard } from "@/components/article-card";
import { getArticlesByCategory } from "@/lib/supabase-server";
import { convertSupabaseArticle, CATEGORIES, type CategoryKey } from "@/types/article";
import { 
  Leaf, Cpu, Heart, ShirtIcon,
  Briefcase, Palette, Building2, Trophy, Music, Beaker, GraduationCap, Plane,
  LayoutGrid, Home, ArrowLeft
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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  
  // 特別な"all"カテゴリーの処理
  if (category === 'all') {
    return notFound(); // 全記事ページは別途作成
  }
  
  // カテゴリーの検証
  const categoryKey = category as CategoryKey;
  if (!(categoryKey in CATEGORIES)) {
    notFound();
  }
  
  const categoryInfo = CATEGORIES[categoryKey];
  const Icon = categoryIcons[categoryKey];
  
  // カテゴリー別記事を取得（50件まで）
  const supabaseArticles = await getArticlesByCategory(category, 50);
  const articles = supabaseArticles.map(convertSupabaseArticle);

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
                <Icon className="h-4 w-4" />
                {categoryInfo.name}
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

        {/* カテゴリーヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Icon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--fg)' }}>
              {categoryInfo.name}
            </h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--fg-muted)' }}>
            {categoryInfo.description}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
            {articles.length}件の記事があります
          </p>
        </div>

        {/* 記事一覧 */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Icon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              記事がありません
            </h2>
            <p className="mb-6" style={{ color: 'var(--fg-muted)' }}>
              この カテゴリーの記事はまだ公開されていません。
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