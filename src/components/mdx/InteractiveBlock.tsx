'use client';

import { useState } from 'react';

interface InteractiveBlockProps {
  title: string;
  children: React.ReactNode;
}

export default function InteractiveBlock({ title, children }: InteractiveBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4 my-6 bg-gray-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left flex items-center justify-between py-2 px-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">{title}</span>
        <span className="text-gray-500">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-md">
          {children}
        </div>
      )}
    </div>
  );
}