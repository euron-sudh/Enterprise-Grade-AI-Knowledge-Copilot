'use client';

import { useState } from 'react';
import { Shield, ShieldCheck, Copy, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '@/lib/api/token';

interface SetupData {
  secret: string;
  qr_code_uri: string;
  backup_codes: string[];
}

export default function MFAPage() {
  const [step, setStep] = useState<'idle' | 'setup' | 'done'>('idle');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/backend/auth/mfa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Setup failed');
      setSetupData(data);
      setStep('setup');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/backend/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Verification failed');
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (setupData) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/profile" className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Shield className="h-7 w-7 text-brand-500" />
        <div>
          <h1 className="text-xl font-semibold text-surface-900 dark:text-surface-100">Two-Factor Authentication</h1>
          <p className="text-sm text-surface-500">Protect your account with an authenticator app</p>
        </div>
      </div>

      {step === 'idle' && (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-6 space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Two-factor authentication adds an extra layer of security. Once enabled, you will need your
            authenticator app (Google Authenticator, Authy, 1Password) each time you sign in.
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={startSetup}
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
          </button>
        </div>
      )}

      {step === 'setup' && setupData && (
        <div className="space-y-6">
          {/* Step 1: QR Code */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-6 space-y-4">
            <h2 className="font-medium text-surface-900 dark:text-surface-100">Step 1 — Scan QR Code</h2>
            <p className="text-sm text-surface-500">
              Open your authenticator app and scan the QR code, or enter the secret key manually.
            </p>
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.qr_code_uri)}`}
                alt="MFA QR Code"
                className="rounded-lg border border-surface-200 dark:border-surface-700"
                width={180}
                height={180}
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-surface-100 dark:bg-surface-800 px-3 py-2">
              <code className="flex-1 text-xs font-mono text-surface-700 dark:text-surface-300 break-all">
                {setupData.secret}
              </code>
              <button onClick={copySecret} className="shrink-0 text-surface-400 hover:text-brand-500">
                {copied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Step 2: Backup codes */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-6 space-y-4">
            <h2 className="font-medium text-surface-900 dark:text-surface-100">Step 2 — Save Backup Codes</h2>
            <p className="text-sm text-surface-500">
              Store these backup codes somewhere safe. Each can be used once if you lose your authenticator.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {setupData.backup_codes.map((c) => (
                <code
                  key={c}
                  className="rounded bg-surface-100 dark:bg-surface-800 px-3 py-1.5 text-center text-xs font-mono text-surface-700 dark:text-surface-300"
                >
                  {c}
                </code>
              ))}
            </div>
          </div>

          {/* Step 3: Verify */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-6 space-y-4">
            <h2 className="font-medium text-surface-900 dark:text-surface-100">Step 3 — Verify</h2>
            <p className="text-sm text-surface-500">
              Enter the 6-digit code from your authenticator app to confirm setup.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-4 py-2.5 text-center text-lg font-mono tracking-widest text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              onClick={verifyCode}
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify and Enable MFA'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 p-8 text-center space-y-3">
          <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto" />
          <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">MFA Enabled</h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Your account is now protected with two-factor authentication.
          </p>
          <Link href="/profile" className="inline-block mt-2 text-sm text-emerald-600 hover:underline">
            Back to Profile
          </Link>
        </div>
      )}
    </div>
  );
}
