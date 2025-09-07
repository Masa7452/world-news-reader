import Link from "next/link";
import { ArticleTag } from "@/components/ArticleTag";
import { CalendarDays, Clock, ArrowRight } from "lucide-react";
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
  return (
    <Link href={`/news/${article.slug}`} className="block h-full group">
      <article className="h-full flex flex-col card-base shadow-card hover:shadow-cardHover hover-card rounded-xl overflow-hidden">
        {/* Header Section - Enhanced with subtle background */}
        <div className="p-6 border-b" style={{ 
          borderColor: 'var(--divider)',
          background: 'var(--card-alt)'
        }}>
          <div className="flex items-center justify-between mb-4">
            <ArticleTag>{article.category}</ArticleTag>
            <div className="flex items-center gap-1 text-xs text-muted px-2 py-1 rounded-full" style={{ 
              background: 'var(--card)'
            }}>
              <Clock className="h-3 w-3" />
              <span>5分で読める</span>
            </div>
          </div>
          
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


        {/* Footer Section - Call to action */}
        <div className="px-6 py-4 border-t" style={{ 
          background: 'var(--card)',
          borderColor: 'var(--divider)'
        }}>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted font-medium">
              記事を読む
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