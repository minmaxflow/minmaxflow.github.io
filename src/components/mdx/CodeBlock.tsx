'use client';

import { useState } from 'react';

interface CodeBlockProps {
  language?: string;
  children: React.ReactNode;
}

export default function CodeBlock({ language = 'text', children }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    const textContent = typeof children === 'string' ? children : String(children);
    await navigator.clipboard.writeText(textContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={handleCopy}
          className="px-2 py-1 text-xs bg-gray-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
        <code className={`language-${language}`}>
          {children}
        </code>
      </pre>
    </div>
  );
}