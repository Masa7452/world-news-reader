import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArticleTag } from "@/components/ArticleTag";
import { ArticleShare } from "@/components/article-share";
import { Separator } from "@/components/ui/separator";
import { getArticleBySlug } from "@/lib/supabase-server";
import { convertSupabaseArticle, CATEGORIES, type CategoryKey } from "@/types/article";
import { Calendar, ExternalLink, Home, Clock, BookOpen, Sparkles } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { ArticleSourceInfo } from "@/components/article-source-info";
import { ExternalEmbed } from "@/components/external-embed";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabaseArticle = await getArticleBySlug(slug);

  if (!supabaseArticle) {
    notFound();
  }

  const article = convertSupabaseArticle(supabaseArticle);
  // DBのcategoryは英字キー（'technology'など）として保存されている
  const categoryKey = article.category as CategoryKey;
  const categoryInfo = (categoryKey in CATEGORIES) ? CATEGORIES[categoryKey] : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header />

      <main className="container py-8 md:py-12">
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
              <BreadcrumbLink href={`/tags/${(categoryKey in CATEGORIES) ? categoryKey : 'all'}`}>
                {categoryInfo?.name || article.category}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">
                {article.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <article className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <header className="mb-8">
            <div className="flex flex-wrap gap-2 mb-4">
              {article.tags.map((tag) => (
                <ArticleTag key={tag}>{tag}</ArticleTag>
              ))}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--fg)' }}>
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {article.published_at && formatDate(article.published_at)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                5分で読める
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {article.category}
              </div>
              <div className="ml-auto">
                <ArticleShare title={article.title} url={`/news/${article.slug}`} />
              </div>
            </div>
          </header>

          <Separator className="mb-8" />

          {/* サマリー */}
          {article.summary.length > 0 && (
            <div className="mb-8 p-6 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <h2 className="font-semibold text-amber-900 dark:text-amber-100">
                  この記事のポイント
                </h2>
              </div>
              <ul className="space-y-2">
                {article.summary.map((point, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span className="text-amber-800 dark:text-amber-200">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 本文 */}
          <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
            <MarkdownContent content={article.body_mdx} />
          </div>

          {/* 出典 */}
          {article.sources.length > 0 && (
            <div className="mb-8">
              <Separator className="mb-6" />
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                出典・参考資料
              </h2>
              <div className="space-y-3">
                <ArticleSourceInfo 
                  sources={article.sources} 
                  publishedDate={article.published_at || article.created_at} 
                />
              </div>
            </div>
          )}

          {/* 外部埋め込み（必要に応じて） */}
          {article.sources[0]?.url && (
            <div className="mb-8">
              <ExternalEmbed url={article.sources[0].url} />
            </div>
          )}

          {/* フッターシェア */}
          <div className="mt-12 p-6 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold mb-1">この記事は参考になりましたか？</p>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                  気に入ったら友達にシェアしてください
                </p>
              </div>
              <ArticleShare title={article.title} url={`/news/${article.slug}`} />
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}