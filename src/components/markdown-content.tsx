"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Node } from 'unist';

// カスタムディレクティブ（:::source）を処理するプラグイン
const remarkCustomDirectives: Plugin = () => {
  return (tree) => {
    visit(tree, (node: Node) => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        const data = node.data || (node.data = {});
        // hastプロパティはunist-util-directiveの拡張型
        interface DirectiveData {
          hast?: Record<string, unknown>;
        }
        const extendedData = data as DirectiveData;
        const hast = extendedData.hast || (extendedData.hast = {});
        
        // @ts-expect-error - node.nameはディレクティブ専用のプロパティ
        if (node.name === 'source') {
          hast.tagName = 'div';
          hast.properties = {
            className: ['source-block'],
          };
        }
      }
    });
  };
};

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent = ({ content, className = "" }: MarkdownContentProps) => {
  // :::sourceブロックを完全に除去（記事本文には含めない）
  const processedContent = content.replace(
    /:::source[\s\S]*?:::/g,
    ''
  ).trim();
  
  return (
    <div className={`prose prose-lg dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-2xl font-bold mt-6 mb-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>,
        p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
        li: ({ children }) => <li className="ml-4">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 italic my-4">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{children}</code>
          ) : (
            <code className="block bg-muted p-4 rounded-lg overflow-x-auto">{children}</code>
          );
        },
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};