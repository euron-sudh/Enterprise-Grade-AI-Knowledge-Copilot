'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/home';
  const errorParam = searchParams.get('error');
  const registeredParam = searchParams.get('registered');

  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | null>(null);

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
    setOauthLoading(provider);
    // Redirect directly to the provider's sign-in page.
    // NextAuth handles the full OAuth flow and redirects back here on completion.
    await signIn(provider === 'microsoft' ? 'azure-ad' : 'google', {
      callbackUrl,
    });
    // signIn with redirect=true (default) navigates away — only reaches here on error
    setOauthLoading(null);
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
                : errorParam === 'Configuration'
                  ? 'OAuth not configured. Add GOOGLE_CLIENT_ID / AZURE_AD_CLIENT_ID to your environment variables.'
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
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={!!oauthLoading || isSubmitting}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 transition-all hover:bg-surface-50 dark:hover:bg-surface-700 hover:border-surface-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {oauthLoading === 'google' ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          {oauthLoading === 'google' ? 'Redirecting...' : 'Google'}
        </button>

        <button
          type="button"
          onClick={() => handleOAuth('microsoft')}
          disabled={!!oauthLoading || isSubmitting}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 transition-all hover:bg-surface-50 dark:hover:bg-surface-700 hover:border-surface-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {oauthLoading === 'microsoft' ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <MicrosoftIcon className="h-4 w-4" />
          )}
          {oauthLoading === 'microsoft' ? 'Redirecting...' : 'Microsoft'}
        </button>
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
              className={cn('input-base pl-9', errors.email && 'border-red-400 dark:border-red-600')}
            />
          </div>
          {errors.email && (
            <p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" />{errors.email.message}</p>
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
              className={cn('input-base pl-9 pr-10', errors.password && 'border-red-400 dark:border-red-600')}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors" tabIndex={-1}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" />{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input id="rememberMe" type="checkbox" {...register('rememberMe')}
            className="h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500" />
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
    </div>
  );
}
