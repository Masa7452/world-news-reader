"use client";

import * as React from "react";
import { Moon, Sun, Coffee, ChevronDown, Palette } from "lucide-react";
import { useTheme } from "next-themes";

const themes = [
  { 
    value: 'light', 
    label: 'ライト', 
    description: '明るくクリーンな表示',
    icon: Sun 
  },
  { 
    value: 'sepia', 
    label: 'セピア', 
    description: '温かみのある優しい色調',
    icon: Coffee 
  },
  { 
    value: 'dark', 
    label: 'ダーク', 
    description: '目に優しいダークテーマ',
    icon: Moon 
  },
];

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
    // Set data-theme attribute on document body
    const updateDataTheme = () => {
      const currentTheme = theme === 'system' ? 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
        theme;
      document.body.setAttribute('data-theme', currentTheme || 'light');
    };
    updateDataTheme();
  }, [theme]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = themes.find(t => t.value === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  const handleThemeSelect = (newTheme: string) => {
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium"
        style={{ 
          color: 'var(--text)',
          background: 'transparent',
          border: '1px solid var(--divider)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--divider)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        aria-label="テーマを選択"
        aria-expanded={isOpen}
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{currentTheme.label}</span>
        <ChevronDown 
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-2 w-64 rounded-lg dropdown-menu z-50"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--divider)',
            boxShadow: '0 4px 16px var(--shadow)'
          }}
        >
          <div className="p-2">
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
              <Palette className="h-4 w-4 text-muted" />
              <span className="text-sm font-semibold text-primary">テーマを選択</span>
            </div>
            
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.value;
              
              return (
                <button
                  key={t.value}
                  onClick={() => handleThemeSelect(t.value)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-left transition-all dropdown-item ${
                    isActive ? 'active' : ''
                  }`}
                  style={{
                    background: isActive ? 'var(--divider)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${isActive ? 'font-semibold' : ''}`}>
                      {t.label}
                    </div>
                    <div className="text-xs text-muted">
                      {t.description}
                    </div>
                  </div>
                  {isActive && (
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: 'var(--text)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};