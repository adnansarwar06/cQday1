import React from "react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface SyntaxHighlighterProps {
  children: string;
  language?: string;
  filename?: string;
}

const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({
  children,
  language = "text",
  filename,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="relative group bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-lg my-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          {filename && (
            <span className="text-sm text-gray-300 font-medium">{filename}</span>
          )}
          {language && (
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-md">
              {language}
            </span>
          )}
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center space-x-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span className="text-sm">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="text-sm">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="relative">
        <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
          <code className="text-gray-100 font-mono">
            {children}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default SyntaxHighlighter; 