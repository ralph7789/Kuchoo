import React, { useState } from 'react';
import { Copy, Check } from '../common/Icons';

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="md-code-block-container">
      <div className="md-code-block-header">
        <span className="md-code-block-lang">{language || 'code'}</span>
        <button
          type="button"
          className="md-code-copy-btn"
          onClick={handleCopy}
          title="Copy code to clipboard"
        >
          {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="md-code-block-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function parseInlineFormatting(text) {
  if (!text) return null;

  // Split into tokens: bold, italic, inline code, links, strikethrough
  // Regex matches:
  // 1. Links: [label](url)
  // 2. Bold: \*\*(.+?)\*\*
  // 3. Strikethrough: \~\~(.+?)\~\~
  // 4. Inline code: `(.+?)`
  // 5. Italic: \*([^*]+)\*
  const pattern = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\~\~[^~]+\~\~|`[^`]+`|\*[^*]+\*)/g;
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    if (!part) return null;

    // Link: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="md-inline-link"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return <del key={i}>{part.slice(2, -2)}</del>;
    }

    // Inline code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={i} className="md-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

export default function MarkdownContent({ content }) {
  if (!content) return null;

  // Split into code blocks vs regular text
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        data: content.substring(lastIndex, match.index)
      });
    }
    segments.push({
      type: 'code',
      language: match[1] || 'text',
      data: match[2].replace(/\n$/, '')
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      data: content.substring(lastIndex)
    });
  }

  return (
    <div className="md-rich-container">
      {segments.map((seg, idx) => {
        if (seg.type === 'code') {
          return <CodeBlock key={idx} language={seg.language} code={seg.data} />;
        }

        // Process lines in regular text segment
        const lines = seg.data.split('\n');
        return (
          <div key={idx} className="md-prose-block">
            {lines.map((line, lineIdx) => {
              if (line.startsWith('> ')) {
                return (
                  <blockquote key={lineIdx} className="md-blockquote">
                    {parseInlineFormatting(line.substring(2))}
                  </blockquote>
                );
              }
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <div key={lineIdx} className="md-list-item">
                    <span className="md-bullet">•</span>
                    <span>{parseInlineFormatting(line.substring(2))}</span>
                  </div>
                );
              }
              if (line.trim() === '') {
                return <div key={lineIdx} className="md-paragraph-break" />;
              }
              return (
                <div key={lineIdx} className="md-text-line">
                  {parseInlineFormatting(line)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
