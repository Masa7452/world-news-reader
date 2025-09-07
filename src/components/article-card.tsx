"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArticleTag } from "@/components/ArticleTag";
import { CalendarDays, Clock, ArrowRight, ExternalLink, ImageIcon } from "lucide-react";
import type { Article } from "@/data/mock/articles";

interface ArticleCardProps {
  article: Article;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

export const ArticleCard = ({ article }: ArticleCardProps) => {
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // 参考記事のURLからOGP画像を取得
    if (article.sources && article.sources.length > 0) {
      const sourceUrl = article.sources[0].url;
      fetch(`/api/link-preview?url=${encodeURIComponent(sourceUrl)}`)
        .then(res => res.json())
        .then(data => {
          if (data.image) {
            setOgImage(data.image);
          }
          setImageLoading(false);
        })
        .catch(() => {
          setImageError(true);
          setImageLoading(false);
        });
    } else {
      setImageLoading(false);
    }
  }, [article.sources]);

  return (
    <Link href={`/news/${article.slug}`} className="block h-full group">
      <article className="h-full flex flex-col card-base shadow-card hover:shadow-cardHover hover-card rounded-xl overflow-hidden">
        {/* Image Section - OGP画像を表示 */}
        {(imageLoading || ogImage) && (
          <div className="relative h-48 overflow-hidden" style={{ 
            background: 'var(--card-alt)'
          }}>
            {imageLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse">
                  <ImageIcon className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            ) : ogImage ? (
              <img 
                src={ogImage} 
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
              />
            ) : null}
            
            {/* Category badge overlaid on image */}
            <div className="absolute top-4 left-4">
              <ArticleTag>{article.category}</ArticleTag>
            </div>
            
            {/* Read time badge */}
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-1 text-xs text-white bg-black/50 backdrop-blur px-2 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                <span>5分で読める</span>
              </div>
            </div>
          </div>
        )}

        {/* Header Section - Simplified without image */}
        <div className="p-6 border-b" style={{ 
          borderColor: 'var(--divider)',
          background: 'var(--card-alt)'
        }}>
          {/* Show category badge here if no image */}
          {!imageLoading && !ogImage && (
            <div className="flex items-center justify-between mb-4">
              <ArticleTag>{article.category}</ArticleTag>
              <div className="flex items-center gap-1 text-xs text-muted px-2 py-1 rounded-full" style={{ 
                background: 'var(--card)'
              }}>
                <Clock className="h-3 w-3" />
                <span>5分で読める</span>
              </div>
            </div>
          )}
          
          <h3 className="text-xl font-bold leading-tight text-primary line-clamp-2 group-hover:underline transition-all mb-2">
            {article.title}
          </h3>
          
          {/* Date moved to header for better hierarchy */}
          <div className="flex items-center gap-2 text-xs text-muted">
            <CalendarDays className="h-3 w-3" />
            <time>{formatDate(article.publishedAt || article.createdAt)}</time>
          </div>
        </div>

        {/* Content Section - Clean white background */}
        <div className="flex-1 p-6" style={{ background: 'var(--card)' }}>
          <p className="text-muted line-clamp-4 text-sm leading-relaxed">
            {article.summary.join(" ")}
          </p>
        </div>


        {/* Footer Section - Call to action with source info */}
        <div className="px-6 py-4 border-t" style={{ 
          background: 'var(--card)',
          borderColor: 'var(--divider)'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {article.sources && article.sources.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <ExternalLink className="h-3 w-3" />
                  <span className="font-medium">
                    {article.sources[0].name === "The New York Times" ? "NYT" : 
                     article.sources[0].name === "The Guardian" ? "Guardian" : 
                     article.sources[0].name}
                  </span>
                </div>
              )}
              <div className="text-xs text-muted font-medium">
                記事を読む
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-primary opacity-70 group-hover:opacity-100 transition-all">
              <span className="font-medium">もっと見る</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
};