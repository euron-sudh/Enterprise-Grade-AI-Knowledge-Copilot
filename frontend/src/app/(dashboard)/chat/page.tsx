'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Send,
  Paperclip,
  Mic,
  Sparkles,
  BookOpen,
  RotateCcw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  MessageSquare,
  Zap,
  FileText,
  Search,
  Video,
} from 'lucide-react';
import { cn, getInitials, formatRelativeTime, generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ---- Types ----
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Citation[];
  isStreaming?: boolean;
}

interface Citation {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  url?: string;
}

// ---- Suggested prompts ----
const SUGGESTED_PROMPTS = [
  {
    icon: BookOpen,
    label: 'Summarize our Q4 strategy doc',
    prompt: 'Can you summarize our Q4 strategy document and highlight the key initiatives?',
  },
  {
    icon: Search,
    label: 'Find onboarding resources',
    prompt: 'What onboarding resources do we have for new engineers joining the team?',
  },
  {
    icon: FileText,
    label: 'Explain our data retention policy',
    prompt: 'What is our data retention policy and how does it affect customer data?',
  },
  {
    icon: Video,
    label: 'Last all-hands key takeaways',
    prompt: 'What were the key takeaways from the last all-hands meeting?',
  },
];

// ---- Mock streaming response ----
const MOCK_RESPONSE = `Based on the documents in your knowledge base, here's what I found:

**Q4 2026 Strategy Overview**

The Q4 strategy focuses on three core pillars:

1. **Product Expansion** — Launch of the Enterprise tier with unlimited queries, SAML SSO, and dedicated support. Target: 50 enterprise logos by December.

2. **Knowledge Coverage** — Increase indexed content to 100K+ documents across all connected sources. Priority connectors: Salesforce, HubSpot, and Jira.

3. **AI Performance** — Reduce average response latency below 300ms (p95) and improve citation accuracy to >95%.

Key OKRs include reaching $2M ARR by end of Q4, achieving 99.95% uptime SLA, and onboarding 5 Fortune 500 pilot customers.

> *Source: Q4 Strategy Document (March 2026), Executive All-Hands Slides*`;

// ---- Citation card ----
function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  return (
    <a
      href={citation.url ?? '#'}
      className="flex items-start gap-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-3 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/30 dark:hover:bg-brand-950/30 transition-all group"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-brand-100 dark:bg-brand-900 text-[10px] font-bold text-brand-700 dark:text-brand-300">
        {index + 1}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-surface-700 dark:text-surface-300 group-hover:text-brand-700 dark:group-hover:text-brand-300 truncate">
          {citation.title}
        </p>
        <p className="text-[10px] text-surface-400 dark:text-surface-500 truncate">
          {citation.source}
        </p>
      </div>
    </a>
  );
}

