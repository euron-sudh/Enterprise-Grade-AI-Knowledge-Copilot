'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import { Play, RotateCcw, Copy, Zap, Settings, Code2, Loader2 } from 'lucide-react';

const SYSTEM_PROMPTS = [
  { label: 'Knowledge Assistant', value: 'You are a helpful AI assistant with access to the organization\'s knowledge base. Answer questions accurately and cite your sources.' },
  { label: 'Code Reviewer', value: 'You are an expert code reviewer. Analyze code for bugs, security issues, and suggest improvements with clear explanations.' },
  { label: 'Meeting Summarizer', value: 'You are a professional meeting summarizer. Extract key decisions, action items, and summaries from meeting transcripts.' },
  { label: 'Custom...', value: '' },
];

const MODELS = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5', 'gpt-4o', 'gpt-4o-mini'];

export default function PlaygroundPage() {
  const { data: session } = useSession();
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPTS[0].value);
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
      // Create a temporary conversation with settings
      const createRes = await authFetch(
        '/api/backend/conversations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Playground',
            systemPrompt: systemPrompt || undefined,
            model,
          }),
        },
        session?.accessToken,
        getUser(),
      );

      if (!createRes.ok) throw new Error(`Failed to create session (${createRes.status})`);
      const conv = await createRes.json();
      const convId = conv.id ?? conv.conversationId;
      if (!convId) throw new Error('No conversation ID returned');

      // Send message and stream response
      const msgRes = await authFetch(
        `/api/backend/conversations/${convId}/messages/stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: userInput,
            temperature,
            maxTokens,
            model,
          }),
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
            if (chunk.type === 'error') {
              setResponse(`⚠ ${chunk.error || 'Model error'}`);
              break;
            }
            if (chunk.type === 'done') break;
            const delta =
              chunk.delta ??
              chunk.text ??
              chunk.content ??
              chunk.choices?.[0]?.delta?.content ??
              '';
            if (delta) {
              fullText += delta;
              setResponse(fullText);
            }
          } catch {
            // Plain text delta
            if (raw) {
              fullText += raw;
              setResponse(fullText);
            }
          }
        }
      }

      if (!fullText) setResponse('The model returned an empty response.');
    } catch (e: any) {
      setResponse(`⚠ ${e?.message || 'Failed to connect to backend. Make sure the backend server is running.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gray-950/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold">AI Playground</h1>
            <p className="text-gray-500 text-xs">Test prompts and model configurations</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${showSettings ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-400 hover:text-white border border-white/10'}`}
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings panel */}
        {showSettings && (
          <div className="w-72 border-r border-white/5 bg-gray-950/30 p-5 space-y-5 overflow-y-auto flex-shrink-0">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Model</label>
              <select value={model} onChange={e => setModel(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                {MODELS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">System Prompt</label>
              <select onChange={e => setSystemPrompt(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 mb-2">
                {SYSTEM_PROMPTS.map(p => <option key={p.label} value={p.value}>{p.label}</option>)}
              </select>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={5}
                className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Temperature: {temperature}</label>
              <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={e => setTemperature(+e.target.value)} className="w-full" />
              <div className="flex justify-between text-xs text-gray-600 mt-1"><span>Precise</span><span>Creative</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Max Tokens: {maxTokens}</label>
              <input type="range" min="256" max="8192" step="256" value={maxTokens} onChange={e => setMaxTokens(+e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">RAG</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-300 text-sm">Use knowledge base context</span>
              </label>
            </div>
          </div>
        )}

        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Input */}
          <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">User Message</label>
              <textarea
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void run(); }}
                rows={6}
                placeholder="Enter your prompt here... (Cmd+Enter to run)"
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none font-mono"
              />
            </div>

            {loading && (
              <div className="bg-gray-900 border border-white/10 rounded-xl px-4 py-4 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                <span className="text-gray-500 text-sm">Generating response...</span>
              </div>
            )}

            {response && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-400">Response</label>
                  <button onClick={() => navigator.clipboard.writeText(response)} className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                    Copy
                  </button>
                </div>
                <div className="bg-gray-900 border border-white/10 rounded-xl px-4 py-4 text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed min-h-[120px]">
                  {response}
                  {loading && <span className="inline-block w-1 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />}
                </div>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="border-t border-white/5 px-5 py-3 flex items-center gap-3 bg-gray-950/30">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Zap className="w-3 h-3" /> {model}
            </div>
            <div className="flex-1" />
            <button onClick={() => { setUserInput(''); setResponse(''); }} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
            <button
              onClick={run}
              disabled={loading || !userInput.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
