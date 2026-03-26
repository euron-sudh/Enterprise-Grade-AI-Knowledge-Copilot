'use client';

import { useState, useCallback } from 'react';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  Zap,
  Clock,
  Activity,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */
type ModelProvider = 'claude' | 'openai' | 'gemini' | 'mistral' | 'llama';
type Permission = 'chat' | 'search' | 'agents' | 'knowledge' | 'analytics' | 'admin';

interface ModelConfig {
  provider: ModelProvider;
  models: string[];
  label: string;
  color: string;
  icon: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  maskedKey: string;
  providers: ModelProvider[];
  models: string[];
  permissions: Permission[];
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
  usageCount: number;
  status: 'active' | 'revoked' | 'expired';
  rateLimit: number;
}

/* ─── Constants ─────────────────────────────────────────────── */
const MODEL_CONFIGS: ModelConfig[] = [
  {
    provider: 'claude',
    label: 'Anthropic Claude',
    color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
    icon: '🟠',
    models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'],
  },
  {
    provider: 'openai',
    label: 'OpenAI',
    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
    icon: '🟢',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    provider: 'gemini',
    label: 'Google Gemini',
    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
    icon: '🔵',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
  },
  {
    provider: 'mistral',
    label: 'Mistral AI',
    color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
    icon: '🟣',
    models: ['mistral-large', 'mistral-medium', 'mistral-small'],
  },
  {
    provider: 'llama',
    label: 'Meta Llama',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800',
    icon: '🦙',
    models: ['llama-3.3-70b', 'llama-3.1-8b', 'llama-3.2-vision'],
  },
];

const ALL_PERMISSIONS: { id: Permission; label: string; desc: string }[] = [
  { id: 'chat', label: 'Chat', desc: 'Send messages and conversations' },
  { id: 'search', label: 'Search', desc: 'Full-text and semantic search' },
  { id: 'agents', label: 'AI Agents', desc: 'Trigger and manage AI agents' },
  { id: 'knowledge', label: 'Knowledge Base', desc: 'Read and write documents' },
  { id: 'analytics', label: 'Analytics', desc: 'Access usage analytics' },
  { id: 'admin', label: 'Admin', desc: 'Administrative operations' },
];

const RATE_LIMIT_OPTIONS = [100, 500, 1000, 5000, 10000];

