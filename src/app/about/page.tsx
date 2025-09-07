"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Coffee } from "lucide-react";
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
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopBar />

      <main className="container py-12 md:py-20">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">🏠</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>About</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Header */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border" style={{ 
              background: 'var(--card-alt)',
              borderColor: 'var(--divider)',
              color: 'var(--text)'
            }}>
              <Coffee className="h-5 w-5" />
              <span className="font-medium">About</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary">
              World News Reader
            </h1>
            
            <p className="text-xl text-muted leading-relaxed max-w-2xl mx-auto">
              世界の話題をゆっくり知ろう ☕️
            </p>
          </div>

          {/* Main Content */}
          <div className="py-12">
            <p className="text-lg text-primary leading-relaxed">
              現代は情報過多の時代です。毎日数え切れないほどのニュースが配信される中で、本当に価値のある情報を見つけ出すのは簡単ではありません。
              World News Readerは、The GuardianやThe New York Timesなどの信頼できる国際メディアから厳選された記事を、日本語で分かりやすく提供します。
              ニュース、テクノロジー、ライフスタイル、ヘルスケア、環境など幅広いジャンルを扱い、複雑な国際情勢も5分程度で読める分量に調整。
              コーヒーブレイクのような「ゆったりとした時間」に、世界の興味深い話題を楽しみながら、読者体験を最優先に設計されたサイトです。
              急がず、じっくりと。世界を知ることは、きっと楽しいはずです。
            </p>
          </div>

          {/* CTA */}
          <div className="pt-8">
            <Link href="/">
              <button 
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-medium transition-all"
                style={{ 
                  background: 'var(--card)',
                  color: 'var(--text)',
                  border: '1px solid var(--divider)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--card-alt)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--card)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Coffee className="h-5 w-5" />
                記事を読む
              </button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="section">
        <div className="container">
          <div className="text-center text-muted text-sm">
            <p>&copy; 2025 World News Reader. Made with ☕ for thoughtful readers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}