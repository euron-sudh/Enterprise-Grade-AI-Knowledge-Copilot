'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle2,
  Copy, CheckCheck, ExternalLink, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

/* ─── OAuth provider config ─────────────────────────────────── */
interface ProviderConfig {
  google: boolean;
  microsoft: boolean;
}

/* ─── Setup instructions modal ──────────────────────────────── */
const SETUP_STEPS: Record<'google' | 'microsoft', {
  title: string;
  color: string;
  steps: { label: string; detail: string; link?: string; copy?: string }[];
  envVars: { key: string; desc: string }[];
}> = {
  google: {
    title: 'Set up Google OAuth',
    color: 'text-blue-600',
    steps: [
      {
        label: 'Open Google Cloud Console',
        detail: 'Go to the Google Cloud Console and create or select a project.',
        link: 'https://console.cloud.google.com',
      },
      {
        label: 'Enable Google+ API',
        detail: 'Navigate to APIs & Services → Library → search "Google+ API" → Enable.',
      },
      {
        label: 'Create OAuth credentials',
        detail: 'Go to APIs & Services → Credentials → Create Credentials → OAuth Client ID → Web Application.',
      },
      {
        label: 'Add authorized redirect URI',
        detail: 'Under "Authorized redirect URIs" add:',
        copy: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/api/auth/callback/google`,
      },
      {
        label: 'Add to .env.local',
        detail: 'Copy the Client ID and Client Secret into your frontend .env.local file (see below).',
      },
    ],
    envVars: [
      { key: 'GOOGLE_CLIENT_ID', desc: 'OAuth 2.0 Client ID' },
      { key: 'GOOGLE_CLIENT_SECRET', desc: 'OAuth 2.0 Client Secret' },
    ],
  },
  microsoft: {
    title: 'Set up Microsoft OAuth',
    color: 'text-indigo-600',
    steps: [
      {
        label: 'Open Azure Portal',
        detail: 'Go to the Azure Portal and navigate to Microsoft Entra ID (formerly Azure AD).',
        link: 'https://portal.azure.com',
      },
      {
        label: 'Register a new application',
        detail: 'Go to App registrations → New registration. Set name and choose account type.',
      },
      {
        label: 'Add redirect URI',
        detail: 'In Authentication → Add a platform → Web → add redirect URI:',
        copy: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/api/auth/callback/azure-ad`,
      },
      {
        label: 'Create a client secret',
        detail: 'Go to Certificates & Secrets → New client secret. Copy the value immediately.',
      },
      {
        label: 'Add to .env.local',
        detail: 'Add the Application (client) ID, secret value, and Directory (tenant) ID to your .env.local.',
      },
    ],
    envVars: [
      { key: 'AZURE_AD_CLIENT_ID', desc: 'Application (client) ID' },
      { key: 'AZURE_AD_CLIENT_SECRET', desc: 'Client secret value' },
      { key: 'AZURE_AD_TENANT_ID', desc: 'Directory (tenant) ID' },
    ],
  },
};

function CopyInline({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-mono text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors max-w-full"
    >
      <span className="truncate">{text}</span>
      {copied ? <CheckCheck className="h-3 w-3 text-emerald-500 flex-shrink-0" /> : <Copy className="h-3 w-3 flex-shrink-0" />}
    </button>
  );
}

