import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Home, Coffee } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function AboutPage() {
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
              <BreadcrumbPage>About</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <article className="max-w-4xl mx-auto prose prose-lg dark:prose-invert">
          <h1 className="text-4xl font-bold mb-8">About World News Reader</h1>

          <div className="bg-muted p-6 rounded-lg mb-8">
            <div className="flex items-center gap-1 text-xl font-medium mb-0">
              <span>「世界の話題をゆっくり知ろう</span>
              <Coffee className="h-5 w-5" />
              <span>」</span>
            </div>
            <p className="text-muted-foreground">
              コーヒーブレイクのようなゆったりとした時間に、世界の興味深い話題を楽しめる空間
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">私たちの使命</h2>
            <p>
              World News Readerは、The GuardianやThe New York Timesなどの世界的なメディアから
              厳選された記事を、分かりやすく提供するサービスです。
              忙しい日常の中で、コーヒーを片手にゆっくりと世界の話題に触れる時間を提供します。
            </p>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">特徴</h2>
            <ul className="space-y-3">
              <li>
                <strong>厳選された記事</strong>：AIが世界の主要メディアから価値ある題材を自動で選定
              </li>
              <li>
                <strong>読みやすい構成</strong>：5-10分でじっくり読める、適切なボリュームの記事
              </li>
              <li>
                <strong>透明性の確保</strong>：すべての記事に出典（媒体名・URL・日付）を明記
              </li>
              <li>
                <strong>幅広いトピック</strong>：ニュース、テクノロジー、ヘルスケア、ライフスタイルなど多様なジャンル
              </li>
            </ul>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">利用ポリシー</h2>
            <ul className="space-y-3">
              <li>本サービスの記事は、元記事の要約・再構成であり、直接の転載ではありません</li>
              <li>すべての記事において、元記事への適切なクレジットとリンクを提供しています</li>
              <li>医療・金融に関する情報は参考程度にとどめ、専門家にご相談ください</li>
              <li>記事の内容について、正確性を心がけていますが、完全性を保証するものではありません</li>
            </ul>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">技術について</h2>
            <p>
              本サービスは、最新のAI技術を活用して記事の選定、構成、執筆、校正を行っています。
              人間のレビューと組み合わせることで、高品質で読みやすい記事を提供しています。
            </p>
          </section>

          <Separator className="my-8" />

          <section>
            <h2 className="text-2xl font-semibold mb-4">お問い合わせ</h2>
            <p>
              ご意見・ご要望がございましたら、お気軽にお問い合わせください。
              より良いサービスの提供に努めてまいります。
            </p>
          </section>
        </article>
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