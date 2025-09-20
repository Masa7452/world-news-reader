/**
 * Supabaseデータベース型定義
 * この型は実際のデータベーススキーマと同期する必要がある
 */

export type Database = {
  public: {
    Tables: {
      sources: {
        Row: {
          id: string;
          provider: 'guardian' | 'newsapi';
          provider_id: string;
          url: string;
          title: string;
          abstract: string | null;
          published_at: string;
          raw_data: Record<string, unknown>;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider: 'guardian' | 'newsapi';
          provider_id: string;
          url: string;
          title: string;
          abstract?: string | null;
          published_at: string;
          raw_data: Record<string, unknown>;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider?: 'guardian' | 'newsapi';
          provider_id?: string;
          url?: string;
          title?: string;
          abstract?: string | null;
          published_at?: string;
          raw_data?: Record<string, unknown>;
          processed_at?: string | null;
          created_at?: string;
        };
      };
      topics: {
        Row: {
          id: string;
          source_id: string | null;
          title: string;
          url: string;
          published_at: string;
          abstract: string | null;
          section: string | null;
          subsection: string | null;
          score: number;
          status: 'NEW' | 'QUEUED' | 'REJECTED' | 'OUTLINED' | 'DRAFTED' | 'VERIFIED' | 'PUBLISHED';
          genre: 'news' | 'health' | 'product' | 'trend' | 'glossary' | 'technology' | 'lifestyle' | 'culture' | 'business' | 'science';
          canonical_key: string;
          related: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_id?: string | null;
          title: string;
          url: string;
          published_at: string;
          abstract?: string | null;
          section?: string | null;
          subsection?: string | null;
          score: number;
          status?: 'NEW' | 'QUEUED' | 'REJECTED' | 'OUTLINED' | 'DRAFTED' | 'VERIFIED' | 'PUBLISHED';
          genre: 'news' | 'health' | 'product' | 'trend' | 'glossary' | 'technology' | 'lifestyle' | 'culture' | 'business' | 'science';
          canonical_key: string;
          related?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string | null;
          title?: string;
          url?: string;
          published_at?: string;
          abstract?: string | null;
          section?: string | null;
          subsection?: string | null;
          score?: number;
          status?: 'NEW' | 'QUEUED' | 'REJECTED' | 'OUTLINED' | 'DRAFTED' | 'VERIFIED' | 'PUBLISHED';
          genre?: 'news' | 'health' | 'product' | 'trend' | 'glossary' | 'technology' | 'lifestyle' | 'culture' | 'business' | 'science';
          canonical_key?: string;
          related?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      articles: {
        Row: {
          id: string;
          slug: string;
          topic_id: string | null;
          title: string;
          summary: string[];
          body_mdx: string;
          category: string;
          tags: string[];
          sources: Record<string, unknown>[];
          image_url: string | null;
          status: 'DRAFT' | 'VERIFIED' | 'PUBLISHED';
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          topic_id?: string | null;
          title: string;
          summary: string[];
          body_mdx: string;
          category: string;
          tags: string[];
          sources?: Record<string, unknown>[];
          image_url?: string | null;
          status?: 'DRAFT' | 'VERIFIED' | 'PUBLISHED';
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          topic_id?: string | null;
          title?: string;
          summary?: string[];
          body_mdx?: string;
          category?: string;
          tags?: string[];
          sources?: Record<string, unknown>[];
          image_url?: string | null;
          status?: 'DRAFT' | 'VERIFIED' | 'PUBLISHED';
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
      };
      topic_outlines: {
        Row: {
          id: string;
          topic_id: string | null;
          title: string;
          summary: string[];
          sections: Record<string, unknown>[];
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          topic_id?: string | null;
          title: string;
          summary: string[];
          sections: Record<string, unknown>[];
          tags: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string | null;
          title?: string;
          summary?: string[];
          sections?: Record<string, unknown>[];
          tags?: string[];
          created_at?: string;
        };
      };
      article_issues: {
        Row: {
          id: string;
          article_id: string | null;
          issues: Record<string, unknown>[];
          suggestions: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id?: string | null;
          issues: Record<string, unknown>[];
          suggestions?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string | null;
          issues?: Record<string, unknown>[];
          suggestions?: string[] | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
