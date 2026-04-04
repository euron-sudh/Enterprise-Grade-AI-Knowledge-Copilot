'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SSOPage() {
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSSO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/backend/auth/saml/init?domain=${encodeURIComponent(domain.trim())}`);
      if (!res.ok) throw new Error('SSO not configured for this domain');
      const { redirectUrl } = await res.json();
      window.location.href = redirectUrl;
    } catch (e: any) {
      setError(e?.message || 'SSO login failed. Contact your IT administrator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Sign in with SSO</h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-gray-400">
            Enter your work email domain to continue with SAML SSO
          </p>
        </div>

        <form onSubmit={handleSSO} className="space-y-4 rounded-2xl border border-surface-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-gray-300 mb-1.5">
              Work email domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="yourcompany.com"
              className="w-full rounded-xl border border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !domain.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Redirecting...' : 'Continue with SSO'}
          </button>

          <p className="text-center text-xs text-surface-500 dark:text-gray-500">
            SSO must be configured by your organization admin.{' '}
            <a href="mailto:support@knowledgeforge.ai" className="text-indigo-500 hover:underline">
              Contact support
            </a>
          </p>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-gray-400 hover:text-surface-700 dark:text-gray-200 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
