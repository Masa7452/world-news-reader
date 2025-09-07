"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { ArticleCard } from "@/components/article-card";
import { mockArticles } from "@/data/mock/articles";
import { Sparkles, Coffee } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopBar />

      <main>
        {/* Hero Section */}
        <section className="container py-16 md:py-24">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border simple-tag">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">毎日更新</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary max-w-4xl">
              <span className="block">世界の話題を</span>
              <span className="flex items-center justify-center gap-3 flex-wrap">
                <span>ゆっくり知ろう</span>
                <Coffee className="h-12 w-12 md:h-16 md:w-16" style={{ color: 'var(--text)' }} />
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted max-w-2xl leading-relaxed">
              The GuardianやThe New York Timesから厳選された記事を、
              コーヒーブレイクのひとときにお楽しみください
            </p>
          </div>
        </section>

        {/* Articles Section */}
        <section className="container py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-primary">最新記事</h2>
              <Link href="/tags">
                <button 
                  className="px-4 py-2 border rounded-lg transition-all btn-outline"
                  style={{ 
                    color: 'var(--text)',
                    borderColor: 'var(--divider)',
                    background: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--divider)';
                    e.currentTarget.style.borderColor = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--divider)';
                  }}
                >
                  すべてのタグを見る
                </button>
              </Link>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {mockArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container py-16">
          <div className="text-center">
            <button 
              className="px-8 py-4 border rounded-xl transition-all text-lg font-medium"
              style={{ 
                color: 'var(--text)',
                borderColor: 'var(--divider)',
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--divider)';
                e.currentTarget.style.borderColor = 'var(--text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--divider)';
              }}
            >
              もっと記事を見る
            </button>
          </div>
        </section>
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