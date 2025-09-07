"use client";

import useSWR from "swr";
import { ExternalLink } from "lucide-react";

type Preview = {
  url: string;
  canonicalUrl?: string;
  siteName?: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  publishedTime?: string;
  authors?: string[];
  embed?: { type: "iframe"; src: string; width?: number; height?: number; allow?: string };
  provider?: string;
};

const fetcher = (u: string) => fetch(u).then(r => r.json());

const formatDate = (iso?: string) => {
  if (!iso) return undefined;
  try {
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(
      new Date(iso)
    );
  } catch {
    return undefined;
  }
};

export function ExternalEmbed({ url }: { url: string }) {
  const { data, isLoading, error } = useSWR<Preview>(`/api/link-preview?url=${encodeURIComponent(url)}`, fetcher);

  if (isLoading) {
    return (
      <div className="rounded-xl overflow-hidden animate-pulse" style={{ 
        background: 'var(--card)',
        border: '1px solid var(--divider)'
      }}>
        <div className="h-48" style={{ background: 'var(--card-alt)' }} />
        <div className="p-4 space-y-3">
          <div className="h-4 rounded" style={{ background: 'var(--divider)', width: '75%' }} />
          <div className="h-3 rounded" style={{ background: 'var(--divider)' }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center gap-2 text-sm hover:underline"
        style={{ color: 'var(--text)' }}
      >
        <ExternalLink className="h-4 w-4" />
        {url}
      </a>
    );
  }

  // 1) iframe埋め込み可能な場合
  if (data.embed?.type === "iframe") {
    return (
      <div className="rounded-xl overflow-hidden" style={{
        background: 'var(--card)',
        border: '1px solid var(--divider)'
      }}>
        <iframe
          src={data.embed.src}
          allow={data.embed.allow}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
          width="100%"
          height={data.embed.height || 400}
          className="block"
          style={{ border: 'none' }}
        />
      </div>
    );
  }

  // 2) 通常のOGPカード表示
  const prettyDate = formatDate(data.publishedTime);
  
  return (
    <a 
      href={data.canonicalUrl || data.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--divider)'
      }}
    >
      <div className="flex flex-col md:flex-row">
        {/* 画像部分 */}
        {data.image && (
          <div className="md:w-48 h-48 md:h-auto overflow-hidden flex-shrink-0" style={{ 
            background: 'var(--card-alt)'
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={data.image} 
              alt={data.title || ""} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* コンテンツ部分 */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-2">
            {data.favicon && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={data.favicon} 
                alt="" 
                className="h-4 w-4 rounded-sm"
              />
            )}
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {data.siteName || new URL(data.url).hostname}
            </span>
          </div>
          
          <h3 className="font-bold text-sm mb-2 line-clamp-2 group-hover:underline" style={{ 
            color: 'var(--text)'
          }}>
            {data.title || data.url}
          </h3>
          
          {data.description && (
            <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-muted)' }}>
              {data.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {data.authors && data.authors.length > 0 && (
              <span>{data.authors.join(", ")}</span>
            )}
            {prettyDate && <span>・{prettyDate}</span>}
          </div>
        </div>
      </div>
    </a>
  );
}

