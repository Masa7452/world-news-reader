import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { mockArticles } from "@/data/mock/articles";
import { Calendar, Home, Coffee } from "lucide-react";
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

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const filteredArticles = mockArticles.filter((article) =>
    article.tags.includes(decodedTag)
  );

  if (filteredArticles.length === 0) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            World News Reader
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
              <span>世界の話題をゆっくり知ろう</span>
              <Coffee className="h-4 w-4" />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/tags">タグ</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{decodedTag}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            タグ: {decodedTag}
          </h1>
          <p className="text-muted-foreground">
            {filteredArticles.length}件の記事が見つかりました
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <Link key={article.id} href={`/news/${article.slug}`}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 mb-4">
                    {article.summary.join(" ")}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <time>{formatDate(article.publishedAt || article.createdAt)}</time>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  {article.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant={tag === decodedTag ? "default" : "secondary"}
                    >
                      {tag}
                    </Badge>
                  ))}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 World News Reader. All rights reserved.
            </p>
            <nav className="flex gap-4">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link href="/tags" className="text-sm text-muted-foreground hover:text-foreground">
                Tags
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

export async function generateStaticParams() {
  const allTags = new Set<string>();
  mockArticles.forEach((article) => {
    article.tags.forEach((tag) => allTags.add(tag));
  });

  return Array.from(allTags).map((tag) => ({
    tag: encodeURIComponent(tag),
  }));
}