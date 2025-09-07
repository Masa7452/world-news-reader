import Link from "next/link";
import { ArticleTag } from "@/components/ArticleTag";
import { ThemeToggle } from "@/components/theme-toggle";
import { mockArticles } from "@/data/mock/articles";
import { Home, Coffee } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function TagsPage() {
  const tagCounts = mockArticles.reduce((acc, article) => {
    article.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

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
              <BreadcrumbPage>タグ</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold mb-8">すべてのタグ</h1>

        <div className="flex flex-wrap gap-3">
          {sortedTags.map(([tag, count]) => (
            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
              <div className="relative group">
                <ArticleTag className="text-base py-2 px-4 cursor-pointer hover:scale-105 transition-transform">
                  {tag}
                </ArticleTag>
                <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.5rem] text-center">
                  {count}
                </span>
              </div>
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