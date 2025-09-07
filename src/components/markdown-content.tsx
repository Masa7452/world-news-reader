"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent = ({ content, className = "" }: MarkdownContentProps) => {
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
        {content}
      </ReactMarkdown>
    </div>
  );
};