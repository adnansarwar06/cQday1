import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Fallback plain‐text renderer (in case markdown parsing crashes)
const PlainText: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => (
  <div className={`prose prose-sm max-w-none ${className}`}>
    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
      {content}
    </div>
  </div>
);

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  try {
    return (
      <div className={`prose prose-sm max-w-none ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ inline: _inline, className: cl, children, ...props }: any) {
              const isInline = _inline as boolean | undefined;
              return (
                <code
                  className={`rounded px-1.5 py-0.5 font-mono text-sm ${isInline ? 'bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400' : 'block bg-gray-900 text-green-400 whitespace-pre overflow-x-auto'} ${cl || ''}`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.warn('MarkdownRenderer error, falling back to plain text:', error);
    return <PlainText content={content} className={className} />;
  }
};

export default MarkdownRenderer; 