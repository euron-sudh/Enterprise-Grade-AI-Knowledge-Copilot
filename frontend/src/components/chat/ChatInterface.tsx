'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChevronDown, PanelRight, PanelRightClose } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { useMessages, useStreamingMessage } from '@/hooks/useChat';
import * as knowledgeApi from '@/lib/api/knowledge';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';
import type { AIModel, SourceCitation } from '@/types';

import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { SourceCitationPanel } from './SourceCitationPanel';

const MODELS: Array<{ id: AIModel; name: string; provider: string }> = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  { id: 'llama-3-70b', name: 'Llama 3 70B', provider: 'Meta' },
];

interface ChatInterfaceProps {
  conversationId: string;
  initialMessage?: string;
}

export function ChatInterface({ conversationId, initialMessage }: ChatInterfaceProps) {
  const { messages, selectedModel, setModel } = useChatStore();
  const { sendMessage, abort } = useStreamingMessage();
  const { isLoading: messagesLoading } = useMessages(conversationId);
  const [showSources, setShowSources] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const initialSentRef = useRef(false);

  const conversationMessages = messages[conversationId] ?? [];

  useEffect(() => {
    if (initialMessage && !initialSentRef.current && !messagesLoading) {
      initialSentRef.current = true;
      void sendMessage({ conversationId, content: initialMessage, model: selectedModel });
    }
  }, [initialMessage, messagesLoading, conversationId, selectedModel, sendMessage]);

  const allSources = useMemo(() => {
    const seen = new Set<string>();
    const sources: SourceCitation[] = [];
    for (const msg of conversationMessages) {
      for (const s of msg.sources) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          sources.push(s);
        }
      }
    }
    return sources;
  }, [conversationMessages]);

  const handleSend = useCallback(
    async (content: string, attachments?: File[]) => {
      let images: string[] | undefined;

      if (attachments && attachments.length > 0) {
        const imageFiles = attachments.filter((f) => f.type.startsWith('image/'));
        const docFiles   = attachments.filter((f) => !f.type.startsWith('image/'));

        // Convert images to base64 data URIs so the AI can see them (vision)
        if (imageFiles.length > 0) {
          images = await Promise.all(
            imageFiles.map(
              (file) =>
                new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                })
            )
          );
        }

        // Non-image files still go to the knowledge base
        if (docFiles.length > 0) {
          const uploadToast = toast.loading(`Uploading ${docFiles.length} file(s)...`);
          try {
            await knowledgeApi.uploadDocuments(docFiles, {});
            toast.success(`${docFiles.length} file(s) added to Knowledge base`, { id: uploadToast });
          } catch {
            toast.error('File upload failed. Sending message without attachments.', { id: uploadToast });
          }
        }
      }

      void sendMessage({
        conversationId,
        content,
        model: selectedModel,
        images,
      });
    },
    [conversationId, selectedModel, sendMessage]
  );

  const selectedModelInfo = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0]!;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-surface-100 px-4 py-2 dark:border-surface-800">
        {/* Model selector */}
        <div className="relative">
          <button
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-surface-700',
              'border border-surface-200 bg-white hover:bg-surface-50',
              'dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800',
              'transition-colors'
            )}
            onClick={() => setModelDropdownOpen((v) => !v)}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {selectedModelInfo.name}
            <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
          </button>

          {modelDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setModelDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-xl border border-surface-100 bg-white py-1 shadow-lg dark:border-surface-700 dark:bg-surface-900">
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                      model.id === selectedModel
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                        : 'text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800'
                    )}
                    onClick={() => {
                      setModel(model.id);
                      setModelDropdownOpen(false);
                    }}
                  >
                    <div className="min-w-0 flex-1 text-left">
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-surface-400">{model.provider}</div>
                    </div>
                    {model.id === selectedModel && (
                      <span className="text-brand-500">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right actions */}
        <Button
          aria-label={showSources ? 'Hide sources' : 'Show sources'}
          size="icon-sm"
          variant={showSources ? 'primary' : 'ghost'}
          onClick={() => setShowSources((v) => !v)}
        >
          {showSources ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <MessageList messages={conversationMessages} isLoading={messagesLoading} />
          <MessageInput onAbort={abort} onSend={handleSend} />
        </div>

        {/* Sources panel */}
        {showSources && allSources.length > 0 && (
          <div className="w-80 shrink-0 overflow-y-auto">
            <SourceCitationPanel sources={allSources} />
          </div>
        )}
      </div>
    </div>
  );
}
