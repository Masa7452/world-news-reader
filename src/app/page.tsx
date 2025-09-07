"use client";

import Link from "next/link";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ArticleCard } from "@/components/article-card";
import { mockArticles } from "@/data/mock/articles";
import { 
  Sparkles, Coffee, Leaf, Cpu, Heart, ShirtIcon, ChevronLeft, ChevronRight,
  Briefcase, Palette, Building2, Trophy, Music, Beaker, GraduationCap, Plane
} from "lucide-react";

const CategorySection = () => {
  const [activeCategory, setActiveCategory] = useState("環境");
  
  // 全カテゴリーの定義（実際のカテゴリーマッピングと一致）
  const allCategories = [
    { name: "環境", icon: Leaf, colorClass: "tag-green" },
    { name: "テクノロジー", icon: Cpu, colorClass: "tag-blue" },
    { name: "ライフスタイル", icon: ShirtIcon, colorClass: "tag-purple" },
    { name: "ヘルスケア", icon: Heart, colorClass: "tag-red" },
    { name: "ビジネス", icon: Briefcase, colorClass: "tag-indigo" },
    { name: "カルチャー", icon: Palette, colorClass: "tag-pink" },
    { name: "政治", icon: Building2, colorClass: "tag-rose" },
    { name: "スポーツ", icon: Trophy, colorClass: "tag-orange" },
    { name: "エンターテインメント", icon: Music, colorClass: "tag-fuchsia" },
    { name: "科学", icon: Beaker, colorClass: "tag-cyan" },
    { name: "教育", icon: GraduationCap, colorClass: "tag-amber" },
    { name: "旅行", icon: Plane, colorClass: "tag-teal" }
  ];

  const categoryArticles = mockArticles.reduce((acc, article) => {
    if (!acc[article.category]) {
      acc[article.category] = [];
    }
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, typeof mockArticles>);

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('category-scroll-container');
    if (container) {
      const scrollAmount = 320;
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  return (
    <section className="py-16" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-primary mb-4">
            カテゴリー別記事
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            興味のある分野から、じっくりと記事をお選びください
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 px-4">
          {allCategories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.name;
            return (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                  isActive ? category.colorClass : ''
                }`}
                style={{
                  background: isActive ? '' : 'var(--card)',
                  color: isActive ? '' : 'var(--text)',
                  border: `1.5px solid ${isActive ? '' : 'var(--divider)'}`,
                  transform: isActive ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm whitespace-nowrap">{category.name}</span>
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--divider)',
                    color: isActive ? '' : 'var(--text-muted)'
                  }}
                >
                  {categoryArticles[category.name]?.length || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Articles Container with Horizontal Scroll */}
        <div className="relative px-4">
          {/* Left Arrow */}
          <button
            onClick={() => scrollContainer('left')}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-md transition-all hover:scale-110"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--divider)'
            }}
          >
            <ChevronLeft className="h-5 w-5" style={{ color: 'var(--text)' }} />
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scrollContainer('right')}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-md transition-all hover:scale-110"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--divider)'
            }}
          >
            <ChevronRight className="h-5 w-5" style={{ color: 'var(--text)' }} />
          </button>

          {/* Scrollable Articles */}
          <div 
            id="category-scroll-container"
            className="flex gap-6 overflow-x-auto scroll-smooth pb-4 px-8"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--divider) transparent',
              animation: 'fadeIn 0.5s ease-out'
            }}
            key={activeCategory} // カテゴリー変更時に再レンダリング
          >
            {categoryArticles[activeCategory]?.map((article, index) => (
              <div 
                key={article.id} 
                className="flex-shrink-0"
                style={{ 
                  width: '320px',
                  animation: `slideIn ${0.3 + index * 0.1}s ease-out`
                }}
              >
                <ArticleCard article={article} />
              </div>
            )) || (
              <div className="w-full text-center py-12">
                <p className="text-muted">このカテゴリーの記事はまだありません</p>
              </div>
            )}
          </div>
        </div>

        {/* View More Link */}
        <div className="text-center mt-10">
          <Link href={`/category/${activeCategory.toLowerCase()}`}>
            <button 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium"
              style={{
                background: 'var(--card)',
                color: 'var(--text)',
                border: '2px solid var(--divider)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.2)';
                e.currentTarget.style.borderColor = 'var(--text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--divider)';
              }}
            >
              {activeCategory}カテゴリーの記事をすべて見る
              <ChevronRight className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
};

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
              コーヒーブレイクのようなゆったりとした時間に。英語学習にもぴったりです
            </p>
          </div>
        </section>

        {/* Articles Section */}
        <section className="container py-16">
          <div className="container">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-primary">最新記事</h2>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {mockArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>

        {/* Category Section */}
        <CategorySection />

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