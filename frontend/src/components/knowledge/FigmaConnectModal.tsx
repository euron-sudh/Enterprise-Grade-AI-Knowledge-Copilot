'use client';

import { useState } from 'react';

import { ExternalLink, Figma, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import * as knowledgeApi from '@/lib/api/knowledge';
import { useKnowledgeStore } from '@/stores/knowledgeStore';

interface FigmaConnectModalProps {
  onClose: () => void;
}

export function FigmaConnectModal({ onClose }: FigmaConnectModalProps) {
  const { connectors, setConnectors } = useKnowledgeStore();
  const [accessToken, setAccessToken] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConnect = async () => {
    if (!accessToken.trim()) { toast.error('Figma access token is required'); return; }
    if (!fileUrl.trim()) { toast.error('Figma file URL is required'); return; }
    if (!fileUrl.includes('figma.com')) { toast.error('Please enter a valid Figma file URL'); return; }

    setSaving(true);
    try {
      const connector = await knowledgeApi.addConnector({
        type: 'figma',
        name: 'Figma',
        config: { accessToken: accessToken.trim(), fileUrl: fileUrl.trim() },
      });
      setConnectors([...connectors, connector]);
      toast.loading('Syncing Figma file...', { id: 'figma-sync' });

      try {
        const result = await knowledgeApi.syncConnector(connector.id);
        toast.success((result as { message?: string }).message ?? 'Figma synced!', { id: 'figma-sync' });
      } catch {
        toast.error('Connected but sync failed — try syncing manually', { id: 'figma-sync' });
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-surface-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Connect Figma</h2>
              <p className="text-xs text-surface-500">Import design files into your knowledge base</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {/* How to get token */}
          <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            <p className="mb-1 font-medium">How to get your Figma Personal Access Token:</p>
            <ol className="list-decimal space-y-1 pl-4 text-xs">
              <li>Go to <strong>Figma → Account Settings</strong></li>
              <li>Scroll to <strong>Personal access tokens</strong></li>
              <li>Click <strong>Generate new token</strong>, copy it here</li>
            </ol>
            <a
              href="https://www.figma.com/developers/api#access-tokens"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline"
            >
              Open Figma token docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Token input */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Personal Access Token <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="figd_xxxxxxxxxxxx..."
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            />
          </div>

          {/* File URL input */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Figma File URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://www.figma.com/file/XXXXXXXX/My-Design-File"
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            />
            <p className="mt-1 text-xs text-surface-400">
              Open any Figma file and copy the URL from your browser.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-surface-100 px-6 py-4 dark:border-surface-800">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleConnect} disabled={saving || !accessToken.trim() || !fileUrl.trim()}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> : 'Connect & Sync'}
          </Button>
        </div>
      </div>
    </div>
  );
}