function SetupModal({ provider, onClose }: { provider: 'google' | 'microsoft'; onClose: () => void }) {
  const cfg = SETUP_STEPS[provider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2.5">
            {provider === 'google' ? <GoogleIcon className="h-5 w-5" /> : <MicrosoftIcon className="h-5 w-5" />}
            <h2 className={`text-base font-semibold ${cfg.color}`}>{cfg.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {/* Steps */}
          <div className="space-y-3">
            {cfg.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{step.label}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{step.detail}</p>
                  {step.link && (
                    <a href={step.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline mt-1">
                      {step.link} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {step.copy && <CopyInline text={step.copy} />}
                </div>
              </div>
            ))}
          </div>

          {/* Env vars */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-4">
            <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">
              Add to frontend/.env.local
            </p>
            <div className="space-y-2">
              {cfg.envVars.map((v) => (
                <div key={v.key} className="flex items-center justify-between gap-2">
                  <div>
                    <code className="text-xs font-mono text-surface-800 dark:text-surface-200">{v.key}=</code>
                    <span className="text-xs text-surface-400 ml-1">({v.desc})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(`${v.key}=`); toast.success('Copied!'); }}
                    className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 transition-colors"
                    title="Copy key name"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Restart note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              After adding credentials to <code className="font-mono">.env.local</code>, rebuild and restart the frontend for the changes to take effect.
            </p>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-surface-200 dark:border-surface-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────── */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F35325" />
      <path d="M22 2h-9.4v9.4H22V2z" fill="#81BC06" />
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#05A6F0" />
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFBA08" />
    </svg>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/home';
  const errorParam = searchParams.get('error');
  const registeredParam = searchParams.get('registered');

  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [setupModal, setSetupModal] = useState<'google' | 'microsoft' | null>(null);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>({ google: false, microsoft: false });

  useEffect(() => {
    fetch('/api/auth/configured-providers')
      .then((r) => r.json())
      .then((d: ProviderConfig) => setProviderConfig(d))
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        toast.error('Invalid email or password. Please try again.');
        return;
      }
      if (result?.ok) {
        toast.success('Welcome back!');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleOAuth = async (provider: 'google' | 'microsoft') => {
    const isConfigured = provider === 'google' ? providerConfig.google : providerConfig.microsoft;

    if (!isConfigured) {
      setSetupModal(provider);
      return;
    }

    setOauthLoading(provider);
    try {
      await signIn(provider === 'microsoft' ? 'azure-ad' : 'google', { callbackUrl });
    } catch {
      toast.error('OAuth sign-in failed. Please try again.');
      setOauthLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Welcome back</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">Sign in to your KnowledgeForge workspace</p>
      </div>

      {/* Error banner */}
      {errorParam && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            {errorParam === 'OAuthAccountNotLinked'
              ? 'This email is already registered with a different sign-in method.'
              : errorParam === 'CredentialsSignin'
                ? 'Invalid credentials. Please check your email and password.'
                : 'An error occurred during sign in. Please try again.'}
          </span>
        </div>
      )}

      {registeredParam === '1' && (
        <div className="flex items-start gap-2.5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 p-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Account created successfully! Please sign in.</span>
        </div>
      )}

      {/* OAuth Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {(['google', 'microsoft'] as const).map((provider) => {
          const isConfigured = provider === 'google' ? providerConfig.google : providerConfig.microsoft;
          const isLoading = oauthLoading === provider;
          return (
            <button
              key={provider}
              type="button"
              onClick={() => handleOAuth(provider)}
              disabled={!!oauthLoading || isSubmitting}
              title={isConfigured ? undefined : `Click to see setup instructions`}
              className={cn(
                'relative flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50',
                isConfigured
                  ? 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                  : 'border-dashed border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-850 text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              )}
            >
              {isLoading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : provider === 'google' ? (
                <GoogleIcon className="h-4 w-4" />
              ) : (
                <MicrosoftIcon className="h-4 w-4" />
              )}
              {provider === 'google' ? 'Google' : 'Microsoft'}
              {!isConfigured && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-white" title="Setup required">
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
        <span className="mx-3 text-xs text-surface-400 dark:text-surface-500">or continue with email</span>
        <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-surface-700 dark:text-surface-300">Work email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              id="email" type="email" autoComplete="email" placeholder="you@company.com"
              {...register('email')}
              className={cn('input-base pl-9', errors.email && 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20')}
            />
          </div>
          {errors.email && (
            <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />{errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-300">Password</label>
            <Link href="/forgot-password" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
              {...register('password')}
              className={cn('input-base pl-9 pr-10', errors.password && 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20')}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors" tabIndex={-1}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />{errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input id="rememberMe" type="checkbox" {...register('rememberMe')}
            className="h-4 w-4 rounded border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-brand-600 focus:ring-brand-500 focus:ring-offset-0" />
          <label htmlFor="rememberMe" className="text-sm text-surface-600 dark:text-surface-400 select-none cursor-pointer">
            Remember me for 30 days
          </label>
        </div>

        <Button type="submit" variant="gradient" size="lg" className="w-full"
          loading={isSubmitting} disabled={isSubmitting || !!oauthLoading}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-sm text-surface-500 dark:text-surface-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-brand-600 dark:text-brand-400 hover:underline">Request access</Link>
      </p>

      <div className="rounded-lg bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/50 px-4 py-3">
        <p className="text-xs text-surface-500 dark:text-surface-400 text-center">
          Using SSO?{' '}
          <Link href="/sso" className="font-medium text-brand-600 dark:text-brand-400 hover:underline">Sign in with SAML</Link>
        </p>
      </div>

      {/* Setup instructions modal */}
      {setupModal && <SetupModal provider={setupModal} onClose={() => setSetupModal(null)} />}
    </div>
  );
}
