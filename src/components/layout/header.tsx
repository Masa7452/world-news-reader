import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Coffee } from "lucide-react";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Coffee className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">World News Reader</span>
        </Link>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/tags">
              <Button variant="ghost">タグ</Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
          </nav>
          <div className="flex items-center space-x-2">
            <div className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground">
              <span>世界の話題をゆっくり知ろう</span>
              <Coffee className="h-4 w-4" />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};