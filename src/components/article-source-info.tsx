import { ExternalLink } from "lucide-react";

interface ArticleSourceInfoProps {
  sources: {
    name: string;
    url: string;
    date?: string;
  }[];
  publishedDate: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
};

export const ArticleSourceInfo = ({ sources, publishedDate }: ArticleSourceInfoProps) => {
  // Always use the first source to avoid hydration mismatch
  const selectedSource = sources[0];
  
  if (!selectedSource) {
    return null;
  }
  
  return (
    <div className="mb-8 text-sm text-muted-foreground border-l-4 border-muted pl-4 py-2">
      {formatDate(publishedDate)}の記事　|　出典：
      {sources.map((source, index) => (
        <span key={index}>
          {index > 0 && <span className="mx-1">・</span>}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
          >
            {source.name}
            <ExternalLink className="h-3 w-3" />
          </a>
        </span>
      ))}
    </div>
  );
};