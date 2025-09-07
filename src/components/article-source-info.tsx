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

const getRandomSource = (sources: ArticleSourceInfoProps['sources']) => {
  const preferredSources = ['The Guardian', 'The New York Times'];
  const availableSources = sources.filter(source => 
    preferredSources.includes(source.name)
  );
  
  if (availableSources.length > 0) {
    return availableSources[Math.floor(Math.random() * availableSources.length)];
  }
  
  return sources[0];
};

export const ArticleSourceInfo = ({ sources, publishedDate }: ArticleSourceInfoProps) => {
  const selectedSource = getRandomSource(sources);
  
  return (
    <div className="mb-8 text-sm text-muted-foreground border-l-4 border-muted pl-4 py-2">
      {formatDate(publishedDate)}の記事　|　出典：
      <a
        href={selectedSource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground hover:underline inline-flex items-center gap-1 ml-1"
      >
        {selectedSource.name}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
};