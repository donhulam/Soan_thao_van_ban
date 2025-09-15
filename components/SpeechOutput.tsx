import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';

interface SpeechOutputProps {
  content: string;
}

const SpeechOutput: React.FC<SpeechOutputProps> = ({ content }) => {
  const [isCopied, setIsCopied] = useState(false);

  // Function to remove HTML tags. This is a fallback in case the AI model
  // accidentally includes HTML instead of pure Markdown.
  const stripHtml = (html: string): string => {
    if (!html) return '';
    return html.replace(/<\/?[^>]+(>|$)/g, "");
  };

  const handleCopy = () => {
    if (isCopied) return;

    // Function to strip all markdown formatting for plain text copying
    const stripMarkdown = (markdown: string): string => {
      return markdown
        // Remove headers
        .replace(/^#+\s*/gm, '')
        // Remove bold/italic asterisks and underscores
        .replace(/(\*\*|__|\*|_)(.*?)\1/g, '$2')
        // Remove strikethrough
        .replace(/~~(.*?)~~/g, '$1')
        // Remove list markers
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        // Remove blockquotes
        .replace(/^>\s*/gm, '')
        // Remove horizontal rules
        .replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '')
        // Remove links (keeping the text)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove images (keeping alt text)
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Clean up extra newlines
        .replace(/\n{2,}/g, '\n\n')
        .trim();
    };
    
    const plainTextContent = stripMarkdown(stripHtml(content));

    navigator.clipboard.writeText(plainTextContent).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }).catch(err => {
      console.error('Lỗi sao chép văn bản: ', err);
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-4">
        <div className="prose prose-sm max-w-none prose-p:my-3 prose-ul:my-3 prose-li:my-1 bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-full">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {stripHtml(content)}
          </ReactMarkdown>
        </div>
      </div>
      <div className="flex-shrink-0 pt-4 flex justify-end">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isCopied
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          aria-label="Sao chép nội dung"
        >
          {isCopied ? (
            <>
              <CheckIcon className="w-4 h-4" />
              Đã sao chép!
            </>
          ) : (
            <>
              <CopyIcon className="w-4 h-4" />
              Sao chép kết quả
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SpeechOutput;