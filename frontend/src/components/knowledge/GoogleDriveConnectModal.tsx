'use client';

import { useState } from 'react';

import { ExternalLink, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api/client';

interface GoogleDriveConnectModalProps {
  onClose: () => void;
}

export function GoogleDriveConnectModal({ onClose }: GoogleDriveConnectModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handleOAuthConnect = async (connectorType: 'google_drive' | 'gmail') => {
    setLoading(true);
    try {
      // Ask the backend for the Google OAuth consent URL.
      // Replace "localhost" with "127.0.0.1" in the origin so the redirect URI
      // uses an IP address — Chrome does NOT auto-upgrade 127.0.0.1 to HTTPS,
      // which prevents the ERR_SSL_PROTOCOL_ERROR on the OAuth callback.
      const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const origin = rawOrigin.replace(/^https?:\/\/localhost(:\d+)?/, (_, port) => `http://127.0.0.1${port ?? ''}`);
      const { data } = await apiClient.get<{ url: string }>(
        '/knowledge/connectors/oauth/google/start',
        { params: { connector_type: connectorType, base_origin: origin } }
      );
      if (!data?.url) throw new Error('No OAuth URL returned');
      // Navigate to Google consent page; callback will redirect back to /knowledge-base
      window.location.href = data.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start OAuth';
      toast.error(msg);
      setLoading(false);
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
              <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Connect Google</h2>
              <p className="text-xs text-surface-500">Import documents from Google Drive or Gmail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Sign in with Google to grant KnowledgeForge read-only access to your files.
            You will be redirected to Google&apos;s consent page and brought back automatically.
          </p>

          {/* Google Drive */}
          <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">Google Drive</p>
                <p className="text-xs text-surface-500 mt-0.5">
                  Sync Docs, Sheets, Slides, PDFs, and text files (up to 50 files).
                </p>
              </div>
              <Button
                onClick={() => handleOAuthConnect('google_drive')}
                disabled={loading}
                size="sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
          </div>

          {/* Gmail */}
          <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">Gmail</p>
                <p className="text-xs text-surface-500 mt-0.5">
                  Index recent emails as searchable knowledge (read-only).
                </p>
              </div>
              <Button
                onClick={() => handleOAuthConnect('gmail')}
                disabled={loading}
                size="sm"
                variant="secondary"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
          </div>

          <p className="text-xs text-surface-400">
            Need to configure Google OAuth? See the{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline"
            >
              Google Cloud Console <ExternalLink className="h-3 w-3" />
            </a>
            . Add{' '}
            <code className="rounded bg-surface-100 px-1 text-xs dark:bg-surface-800">
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/backend/knowledge/connectors/oauth/google/callback
            </code>{' '}
            as an authorised redirect URI.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-surface-100 px-6 py-4 dark:border-surface-800">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