/* ─── Helpers ────────────────────────────────────────────────── */
function generateKey(): string {
  const prefix = 'kf';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [8, 8, 8, 8];
  const parts = segments.map((len) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return `${prefix}_${parts.join('_')}`;
}

function maskKey(key: string): string {
  const parts = key.split('_');
  return parts.map((p, i) => (i < 2 ? p : '•'.repeat(p.length))).join('_');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Initial demo data ─────────────────────────────────────── */
const DEMO_KEYS: ApiKey[] = [
  {
    id: '1',
    name: 'Production App',
    key: 'kf_ProdApp1_Xa7kL9pQ_mNr3vBsT_wYe6cZuH',
    maskedKey: 'kf_ProdApp1_••••••••_••••••••_••••••••',
    providers: ['claude', 'openai'],
    models: ['claude-sonnet-4-6', 'gpt-4o'],
    permissions: ['chat', 'search', 'knowledge'],
    createdAt: '2026-01-15T10:00:00Z',
    lastUsed: '2026-03-25T14:32:00Z',
    expiresAt: null,
    usageCount: 18420,
    status: 'active',
    rateLimit: 5000,
  },
  {
    id: '2',
    name: 'Analytics Dashboard',
    key: 'kf_Analytics_Bb4jK2mR_pQs9nWxV_hFe1dUiG',
    maskedKey: 'kf_Analytics_••••••••_••••••••_••••••••',
    providers: ['claude'],
    models: ['claude-haiku-4-5'],
    permissions: ['analytics', 'search'],
    createdAt: '2026-02-20T08:00:00Z',
    lastUsed: '2026-03-26T09:11:00Z',
    expiresAt: '2026-06-20T00:00:00Z',
    usageCount: 4200,
    status: 'active',
    rateLimit: 1000,
  },
];

/* ─── Sub-components ─────────────────────────────────────────── */
function ProviderBadge({ provider }: { provider: ModelProvider }) {
  const cfg = MODEL_CONFIGS.find((c) => c.provider === provider)!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function PermBadge({ perm }: { perm: Permission }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700">
      {perm}
    </span>
  );
}

/* ─── Create Key Modal ───────────────────────────────────────── */
function CreateKeyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (key: ApiKey) => void }) {
  const [name, setName] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<ModelProvider[]>(['claude']);
  const [selectedModels, setSelectedModels] = useState<string[]>(['claude-sonnet-4-6']);
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>(['chat', 'search']);
  const [rateLimit, setRateLimit] = useState(1000);
  const [expiresIn, setExpiresIn] = useState<'' | '30' | '90' | '180' | '365'>('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [generatedKey, setGeneratedKey] = useState('');

  const toggleProvider = (p: ModelProvider) => {
    setSelectedProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
    // Remove models for deselected provider
    const cfg = MODEL_CONFIGS.find((c) => c.provider === p)!;
    if (selectedProviders.includes(p)) {
      setSelectedModels((prev) => prev.filter((m) => !cfg.models.includes(m)));
    }
  };

  const toggleModel = (model: string) => {
    setSelectedModels((prev) => (prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]));
  };

  const togglePerm = (p: Permission) => {
    setSelectedPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleGenerate = () => {
    const key = generateKey();
    const now = new Date().toISOString();
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: name || 'Unnamed Key',
      key,
      maskedKey: maskKey(key),
      providers: selectedProviders,
      models: selectedModels,
      permissions: selectedPerms,
      createdAt: now,
      lastUsed: null,
      expiresAt: expiresIn
        ? new Date(Date.now() + parseInt(expiresIn) * 86400000).toISOString()
        : null,
      usageCount: 0,
      status: 'active',
      rateLimit,
    };
    setGeneratedKey(key);
    onCreate(newKey);
    setStep(3);
  };

  const availableModels = MODEL_CONFIGS.filter((c) => selectedProviders.includes(c.provider)).flatMap((c) => c.models);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-gradient-to-r from-brand-600 to-violet-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Generate API Key</h2>
              <p className="text-sm text-white/70">Configure access for your application</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors text-xl leading-none">✕</button>
          </div>
          {step < 3 && (
            <div className="flex gap-2 mt-3">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Step 1: Name + Models */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Key Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production Backend, Analytics Service..."
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  AI Model Providers <span className="text-xs text-surface-400 font-normal">(select all that apply)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODEL_CONFIGS.map((cfg) => (
                    <button
                      key={cfg.provider}
                      onClick={() => toggleProvider(cfg.provider)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        selectedProviders.includes(cfg.provider)
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                          : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      <span className="text-2xl">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{cfg.label}</p>
                        <p className="text-xs text-surface-500">{cfg.models.length} models</p>
                      </div>
                      {selectedProviders.includes(cfg.provider) && (
                        <CheckCircle className="h-4 w-4 text-brand-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {availableModels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Allowed Models <span className="text-xs text-surface-400 font-normal">(leave all selected for full access)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableModels.map((model) => (
                      <button
                        key={model}
                        onClick={() => toggleModel(model)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          selectedModels.includes(model)
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400'
                            : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Permissions + Rate Limit */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Permissions</label>
                <div className="space-y-2">
                  {ALL_PERMISSIONS.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPerms.includes(p.id)
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                          : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPerms.includes(p.id)}
                        onChange={() => togglePerm(p.id)}
                        className="sr-only"
                      />
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedPerms.includes(p.id) ? 'border-brand-500 bg-brand-500' : 'border-surface-300 dark:border-surface-600'
                      }`}>
                        {selectedPerms.includes(p.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{p.label}</p>
                        <p className="text-xs text-surface-500">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Rate Limit <span className="text-xs text-surface-400 font-normal">(requests / month)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {RATE_LIMIT_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRateLimit(r)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        rateLimit === r
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-brand-300'
                      }`}
                    >
                      {r.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Expiration <span className="text-xs text-surface-400 font-normal">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: '' as const, label: 'Never' },
                    { val: '30' as const, label: '30 days' },
                    { val: '90' as const, label: '90 days' },
                    { val: '180' as const, label: '6 months' },
                    { val: '365' as const, label: '1 year' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setExpiresIn(opt.val)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        expiresIn === opt.val
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-brand-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Generated Key */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Copy your key now — it won&apos;t be shown again</p>
                  <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Store it securely. You can revoke and regenerate at any time.</p>
                </div>
              </div>

              <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-4">
                <p className="text-xs font-mono text-surface-500 dark:text-surface-400 mb-2">Your new API key:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-surface-900 dark:text-surface-100 break-all">{generatedKey}</code>
                  <CopyButton text={generatedKey} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                  <p className="text-xs text-surface-500 mb-1">Providers</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedProviders.map((p) => (
                      <ProviderBadge key={p} provider={p} />
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                  <p className="text-xs text-surface-500 mb-1">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPerms.map((p) => (
                      <PermBadge key={p} perm={p} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-800 flex justify-between items-center">
          <button
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as 1 | 2)}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 transition-colors"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1) {
                  if (selectedProviders.length === 0) return;
                  setStep(2);
                } else {
                  handleGenerate();
                }
              }}
              disabled={step === 1 && selectedProviders.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {step === 1 ? 'Next: Permissions →' : 'Generate Key'}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              Done ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Copy button ────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
      title="Copy"
    >
      {copied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

/* ─── Key Row ────────────────────────────────────────────────── */
function KeyRow({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: (id: string) => void }) {
  const [revealed, setRevealed] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const isExpiringSoon =
    apiKey.expiresAt &&
    new Date(apiKey.expiresAt).getTime() - Date.now() < 30 * 86400000;

  return (
    <div className="p-5 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 space-y-4 hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500">
            <Key className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{apiKey.name}</h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  apiKey.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                }`}
              >
                {apiKey.status}
              </span>
              {isExpiringSoon && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  Expiring soon
                </span>
              )}
            </div>
            <p className="text-xs text-surface-400 mt-0.5">Created {formatDate(apiKey.createdAt)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!confirmRevoke ? (
            <button
              onClick={() => setConfirmRevoke(true)}
              disabled={apiKey.status === 'revoked'}
              className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30 transition-colors"
              title="Revoke key"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRevoke(apiKey.id)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Revoke
              </button>
              <button
                onClick={() => setConfirmRevoke(false)}
                className="px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Key display */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
        <code className="flex-1 text-xs font-mono text-surface-700 dark:text-surface-300 break-all">
          {revealed ? apiKey.key : apiKey.maskedKey}
        </code>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setRevealed(!revealed)}
            className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 transition-colors"
            title={revealed ? 'Hide' : 'Reveal'}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <CopyButton text={apiKey.key} />
        </div>
      </div>

      {/* Providers */}
      <div className="flex flex-wrap gap-1.5">
        {apiKey.providers.map((p) => (
          <ProviderBadge key={p} provider={p} />
        ))}
        {apiKey.permissions.map((p) => (
          <PermBadge key={p} perm={p} />
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-surface-500 dark:text-surface-400 flex-wrap">
        <span className="flex items-center gap-1">
          <Activity className="h-3.5 w-3.5" />
          {apiKey.usageCount.toLocaleString()} requests
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5" />
          {apiKey.rateLimit.toLocaleString()} / month
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {apiKey.lastUsed ? `Last used ${formatDate(apiKey.lastUsed)}` : 'Never used'}
        </span>
        {apiKey.expiresAt && (
          <span className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" />
            Expires {formatDate(apiKey.expiresAt)}
          </span>
        )}
      </div>

      {/* Models */}
      {apiKey.models.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {apiKey.models.map((m) => (
            <span key={m} className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(DEMO_KEYS);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const handleCreate = useCallback((key: ApiKey) => {
    setKeys((prev) => [key, ...prev]);
  }, []);

  const handleRevoke = useCallback((id: string) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: 'revoked' as const } : k)));
  }, []);

  const filtered = keys.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.providers.some((p) => p.includes(search.toLowerCase()))
  );

  const activeCount = keys.filter((k) => k.status === 'active').length;
  const totalRequests = keys.reduce((s, k) => s + k.usageCount, 0);

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <div className="px-6 py-5 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Key className="h-5 w-5 text-brand-600" />
              API Keys
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              Generate multi-model API keys to access KnowledgeForge programmatically
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Generate API Key
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4 flex-wrap">
          {[
            { label: 'Active keys', value: activeCount, icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Total requests', value: totalRequests.toLocaleString(), icon: Activity, color: 'text-brand-600' },
            { label: 'Model providers', value: MODEL_CONFIGS.length, icon: RefreshCw, color: 'text-violet-600' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">{stat.value}</span>
              <span className="text-xs text-surface-500">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Supported models banner */}
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-violet-50 dark:from-brand-950/30 dark:to-violet-950/30 border border-brand-200/50 dark:border-brand-800/50">
          <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">Supported Model Providers</p>
          <div className="flex flex-wrap gap-2">
            {MODEL_CONFIGS.map((cfg) => (
              <span key={cfg.provider} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                <span>{cfg.icon}</span>
                {cfg.label}
                <span className="opacity-60">· {cfg.models.length} models</span>
              </span>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keys by name or provider..."
            className="w-full max-w-sm px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Keys list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
              <Key className="h-8 w-8 text-surface-400" />
            </div>
            <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-1">No API keys yet</h3>
            <p className="text-sm text-surface-500 max-w-xs">Generate your first multi-model API key to start building with KnowledgeForge.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" />
              Generate API Key
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((key) => (
              <KeyRow key={key.id} apiKey={key} onRevoke={handleRevoke} />
            ))}
          </div>
        )}

        {/* Docs footer */}
        <div className="mt-8 p-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">Quick Start</h4>
          <pre className="text-xs font-mono bg-surface-900 dark:bg-surface-950 text-green-400 p-4 rounded-xl overflow-x-auto">{`# Chat with Claude via KnowledgeForge API
curl -X POST https://api.knowledgeforge.ai/v1/chat \\
  -H "Authorization: Bearer kf_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [{ "role": "user", "content": "What is our Q4 strategy?" }],
    "use_knowledge_base": true
  }'

# Switch to GPT-4o with the same key
# Just change the model field:
#   "model": "gpt-4o"
#   "model": "gemini-1.5-pro"
#   "model": "mistral-large"`}</pre>
        </div>
      </div>

      {showCreate && (
        <CreateKeyModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
