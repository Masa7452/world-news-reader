"use client";

import { use } from "react";
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

export default function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
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
              <button 
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ 
                  color: 'var(--text)',
                  border: '1px solid var(--divider)',
                  background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--card-alt)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: article.title,
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
              >
                <Share2 className="h-4 w-4" />
                シェア
              </button>
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

          {/* Source Article Preview (Notion-like embed) */}
          {article.sources && article.sources.length > 0 && (
            <div className="mb-8">
              <div className="px-1 py-2">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <ExternalLink className="h-4 w-4" />
                  参考記事
                </h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {article.sources.map((source, index) => (
                  <ExternalEmbed key={index} url={source.url} />
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <MarkdownContent content={article.bodyMdx} />
          </div>

          <Separator className="mb-8" />

          {/* Related Articles Section - Enhanced Design */}
          <div className="mt-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold tracking-tight text-primary mb-3">関連記事</h2>
              <p className="text-muted max-w-2xl mx-auto">
                同じタグの記事をもっと読んでみませんか
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
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
                    className="block group"
                  >
                    <div 
                      className="h-full p-6 rounded-xl shadow-card hover:shadow-cardHover hover-card transition-all"
                      style={{ 
                        background: 'var(--card)',
                        border: '1px solid var(--divider)'
                      }}
                    >
                      {/* Category Tag */}
                      <div className="mb-3">
                        <ArticleTag className="text-xs">{relatedArticle.category}</ArticleTag>
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-bold text-lg mb-3 line-clamp-2 text-primary group-hover:text-accent1 transition-colors">
                        {relatedArticle.title}
                      </h3>
                      
                      {/* Summary */}
                      <p className="text-sm text-muted line-clamp-2 mb-4 leading-relaxed">
                        {relatedArticle.summary.slice(0, 1).join("")}
                      </p>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--divider)' }}>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <Calendar className="h-3 w-3" />
                          <time>{formatDate(relatedArticle.publishedAt || relatedArticle.createdAt)}</time>
                        </div>
                        <div className="text-xs text-primary opacity-70 group-hover:opacity-100 transition-opacity">
                          →
                        </div>
                      </div>
                    </div>
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
