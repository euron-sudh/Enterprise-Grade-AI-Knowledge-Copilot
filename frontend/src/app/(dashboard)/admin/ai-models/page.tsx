'use client';

import { useState } from 'react';
import { Zap, Settings, CheckCircle, AlertCircle, ToggleLeft, ToggleRight, Info } from 'lucide-react';

const MODELS = [
  {
    id: 'claude-sonnet-4-6', provider: 'Anthropic', name: 'Claude Sonnet 4.6', type: 'Chat & RAG',
    contextWindow: '200K', costPer1k: '$0.003', status: 'active', isDefault: true,
    description: 'Best balance of intelligence and speed. Recommended for most use cases.',
    color: 'from-orange-500 to-amber-500',
  },
  {
    id: 'claude-opus-4-6', provider: 'Anthropic', name: 'Claude Opus 4.6', type: 'Chat & RAG',
    contextWindow: '200K', costPer1k: '$0.015', status: 'active', isDefault: false,
    description: 'Most powerful Claude model. Best for complex reasoning and analysis.',
    color: 'from-red-500 to-orange-500',
  },
  {
    id: 'gpt-4o', provider: 'OpenAI', name: 'GPT-4o', type: 'Chat & RAG',
    contextWindow: '128K', costPer1k: '$0.005', status: 'active', isDefault: false,
    description: 'OpenAI flagship model with vision capabilities.',
    color: 'from-green-500 to-teal-500',
  },
  {
    id: 'gpt-4o-mini', provider: 'OpenAI', name: 'GPT-4o Mini', type: 'Chat',
    contextWindow: '128K', costPer1k: '$0.00015', status: 'active', isDefault: false,
    description: 'Cost-effective model for simpler tasks and high-volume use cases.',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    id: 'text-embedding-3-large', provider: 'OpenAI', name: 'text-embedding-3-large', type: 'Embeddings',
    contextWindow: '8K', costPer1k: '$0.00013', status: 'active', isDefault: true,
    description: 'High-quality embeddings for semantic search and RAG.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'amazon-titan', provider: 'AWS Bedrock', name: 'Titan Text', type: 'Chat',
    contextWindow: '32K', costPer1k: '$0.0008', status: 'inactive', isDefault: false,
    description: 'AWS native model. Good for AWS-integrated deployments.',
    color: 'from-yellow-500 to-orange-500',
  },
];

const providerColors: Record<string, string> = {
  Anthropic: 'bg-orange-500/20 text-orange-400',
  OpenAI: 'bg-green-500/20 text-green-400',
  'AWS Bedrock': 'bg-yellow-500/20 text-yellow-400',
};

export default function AIModelsPage() {
  const [models, setModels] = useState(MODELS);
  const [activeFilter, setActiveFilter] = useState('All');

  const toggle = (id: string) => {
    setModels(ms => ms.map(m => m.id === id ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' } : m));
  };

  const filtered = models.filter(m => activeFilter === 'All' || m.type.includes(activeFilter));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Model Configuration</h1>
        <p className="text-gray-400 text-sm mt-1">Enable, disable, and configure AI models for your organization</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Models', value: models.filter(m => m.status === 'active').length.toString(), color: 'text-green-400' },
          { label: 'Providers', value: '3', color: 'text-indigo-400' },
          { label: 'Total Queries (30d)', value: '38.4K', color: 'text-white' },
          { label: 'Est. Monthly Cost', value: '$127', color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['All', 'Chat & RAG', 'Chat', 'Embeddings'].map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-900 border border-white/10 text-gray-400 hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Model cards */}
      <div className="space-y-3">
        {filtered.map(model => (
          <div key={model.id} className={`bg-gray-900 border rounded-2xl p-5 transition-colors ${model.status === 'active' ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${model.color} flex items-center justify-center flex-shrink-0`}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold">{model.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${providerColors[model.provider] || 'bg-gray-500/20 text-gray-400'}`}>{model.provider}</span>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{model.type}</span>
                  {model.isDefault && <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">Default</span>}
                  {model.status === 'active'
                    ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Active</span>
                    : <span className="text-xs text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Inactive</span>
                  }
                </div>
                <p className="text-gray-500 text-sm mt-1">{model.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-gray-600 text-xs">Context: <span className="text-gray-400">{model.contextWindow}</span></span>
                  <span className="text-gray-600 text-xs">Cost: <span className="text-gray-400">{model.costPer1k}/1K tokens</span></span>
                  <span className="text-gray-600 text-xs font-mono text-[10px]">ID: {model.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button className="p-2 rounded-lg bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => toggle(model.id)} className="p-1">
                  {model.status === 'active'
                    ? <ToggleRight className="w-8 h-8 text-indigo-400" />
                    : <ToggleLeft className="w-8 h-8 text-gray-600" />
                  }
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Global settings */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Settings className="w-4 h-4" /> Global AI Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Default Temperature</label>
            <input type="range" min="0" max="1" step="0.1" defaultValue="0.1" className="w-full" />
            <div className="flex justify-between text-xs text-gray-600 mt-1"><span>Precise</span><span>Creative</span></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Max Response Tokens</label>
            <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
              {['1024', '2048', '4096', '8192', '16384'].map(v => <option key={v}>{v} tokens</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Guardrails</label>
            <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
              <option>Strict (recommended)</option>
              <option>Moderate</option>
              <option>Minimal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">PII Masking</label>
            <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
              <option>Auto-detect & mask</option>
              <option>Detect only (alert)</option>
              <option>Disabled</option>
            </select>
          </div>
        </div>
        <button className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Save Settings</button>
      </div>
    </div>
  );
}
