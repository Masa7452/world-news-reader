import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Footer = () => {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">World News Reader</h3>
            <p className="text-sm text-muted-foreground">
              コーヒーブレイクのような時間に、世界の話題をゆっくり楽しむ
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">コンテンツ</h4>
            <nav className="flex flex-col space-y-2">
              <Link href="/">
                <Button variant="link" className="h-auto p-0 justify-start">
                  最新記事
                </Button>
              </Link>
              <Link href="/tags">
                <Button variant="link" className="h-auto p-0 justify-start">
                  タグ一覧
                </Button>
              </Link>
            </nav>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">情報</h4>
            <nav className="flex flex-col space-y-2">
              <Link href="/about">
                <Button variant="link" className="h-auto p-0 justify-start">
                  このサイトについて
                </Button>
              </Link>
            </nav>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">ポリシー</h4>
            <p className="text-xs text-muted-foreground">
              すべての記事において、元記事への適切なクレジットとリンクを提供しています
            </p>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2025 World News Reader. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by AI & Human Curation
          </p>
        </div>
      </div>
    </footer>
  );
};