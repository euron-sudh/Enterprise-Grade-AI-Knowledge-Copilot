'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Sparkles,
  BookOpen,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  Zap,
  FileText,
  Search,
  Video,
  Globe,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GlobalFileDropOverlay } from '@/components/knowledge/GlobalFileDropOverlay';
import { useGlobalFileDrop } from '@/hooks/useGlobalFileDrop';
import { uploadKnowledgeFiles } from '@/lib/knowledge-upload';
import { cn, formatBytes, formatRelativeTime, generateId } from '@/lib/utils';
import { authFetch } from '@/lib/api/token';

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
              className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:mb-2 prose-li:my-0.5 prose-a:text-indigo-700 dark:prose-a:text-indigo-300 prose-a:font-semibold prose-a:no-underline hover:prose-a:underline prose-strong:text-surface-900 dark:prose-strong:text-white"
              dangerouslySetInnerHTML={{
                __html: message.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-brand-400 pl-3 text-surface-500 dark:text-surface-400 not-italic">$1</blockquote>')
                  .replace(/\n\n/g, '<br/><br/>')
                  .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
                  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                  .replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-indigo-700 dark:text-indigo-300 font-semibold hover:underline break-all">$1</a>')
                  // Render [N] citation markers as superscript badges
                  .replace(/\[(\d+)\]/g, '<sup><a href="#citation-$1" class="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded bg-brand-100 dark:bg-brand-900 text-[10px] font-bold text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-800 no-underline ml-0.5" title="Source $1">$1</a></sup>'),
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
                <div key={c.id} id={`citation-${i + 1}`}>
                  <CitationCard citation={c} index={i} />
                </div>
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
  const [activeSource, setActiveSource] = useState('All sources');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  const addFilesToQueue = useCallback((files: File[]) => {
    if (!files.length) return;
    setAttachedFiles((prev) => {
      const seen = new Set(prev.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      const unique = files.filter((file) => !seen.has(`${file.name}:${file.size}:${file.lastModified}`));
      return [...prev, ...unique];
    });
  }, []);

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
      const trimmedContent = content.trim();
      const queuedFiles = [...attachedFiles];
      const hasNonImageFiles = queuedFiles.some((file) => !file.type.startsWith('image/'));
      if ((!trimmedContent && queuedFiles.length === 0) || isLoading) return;

      let uploadedNames: string[] = [];
      let failedNames: string[] = [];
      let attachmentIds: string[] = [];
      let images: string[] = [];

      if (queuedFiles.length > 0) {
        const imageFiles = queuedFiles.filter((file) => file.type.startsWith('image/'));
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

        if (hasNonImageFiles) {
          setIsUploadingFiles(true);
          const uploadResult = await uploadKnowledgeFiles({
            files: queuedFiles,
            accessToken: (session as any)?.accessToken,
            user: getUser(),
            onFileUploaded: (_fileName, body) => {
              const docs = Array.isArray(body) ? body : [body];
              for (const doc of docs) {
                if (doc?.id) attachmentIds.push(String(doc.id));
              }
            },
          });
          uploadedNames = uploadResult.uploadedNames;
          failedNames = uploadResult.failedNames;
          setIsUploadingFiles(false);

          if (uploadedNames.length > 0) {
            toast.success(`${uploadedNames.length} file${uploadedNames.length > 1 ? 's' : ''} attached`);
          }
          if (failedNames.length > 0) {
            toast.error(`${failedNames.length} file${failedNames.length > 1 ? 's' : ''} failed to upload`);
          }
        } else {
          // Image-only attachments should not block response generation.
          uploadedNames = queuedFiles.map((f) => f.name);
          void uploadKnowledgeFiles({
            files: queuedFiles,
            accessToken: (session as any)?.accessToken,
            user: getUser(),
          });
        }
      }

      // For document attachments, do not continue unless at least one document
      // was actually uploaded and returned an ID. This prevents inaccurate
      // fallback summaries from unrelated KB docs.
      if (hasNonImageFiles && attachmentIds.length === 0) {
        toast.error('Attachment upload is not complete yet. Please retry in a few seconds.');
        return;
      }

      const attachedNames = hasNonImageFiles
        ? uploadedNames
        : (uploadedNames.length > 0 ? uploadedNames : queuedFiles.map((f) => f.name));

      const messageBody = trimmedContent || (attachedNames.length
        ? `Please analyze these attached files: ${attachedNames.join(', ')}`
        : '');

      if (!messageBody) return;

      const displayContent = attachedNames.length > 0
        ? `${trimmedContent ? `${trimmedContent}\n\n` : ''}Attached files: ${attachedNames.join(', ')}`
        : messageBody;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: displayContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setAttachedFiles([]);
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
          const createRes = await authFetch('/api/backend/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: messageBody.slice(0, 60) }),
          }, (session as any)?.accessToken, getUser());
          if (createRes.ok) {
            const conv = await createRes.json();
            convId = conv.id;
            setConversationId(convId);
          }
        }

        // 2. Stream the message
        const res = await authFetch(`/api/backend/conversations/${convId}/messages/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: attachedNames.length > 0
              ? `${messageBody}\n\nUse the newly attached files first if relevant: ${attachedNames.join(', ')}.`
              : messageBody,
            model: 'claude-sonnet-4-6',
            attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
            images: images.length > 0 ? images : undefined,
            sourceFilter: activeSource === 'All sources' || activeSource === 'Web' ? null : activeSource,
            useWebSearch: activeSource === 'Web',
          }),
        }, (session as any)?.accessToken, getUser());

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
              } else if (event.type === 'error') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: event.error ? `Error: ${event.error}` : 'Error: Failed to generate response',
                          isStreaming: false,
                          citations: citations.length > 0 ? citations : undefined,
                        }
                      : m
                  )
                );
              } else if (event.type === 'done') {
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
    [activeSource, attachedFiles, conversationId, isLoading, session]
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

  const handleVoiceToggle = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecordingRef.current) {
      recognitionRef.current?.stop();
      isRecordingRef.current = false;
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isRecordingRef.current = true;
        setIsRecording(true);
      };
      recognition.onend = () => {
        isRecordingRef.current = false;
        setIsRecording(false);
      };
      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e.error);
        isRecordingRef.current = false;
        setIsRecording(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results as any[])
          .map((r: any) => r[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    addFilesToQueue(files);
    // Reset so same file can be re-selected
    e.target.value = '';
  }, [addFilesToQueue]);

  const removeAttachedFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const { isDragging, bind } = useGlobalFileDrop({
    onFiles: async (files) => {
      addFilesToQueue(files);
    },
  });

  const isEmpty = messages.length === 0;

  return (
    <div
      className="relative flex h-full flex-col"
      {...bind}
    >
      <GlobalFileDropOverlay
        active={isDragging || isUploadingFiles}
        title={isUploadingFiles ? 'Uploading attached files...' : 'Drop files anywhere to attach'}
        description="Attachments are queued in chat and uploaded when you send"
      />

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
            {[
              { label: 'All sources', icon: null },
              { label: 'Web', icon: Globe },
              { label: 'Gmail', icon: null },
              { label: 'Confluence', icon: null },
              { label: 'Google Drive', icon: null },
              { label: 'Slack', icon: null },
              { label: 'GitHub', icon: null },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setActiveSource(label)}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  label === activeSource
                    ? label === 'Web'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                )}
              >
                {Icon && <Icon className="h-2.5 w-2.5" />}
                {label}
              </button>
            ))}
          </div>

          {attachedFiles.length > 0 && (
            <div className="mb-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-surface-600 dark:text-surface-300">
                  {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''} attached
                </p>
                <button
                  type="button"
                  onClick={() => setAttachedFiles([])}
                  className="text-[11px] text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attachedFiles.map((file, index) => (
                  <span
                    key={`${file.name}:${file.size}:${file.lastModified}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 px-2 py-1 text-[11px] text-surface-700 dark:text-surface-200"
                    title={file.name}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate max-w-[210px]">{file.name}</span>
                    <span className="text-surface-400">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachedFile(index)}
                      className="text-surface-400 hover:text-red-500"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-4 py-3 focus-within:border-brand-400 dark:focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all"
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx,image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Attach */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
              onClick={handleVoiceToggle}
              className={cn(
                'flex-shrink-0 transition-colors relative',
                isRecording
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
              )}
              aria-label={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-5 w-5" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                </>
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>

            {/* Send */}
            <button
              type="submit"
              disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || isUploadingFiles}
              className={cn(
                'flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                (input.trim() || attachedFiles.length > 0) && !isLoading && !isUploadingFiles
                  ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20'
                  : 'bg-surface-200 dark:bg-surface-700 text-surface-400 cursor-not-allowed'
              )}
              aria-label="Send message"
            >
              {isLoading || isUploadingFiles ? (
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
