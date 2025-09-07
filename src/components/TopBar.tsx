"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Coffee } from "lucide-react";

export const TopBar = () => {
  return (
    <>
      {/* Simple top line */}
      <div className="top-accent-bar" />
      
      {/* Header */}
      <header className="sticky top-0.5 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-[var(--bg)]/60" style={{ 
        background: 'color-mix(in srgb, var(--bg) 95%, transparent)',
        borderColor: 'var(--divider)'
      }}>
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Coffee className="h-6 w-6" style={{ color: 'var(--text)' }} />
            <span className="text-xl font-extrabold tracking-tight text-primary">World News Reader</span>
          </Link>
          
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/tags">
                <button 
                  className="px-3 py-2 text-sm font-medium transition-colors rounded-lg text-primary"
                  style={{ color: 'var(--text)' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  タグ
                </button>
              </Link>
              <Link href="/about">
                <button 
                  className="px-3 py-2 text-sm font-medium transition-colors rounded-lg text-primary"
                  style={{ color: 'var(--text)' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  About
                </button>
              </Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <div className="hidden lg:flex items-center gap-1 text-sm text-muted">
                <span>世界の話題をゆっくり知ろう</span>
                <Coffee className="h-4 w-4" fill="currentColor" />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};