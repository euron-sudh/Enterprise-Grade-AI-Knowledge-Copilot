'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import { Play, RotateCcw, Settings, Code2, Loader2, Zap } from 'lucide-react';

const SYSTEM_PROMPTS = [
  { label: 'Knowledge Assistant', value: 'You are a helpful AI assistant with access to the organization\'s knowledge base. Answer questions accurately and cite your sources.' },
  { label: 'Code Reviewer', value: 'You are an expert code reviewer. Analyze code for bugs, security issues, and suggest improvements with clear explanations.' },
  { label: 'Meeting Summarizer', value: 'You are a professional meeting summarizer. Extract key decisions, action items, and summaries from meeting transcripts.' },
  { label: 'Custom...', value: '' },
];

const MODELS = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5', 'gpt-4o', 'gpt-4o-mini'];

export default function PlaygroundPage() {
  const { data: session } = useSession();
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPTS[0]?.value ?? '');
  const [model, setModel] = useState(MODELS[0]);
  const [temperature, setTemperature] = useState(0.1);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  const run = async () => {
    if (!userInput.trim()) return;
    setLoading(true);
    setResponse('');

    try {
      const createRes = await authFetch(
        '/api/backend/conversations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Playground', systemPrompt: systemPrompt || undefined, model }),
        },
        session?.accessToken,
        getUser(),
      );

      if (!createRes.ok) throw new Error(`Failed to create session (${createRes.status})`);
      const conv = await createRes.json();
      const convId = conv.id ?? conv.conversationId;
      if (!convId) throw new Error('No conversation ID returned');

      const msgRes = await authFetch(
        `/api/backend/conversations/${convId}/messages/stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: userInput, temperature, maxTokens, model }),
        },
        session?.accessToken,
        getUser(),
      );

      if (!msgRes.ok) throw new Error(`Model request failed (${msgRes.status})`);
      if (!msgRes.body) throw new Error('No response body from server');

      const reader = msgRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            const chunk = JSON.parse(raw);
            if (chunk.type === 'error') { setResponse(`⚠ ${chunk.error || 'Model error'}`); break; }
            if (chunk.type === 'done') break;
            const delta = chunk.delta ?? chunk.text ?? chunk.content ?? chunk.choices?.[0]?.delta?.content ?? '';
            if (delta) { fullText += delta; setResponse(fullText); }
          } catch {
            if (raw) { fullText += raw; setResponse(fullText); }
          }
        }
      }

      if (!fullText) setResponse('The model returned an empty response.');
    } catch (e: any) {
      setResponse(`⚠ ${e?.message || 'Failed to connect to backend.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-surface-900 dark:text-surface-100 font-bold">AI Playground</h1>
            <p className="text-surface-500 dark:text-surface-400 text-xs">Test prompts and model configurations</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
            showSettings
              ? 'bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-700'
              : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700'
          }`}
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings panel */}
        {showSettings && (
          <div className="w-72 border-r border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 space-y-5 overflow-y-auto flex-shrink-0">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Model</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg px-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:border-brand-500"
              >
                {MODELS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">System Prompt</label>
              <select
                onChange={e => setSystemPrompt(e.target.value)}
                className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg px-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:border-brand-500 mb-2"
              >
                {SYSTEM_PROMPTS.map(p => <option key={p.label} value={p.value}>{p.label}</option>)}
              </select>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={5}
                className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg px-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Temperature: {temperature}</label>
              <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={e => setTemperature(+e.target.value)} className="w-full accent-brand-500" />
              <div className="flex justify-between text-xs text-surface-400 dark:text-surface-500 mt-1"><span>Precise</span><span>Creative</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Max Tokens: {maxTokens}</label>
              <input type="range" min="256" max="8192" step="256" value={maxTokens} onChange={e => setMaxTokens(+e.target.value)} className="w-full accent-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">RAG</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded accent-brand-500" />
                <span className="text-surface-700 dark:text-surface-300 text-sm">Use knowledge base context</span>
              </label>
            </div>
          </div>
        )}

        {/* Main editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">User Message</label>
              <textarea
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void run(); }}
                rows={6}
                placeholder="Enter your prompt here... (Cmd+Enter to run)"
                className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-xl px-4 py-3 text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 focus:outline-none focus:border-brand-500 resize-none font-mono"
              />
            </div>

            {loading && (
              <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-xl px-4 py-4 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-brand-500 animate-spin flex-shrink-0" />
                <span className="text-surface-500 dark:text-surface-400 text-sm">Generating response...</span>
              </div>
            )}

            {response && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Response</label>
                  <button
                    onClick={() => navigator.clipboard.writeText(response)}
                    className="text-xs text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-xl px-4 py-4 text-sm text-surface-800 dark:text-surface-200 whitespace-pre-wrap font-mono leading-relaxed min-h-[120px]">
                  {response}
                  {loading && <span className="inline-block w-1 h-4 bg-brand-500 animate-pulse ml-0.5 align-middle" />}
                </div>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="border-t border-surface-200 dark:border-surface-700 px-5 py-3 flex items-center gap-3 bg-white dark:bg-surface-900">
            <div className="flex items-center gap-2 text-surface-400 dark:text-surface-500 text-xs">
              <Zap className="w-3 h-3" /> {model}
            </div>
            <div className="flex-1" />
            <button
              onClick={() => { setUserInput(''); setResponse(''); }}
              className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
            <button
              onClick={run}
              disabled={loading || !userInput.trim()}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