// ---- Message bubble ----
function MessageBubble({
  message,
  onCopy,
  onFeedback,
}: {
  message: Message;
  onCopy: (content: string) => void;
  onFeedback: (id: string, type: 'up' | 'down') => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          isUser
            ? 'bg-brand-600 text-white'
            : 'bg-gradient-brand text-white shadow-brand'
        )}
      >
        {isUser ? (
          <span>You</span>
        ) : (
          <Zap className="h-4 w-4" />
        )}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-2 max-w-[85%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-brand-600 text-white rounded-tr-sm'
              : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-200 rounded-tl-sm shadow-card'
          )}
        >
          {message.isStreaming ? (
            <div className="flex items-center gap-1">
              <div className="typing-dot h-1.5 w-1.5 rounded-full bg-surface-400" />
              <div className="typing-dot h-1.5 w-1.5 rounded-full bg-surface-400" />
              <div className="typing-dot h-1.5 w-1.5 rounded-full bg-surface-400" />
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:mb-2 prose-li:my-0.5"
              dangerouslySetInnerHTML={{
                __html: message.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-brand-400 pl-3 text-surface-500 dark:text-surface-400 not-italic">$1</blockquote>')
                  .replace(/\n\n/g, '<br/><br/>')
                  .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
                  .replace(/^## (.+)$/gm, '<h2>$1</h2>'),
              }}
            />
          )}
        </div>

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-[10px] font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wide flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              Sources ({message.citations.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.citations.map((c, i) => (
                <CitationCard key={c.id} citation={c} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Actions (AI messages only) */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCopy(message.content)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
            <button
              onClick={() => onFeedback(message.id, 'up')}
              className="rounded-md p-1 text-surface-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onFeedback(message.id, 'down')}
              className="rounded-md p-1 text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] text-surface-300 dark:text-surface-600">
              {formatRelativeTime(message.timestamp)}
            </span>
          </div>
        )}

        {isUser && (
          <span className="text-[10px] text-surface-400 dark:text-surface-500">
            {formatRelativeTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---- Main chat page ----
export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      // Streaming placeholder
      const assistantId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      // ── Real streaming via SSE ──────────────────────────────────────────
      try {
        // 1. Ensure we have a conversation ID
        let convId = conversationId;
        if (!convId) {
          const createRes = await fetch('/api/backend/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(session as any)?.accessToken ?? ''}` },
            body: JSON.stringify({ title: content.trim().slice(0, 60) }),
          });
          if (createRes.ok) {
            const conv = await createRes.json();
            convId = conv.id;
            setConversationId(convId);
          }
        }

        // 2. Stream the message
        const res = await fetch(`/api/backend/conversations/${convId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(session as any)?.accessToken ?? ''}` },
          body: JSON.stringify({ content: content.trim(), model: 'claude-sonnet-4-6' }),
        });

        if (!res.ok || !res.body) throw new Error(`API error ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let citations: Citation[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const event = JSON.parse(raw);
              if (event.type === 'sources' && Array.isArray(event.sources)) {
                citations = event.sources.map((s: any) => ({
                  id: s.id,
                  title: s.documentName ?? 'Source',
                  source: s.sourceType === 'web' ? `Web · ${s.url ?? ''}` : `Knowledge Base · ${s.documentType ?? ''}`,
                  excerpt: s.chunkText ?? '',
                  url: s.url ?? undefined,
                }));
              } else if (event.type === 'delta' && event.delta) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.delta, isStreaming: true }
                      : m
                  )
                );
              } else if (event.type === 'done' || event.type === 'error') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, isStreaming: false, citations: citations.length > 0 ? citations : undefined }
                      : m
                  )
                );
              }
            } catch { /* skip malformed JSON */ }
          }
        }
        // Ensure streaming flag is cleared
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false, citations: citations.length > 0 ? citations : undefined } : m
          )
        );
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.message ?? 'Failed to get response'}`, isStreaming: false }
              : m
          )
        );
      }
      setIsLoading(false);
    },
    [isLoading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content);
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    // TODO: send feedback to API
    console.log('Feedback:', id, type);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="relative flex-1 overflow-y-auto"
      >
        {isEmpty ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center px-4 py-12">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-brand">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-surface-900 dark:text-surface-100">
              Ask your knowledge base anything
            </h2>
            <p className="mb-8 text-center text-sm text-surface-500 dark:text-surface-400 max-w-md">
              KnowledgeForge searches across all your documents, meetings, Slack
              threads, and connected sources to give you instant, cited answers.
            </p>

            {/* Suggestions */}
            <div className="grid w-full max-w-2xl grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SUGGESTED_PROMPTS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => void sendMessage(s.prompt)}
                  className="flex items-center gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-3.5 text-left hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/30 dark:hover:bg-brand-950/30 transition-all group"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950 group-hover:bg-brand-100 dark:group-hover:bg-brand-900 transition-colors">
                    <s.icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCopy={handleCopy}
                onFeedback={handleFeedback}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom */}
        {showScrollDown && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-md text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 py-4">
        <div className="mx-auto max-w-3xl">
          {/* Context chips */}
          <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-[11px] text-surface-400 flex-shrink-0">Context:</span>
            {['All sources', 'Confluence', 'Google Drive', 'Slack', 'GitHub'].map(
              (src, i) => (
                <button
                  key={src}
                  className={cn(
                    'flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                    i === 0
                      ? 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                  )}
                >
                  {src}
                </button>
              )
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-4 py-3 focus-within:border-brand-400 dark:focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all"
          >
            {/* Attach */}
            <button
              type="button"
              className="flex-shrink-0 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your knowledge base..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[160px] py-0.5"
            />

            {/* Voice */}
            <button
              type="button"
              className="flex-shrink-0 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Voice input"
            >
              <Mic className="h-5 w-5" />
            </button>

            {/* Send */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                'flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                input.trim() && !isLoading
                  ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20'
                  : 'bg-surface-200 dark:bg-surface-700 text-surface-400 cursor-not-allowed'
              )}
              aria-label="Send message"
            >
              {isLoading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>

          <p className="mt-2 text-center text-[11px] text-surface-400 dark:text-surface-500">
            KnowledgeForge can make mistakes. Always verify important information from sources.
            Press <kbd className="rounded border border-surface-200 dark:border-surface-700 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send,{' '}
            <kbd className="rounded border border-surface-200 dark:border-surface-700 px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> for new line.
          </p>
        </div>
      </div>
    </div>
  );
}
