'use client';

import type { UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';
import { toolPartsOf, ToolTrace } from './tool-trace';

export function ChatMessage({ message }: { message: UIMessage }) {
  const text = message.parts
    .flatMap((p) => (p.type === 'text' ? [p.text] : []))
    .join('');
  const toolParts = toolPartsOf(message);
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] rounded-2xl rounded-bl-sm border bg-card px-4 py-3 shadow-sm">
        {text && (
          <div
            className={cn(
              'prose prose-sm max-w-none prose-stone',
              'prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1',
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        )}
        <ToolTrace parts={toolParts} answer={text} />
      </div>
    </div>
  );
}
