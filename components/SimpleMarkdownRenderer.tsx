// components/SimpleMarkdownRenderer.tsx
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm'; 
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface SimpleMarkdownRendererProps {
  content: string;
}

const SimpleMarkdownRenderer: React.FC<SimpleMarkdownRendererProps> = ({ content }) => {
  // 核心修復：預處理 content，將 \[ \] 替換為 $$ $$，否則 remark-math 可能無法識別為 displayMode
  const processedContent = useMemo(() => {
    if (!content) return "";
    return content
      .replace(/\\\[/g, '$$$')
      .replace(/\\\]/g, '$$$')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$');
  }, [content]);

  return (
    <div className="markdown-renderer w-full overflow-x-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]} 
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          // 讓 Table 支持橫向滾動，避免在手機端撐開容器
          table: ({ children }) => (
            <div className="table-container my-4 overflow-x-auto border border-zinc-700 rounded-lg">
              <table className="min-w-full divide-y divide-zinc-700">{children}</table>
            </div>
          ),
          // 優化代碼塊
          code: ({ children, className, inline }: any) => {
            return inline ? (
              <code className="bg-zinc-800 px-1 py-0.5 rounded text-sm">{children}</code>
            ) : (
              <code className={className}>{children}</code>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default SimpleMarkdownRenderer;