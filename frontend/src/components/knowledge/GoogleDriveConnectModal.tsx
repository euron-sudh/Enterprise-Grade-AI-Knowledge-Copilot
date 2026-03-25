'use client';

import { useState } from 'react';

import { ExternalLink, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import * as knowledgeApi from '@/lib/api/knowledge';
import { useKnowledgeStore } from '@/stores/knowledgeStore';

interface GoogleDriveConnectModalProps {
  onClose: () => void;
}

export function GoogleDriveConnectModal({ onClose }: GoogleDriveConnectModalProps) {
  const { connectors, setConnectors } = useKnowledgeStore();
  const [accessToken, setAccessToken] = useState('');
  const [folderId, setFolderId] = useState('root');
  const [saving, setSaving] = useState(false);

  const extractFolderId = (input: string): string => {
    // Handle Google Drive folder URLs like:
    // https://drive.google.com/drive/folders/FOLDER_ID
    const m = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    // If it looks like a raw ID already
    if (/^[a-zA-Z0-9_-]{25,}$/.test(input.trim())) return input.trim();
    return input.trim() || 'root';
  };

  const handleConnect = async () => {
    if (!accessToken.trim()) { toast.error('Google OAuth access token is required'); return; }

    const resolvedFolderId = extractFolderId(folderId);

    setSaving(true);
    try {
      const connector = await knowledgeApi.addConnector({
        type: 'google_drive',
        name: resolvedFolderId === 'root' ? 'Google Drive (My Drive)' : `Google Drive — ${resolvedFolderId}`,
        config: {
          accessToken: accessToken.trim(),
          folderId: resolvedFolderId,
        },
      });
      setConnectors([...connectors, connector]);
      toast.loading('Syncing Google Drive...', { id: 'gdrive-sync' });

      try {
        const result = await knowledgeApi.syncConnector(connector.id);
        toast.success((result as { message?: string }).message ?? 'Google Drive synced!', { id: 'gdrive-sync' });
      } catch {
        toast.error('Connected but sync failed — try syncing manually', { id: 'gdrive-sync' });
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
            <span className="text-2xl">📁</span>
            <div>
              <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Connect Google Drive</h2>
              <p className="text-xs text-surface-500">Import documents and files from Google Drive</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {/* Instructions */}
          <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            <p className="mb-1 font-medium">How to get a Google OAuth Access Token:</p>
            <ol className="list-decimal space-y-1 pl-4 text-xs">
              <li>Open the <strong>Google OAuth 2.0 Playground</strong> (link below)</li>
              <li>In <em>Step 1</em>, select <strong>Drive API v3 → .../auth/drive.readonly</strong></li>
              <li>Click <strong>Authorize APIs</strong> and sign in with your Google account</li>
              <li>In <em>Step 2</em>, click <strong>Exchange authorization code for tokens</strong></li>
              <li>Copy the <strong>Access token</strong> and paste it below</li>
            </ol>
            <a
              href="https://developers.google.com/oauthplayground/"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline"
            >
              Open OAuth 2.0 Playground <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Access Token */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              OAuth Access Token <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="ya29.xxxxxxxxxxxxxxxxxx"
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            />
          </div>

          {/* Folder */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Folder URL or ID <span className="text-surface-400 font-normal">(optional, defaults to My Drive root)</span>
            </label>
            <input
              type="text"
              value={folderId === 'root' ? '' : folderId}
              onChange={(e) => setFolderId(e.target.value || 'root')}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            />
            <p className="mt-1 text-xs text-surface-400">
              Paste a Drive folder URL or leave blank to sync from My Drive root.
              Syncs Google Docs, Sheets, Slides, and plain text files (up to 50 files).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-surface-100 px-6 py-4 dark:border-surface-800">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleConnect} disabled={saving || !accessToken.trim()}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> : 'Connect & Sync'}
          </Button>
        </div>
      </div>
    </div>
  );
}
