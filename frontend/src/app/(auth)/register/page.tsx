'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z.boolean().refine((v) => v === true, 'You must accept the terms'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const passwordStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  return score;
};

const strengthLabel = (s: number) => {
  if (s <= 1) return { label: 'Weak', color: 'bg-red-500' };
  if (s <= 2) return { label: 'Fair', color: 'bg-yellow-500' };
  if (s <= 3) return { label: 'Good', color: 'bg-blue-500' };
  return { label: 'Strong', color: 'bg-green-500' };
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'free';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms: false },
  });

  const passwordValue = watch('password', '');
  const strength = passwordStrength(passwordValue);
  const { label: strengthText, color: strengthColor } = strengthLabel(strength);

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    try {
      const res = await fetch('/api/backend/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.fullName,
          email: data.email,
          password: data.password,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Registration failed. Please try again.');
      }

      // Auto-login after successful registration
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but auto-login failed — fall back to login page
        router.push('/login?registered=1');
        return;
      }

      toast.success('Account created! Welcome to KnowledgeForge.');
      router.push('/home');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
          Create your account
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          {plan === 'professional'
            ? 'Start your Professional trial — no credit card required'
            : 'Get started with KnowledgeForge for free'}
        </p>
        {plan === 'professional' && (
          <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
            <Zap className="h-3 w-3" />
            Professional Plan — 14-day free trial
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* OAuth */}
      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: '/home' })}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700',
          'bg-white dark:bg-surface-800 px-4 py-2.5 text-sm font-medium',
          'text-surface-700 dark:text-surface-300 transition-all',
          'hover:bg-surface-50 dark:hover:bg-surface-700 hover:border-surface-300 dark:hover:border-surface-600',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <GoogleIcon className="h-4 w-4" />
        Continue with Google
      </button>

      {/* Divider */}
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
        <span className="mx-3 text-xs text-surface-400 dark:text-surface-500">
          or sign up with email
        </span>
        <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Full name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              {...register('fullName')}
              className={cn(
                'input-base pl-9',
                errors.fullName &&
                  'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20'
              )}
            />
          </div>
          {errors.fullName && (
            <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Work email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="jane@company.com"
              {...register('email')}
              className={cn(
                'input-base pl-9',
                errors.email &&
                  'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20'
              )}
            />
          </div>
          {errors.email && (
            <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              {...register('password')}
              className={cn(
                'input-base pl-9 pr-10',
                errors.password &&
                  'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* Password strength meter */}
          {passwordValue && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      i <= strength ? strengthColor : 'bg-surface-200 dark:bg-surface-700'
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-surface-400 dark:text-surface-500">
                Strength:{' '}
                <span className="text-surface-600 dark:text-surface-300">{strengthText}</span>
              </p>
            </div>
          )}
          {errors.password && (
            <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Confirm password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter password"
              {...register('confirmPassword')}
              className={cn(
                'input-base pl-9 pr-10',
                errors.confirmPassword &&
                  'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20'
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              tabIndex={-1}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms */}
        <div>
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              id="terms"
              type="checkbox"
              {...register('terms')}
              className="mt-0.5 h-4 w-4 rounded border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-brand-600 focus:ring-brand-500 focus:ring-offset-0"
            />
            <span className="text-sm text-surface-600 dark:text-surface-400">
              I agree to the{' '}
              <Link
                href="#"
                className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="#"
                className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.terms && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              {errors.terms.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      {/* Sign in link */}
      <p className="text-center text-sm text-surface-500 dark:text-surface-400">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="h-8 w-48 rounded bg-surface-200 dark:bg-surface-700 animate-pulse" />
            <div className="h-4 w-64 rounded bg-surface-200 dark:bg-surface-700 animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-surface-200 dark:bg-surface-700 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
