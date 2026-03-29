'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ArrowUp,
  FileText,
  ImageIcon,
  Mic,
  Paperclip,
  Square,
  X,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';

interface MessageInputProps {
  onSend: (content: string, attachments?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  onAbort?: () => void;
}

const SLASH_COMMANDS = [
  { command: '/summarize', description: 'Summarize the selected content' },
  { command: '/translate', description: 'Translate to another language' },
  { command: '/compare', description: 'Compare two documents or concepts' },
  { command: '/explain', description: 'Explain a concept in simple terms' },
  { command: '/draft', description: 'Draft a document or email' },
];

export function MessageInput({ onSend, disabled, placeholder, onAbort }: MessageInputProps) {
  const { streaming } = useChatStore();
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  type SpeechRecognitionCtor = new () => {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onresult: ((e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    start: () => void;
    stop: () => void;
  };

  const getSpeechRecognition = (): SpeechRecognitionCtor | null => {
    if (typeof window === 'undefined') return null;
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null
    );
  };

  useEffect(() => {
    setVoiceSupported(!!getSpeechRecognition());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition || isListening) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let baseText = '';

    recognition.onstart = () => {
      baseText = value.trimEnd();
    };

    recognition.onresult = (event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const t = result[0].transcript;
        if (result.isFinal) final += t;
        else interim += t;
      }
      const spoken = final || interim;
      setValue(baseText ? `${baseText} ${spoken}` : spoken);
      const ta = textareaRef.current;
      if (ta) {
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      textareaRef.current?.focus();
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, value]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const isStreaming = streaming.isStreaming;
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);

    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }

    // Slash commands
    const lastWord = val.split(/\s/).pop() ?? '';
    if (lastWord.startsWith('/') && lastWord.length > 0) {
      setSlashFilter(lastWord.slice(1));
      setShowSlashCommands(true);
    } else {
      setShowSlashCommands(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowSlashCommands(false);
    }
  };

  const handleSend = useCallback(() => {
    if (!canSend || isStreaming) return;
    onSend(value.trim(), attachments.length > 0 ? attachments : undefined);
    setValue('');
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowSlashCommands(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [canSend, isStreaming, onSend, value, attachments]);

  const applySlashCommand = (cmd: string) => {
    const parts = value.split(/\s/);
    parts[parts.length - 1] = `${cmd} `;
    setValue(parts.join(' '));
    setShowSlashCommands(false);
    textareaRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setAttachments((prev) => [...prev, ...newFiles].slice(0, 5));
    }
    // Reset so same file can be selected again
    e.target.value = '';
  };

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    e.preventDefault(); // don't paste raw image data as text
    const newFiles: File[] = [];
    imageItems.forEach((item) => {
      const blob = item.getAsFile();
      if (!blob) return;
      // Give the pasted image a meaningful filename with a timestamp
      const ext = item.type.split('/')[1] ?? 'png';
      const name = `screenshot-${Date.now()}.${ext}`;
      newFiles.push(new File([blob], name, { type: item.type }));
    });
    if (newFiles.length > 0) {
      setAttachments((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop: (files) => {
      setAttachments((prev) => [...prev, ...files].slice(0, 5));
    },
  });

  const filteredCommands = SLASH_COMMANDS.filter(
    (c) => !slashFilter || c.command.slice(1).startsWith(slashFilter)
  );

  return (
    <div className="border-t border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-950">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, i) => {
            const isImage = file.type.startsWith('image/');
            const objectUrl = isImage ? URL.createObjectURL(file) : null;
            return (
              <div
                key={i}
                className="group relative flex items-center gap-1.5 rounded-md border border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800 overflow-hidden"
              >
                {isImage && objectUrl ? (
                  // Image thumbnail
                  <div className="flex items-center gap-1.5 px-1.5 py-1">
                    <img
                      src={objectUrl}
                      alt={file.name}
                      className="h-10 w-10 rounded object-cover"
                      onLoad={() => URL.revokeObjectURL(objectUrl)}
                    />
                    <span className="max-w-[100px] truncate text-xs text-surface-600 dark:text-surface-400">
                      {file.name}
                    </span>
                  </div>
                ) : (
                  // Generic file chip
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-surface-400" />
                    <span className="max-w-[120px] truncate text-xs text-surface-700 dark:text-surface-300">
                      {file.name}
                    </span>
                  </div>
                )}
                <button
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface-200 text-surface-600 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-surface-700 dark:text-surface-300"
                  type="button"
                  title="Remove"
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input row — file button is OUTSIDE dropzone to avoid event conflicts */}
      <div className="flex items-end gap-2">
        {/* File attachment button — standalone, not inside dropzone */}
        <div className="shrink-0">
          <input
            ref={fileInputRef}
            accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
            className="sr-only"
            id="chat-file-input"
            multiple
            type="file"
            onChange={handleFileChange}
          />
          <label
            htmlFor="chat-file-input"
            className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300"
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </label>
        </div>

        {/* Voice input button — hold to talk, release to stop */}
        {voiceSupported && (
          <div className="shrink-0">
            <button
              type="button"
              title="Hold to speak"
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onMouseLeave={stopListening}
              onTouchStart={(e) => { e.preventDefault(); startListening(); }}
              onTouchEnd={stopListening}
              className={cn(
                'flex items-center justify-center rounded-md p-1.5 transition-colors select-none',
                isListening
                  ? 'animate-pulse bg-red-100 text-red-500 dark:bg-red-950'
                  : 'text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300'
              )}
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Dropzone + textarea + send button */}
        <div
          {...getRootProps()}
          className={cn(
            'relative flex flex-1 items-end gap-2 rounded-xl border border-surface-200 bg-surface-50 px-4 py-3',
            'dark:border-surface-700 dark:bg-surface-900',
            'transition-colors',
            isDragActive && 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950'
          )}
        >
          <input {...getInputProps()} />

          {/* Slash commands dropdown */}
          {showSlashCommands && filteredCommands.length > 0 && (
            <div className="absolute bottom-full left-4 mb-2 w-72 rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-900">
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.command}
                  className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-surface-50 dark:hover:bg-surface-800"
                  type="button"
                  onClick={() => applySlashCommand(cmd.command)}
                >
                  <code className="mt-0.5 text-sm font-medium text-brand-600 dark:text-brand-400">
                    {cmd.command}
                  </code>
                  <span className="text-xs text-surface-500">{cmd.description}</span>
                </button>
              ))}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent text-sm text-surface-900 placeholder-surface-400 focus:outline-none dark:text-surface-100"
            disabled={disabled}
            placeholder={
              placeholder ??
              (isDragActive ? 'Drop files here...' : 'Ask anything… (Shift+Enter for new line, paste images with Ctrl+V)')
            }
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />

          {/* Send / Stop */}
          {isStreaming ? (
            <Button
              aria-label="Stop generation"
              size="icon-sm"
              variant="danger"
              onClick={onAbort}
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              aria-label="Send message"
              disabled={!canSend}
              size="icon-sm"
              variant={canSend ? 'primary' : 'secondary'}
              onClick={handleSend}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-surface-300 dark:text-surface-600">
        KnowledgeForge AI may make mistakes. Check important info.
      </p>
    </div>
  );
}
