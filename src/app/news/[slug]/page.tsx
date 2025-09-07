import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArticleTag } from "@/components/ArticleTag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockArticles } from "@/data/mock/articles";
import { Calendar, ExternalLink, Home, Clock, Share2, BookOpen, Sparkles } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { ArticleSourceInfo } from "@/components/article-source-info";
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
  const article = mockArticles.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header />

      <main className="container py-8 md:py-12">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{article.category}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <article className="max-w-4xl mx-auto">
          <header className="mb-8 space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <ArticleTag>{article.category}</ArticleTag>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                5分で読める
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                約{article.bodyMdx.length}文字
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">{article.title}</h1>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time>{formatDate(article.publishedAt || article.createdAt)}</time>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                シェア
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                  <ArticleTag className="hover:scale-105 transition-transform cursor-pointer">
                    {tag}
                  </ArticleTag>
                </Link>
              ))}
            </div>
          </header>

          <ArticleSourceInfo 
            sources={article.sources}
            publishedDate={article.publishedAt || article.createdAt}
          />

          <Separator className="mb-8" />

          {/* Article Summary Card - Enhanced Design */}
          <div 
            className="mb-8 rounded-xl overflow-hidden shadow-card"
            style={{ 
              background: 'var(--card)',
              border: '1px solid var(--divider)'
            }}
          >
            {/* Header with gradient background */}
            <div 
              className="px-6 py-4 border-b"
              style={{ 
                background: 'var(--card-alt)',
                borderColor: 'var(--divider)'
              }}
            >
              <h2 className="flex items-center gap-3 text-lg font-bold text-primary">
                <div 
                  className="p-2 rounded-lg"
                  style={{ background: 'var(--card)' }}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                記事の要点
              </h2>
            </div>
            
            {/* Content with improved list styling */}
            <div className="p-6" style={{ background: 'var(--card)' }}>
              <ul className="space-y-4">
                {article.summary.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ 
                        background: 'var(--card-alt)',
                        color: 'var(--text)'
                      }}
                    >
                      {index + 1}
                    </div>
                    <span className="text-primary leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <MarkdownContent content={article.bodyMdx} />
          </div>

          <Separator className="mb-8" />

          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6">関連記事</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {mockArticles
                .filter(
                  (a) =>
                    a.id !== article.id &&
                    a.tags.some((tag) => article.tags.includes(tag))
                )
                .slice(0, 4)
                .map((relatedArticle) => (
                  <Link
                    key={relatedArticle.id}
                    href={`/news/${relatedArticle.slug}`}
                  >
                    <Card className="h-full hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">
                          {relatedArticle.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(relatedArticle.publishedAt || relatedArticle.createdAt)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}

export async function generateStaticParams() {
  return mockArticles.map((article) => ({
    slug: article.slug,
  }));
}