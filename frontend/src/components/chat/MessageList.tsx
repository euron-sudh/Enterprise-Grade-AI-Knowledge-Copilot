'use client';

import { useEffect, useRef } from 'react';

import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { Globe, FileText, ThumbsDown, ThumbsUp } from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand">
          <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            Start a conversation
          </h3>
          <p className="mt-1 text-sm text-surface-500">
            Ask anything — I'll search your knowledge base or the web and answer with citations.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'Summarize last quarter reports',
            'What is our refund policy?',
            'Find onboarding docs',
            'Latest AI news today',
          ].map((prompt) => (
            <button
              key={prompt}
              className="rounded-full border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

import { submitFeedback } from '@/lib/api/chat';
import { useState } from 'react';

function MessageBubble({ message }: { message: Message }) {
  const { data: session } = useSession();
  const isUser = message.role === 'user';
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(message.feedback?.rating ?? null);
  const [loading, setLoading] = useState(false);

  const handleFeedback = async (type: 'up' | 'down') => {
    if (feedback || loading) return;
    setLoading(true);
    try {
      await submitFeedback(message.id, { rating: type });
      setFeedback(type);
    } catch (e) {
      // Optionally show error notification
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3 animate-fade-in',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Avatar
        name={isUser ? (session?.user?.name ?? 'User') : 'AI'}
        size="sm"
        src={isUser ? (session?.user?.image ?? undefined) : undefined}
      />

      <div className={cn('flex max-w-[75%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'rounded-tr-sm bg-brand-600 text-white'
              : 'rounded-tl-sm bg-surface-100 text-surface-900 dark:bg-surface-800 dark:text-surface-100'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const isBlock = className?.includes('language-');
                    return isBlock ? (
                      <div className="relative my-3 overflow-hidden rounded-lg">
                        <div className="flex items-center justify-between bg-surface-800 px-4 py-2">
                          <span className="text-xs text-surface-400">
                            {className?.replace('language-', '') ?? 'code'}
                          </span>
                        </div>
                        <code className={cn('block overflow-x-auto p-4 text-xs', className)} {...props}>
                          {children}
                        </code>
                      </div>
                    ) : (
                      <code
                        className="rounded bg-surface-200 px-1.5 py-0.5 text-xs dark:bg-surface-700"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block h-4 w-0.5 animate-pulse bg-brand-500 ml-0.5" />
              )}
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {message.sources.slice(0, 4).map((source) => {
              const isWeb = source.sourceType === 'web';
              return (
                <a
                  key={source.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:opacity-80 transition-opacity',
                    isWeb
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:bg-surface-800'
                  )}
                  href={source.url ?? '#'}
                  rel="noopener noreferrer"
                  target={source.url ? '_blank' : '_self'}
                  title={source.chunkText}
                >
                  {isWeb
                    ? <Globe className="h-3 w-3 shrink-0" />
                    : <FileText className="h-3 w-3 shrink-0" />
                  }
                  <span className="truncate max-w-[120px]">{source.documentName}</span>
                  <Badge size="sm" variant="default">
                    {Math.round(source.relevanceScore * 100)}%
                  </Badge>
                </a>
              );
            })}
            {message.sources.length > 4 && (
              <span className="rounded-md border border-surface-200 px-2 py-1 text-xs text-surface-400 dark:border-surface-700">
                +{message.sources.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Feedback */}
        {!isUser && !message.isStreaming && (
          <div className="mt-1 flex items-center gap-1">
            <button
              className={cn(
                'rounded-md p-1',
                feedback === 'up'
                  ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                  : 'text-surface-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950',
                loading && 'opacity-50 pointer-events-none'
              )}
              onClick={() => handleFeedback('up')}
              disabled={!!feedback || loading}
              aria-label="Thumbs up"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              className={cn(
                'rounded-md p-1',
                feedback === 'down'
                  ? 'text-red-500 bg-red-50 dark:bg-red-950'
                  : 'text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950',
                loading && 'opacity-50 pointer-events-none'
              )}
              onClick={() => handleFeedback('down')}
              disabled={!!feedback || loading}
              aria-label="Thumbs down"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            {message.processingTimeMs && (
              <span className="ml-1 text-[10px] text-surface-300">
                {message.processingTimeMs}ms
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
