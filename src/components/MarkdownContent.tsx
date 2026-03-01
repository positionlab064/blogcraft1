import React from 'react';

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let numListItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-3 text-gray-300 text-sm leading-relaxed">
          {listItems.map((item, i) => <li key={i}>{stripInline(item)}</li>)}
        </ul>,
      );
      listItems = [];
    }
    if (numListItems.length > 0) {
      elements.push(
        <ol key={key++} className="list-decimal list-inside space-y-1 my-3 text-gray-300 text-sm leading-relaxed">
          {numListItems.map((item, i) => <li key={i}>{stripInline(item)}</li>)}
        </ol>,
      );
      numListItems = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-base font-bold text-white mt-6 mb-2">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-lg font-bold text-white mt-7 mb-2 pb-1.5 border-b border-white/10">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={key++} className="text-xl font-bold text-white mt-6 mb-3">
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (numListItems.length > 0) flushList();
      listItems.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      if (listItems.length > 0) flushList();
      numListItems.push(line.replace(/^\d+\.\s/, ''));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={key++} className="text-gray-300 text-sm leading-relaxed mb-2">
          {stripInline(line)}
        </p>,
      );
    }
  }
  flushList();

  return <div>{elements}</div>;
}
