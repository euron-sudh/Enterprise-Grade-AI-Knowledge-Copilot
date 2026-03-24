'use client';

import { useState } from 'react';

import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { ArrowLeft, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import * as authApi from '@/lib/api/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.requestPasswordReset({ email: data.email });
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Check your email</h1>
        <p className="mt-3 text-sm text-white/60">
          We sent a password reset link to{' '}
          <span className="font-medium text-white/80">{getValues('email')}</span>. It expires
          in 30 minutes.
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300"
          href="/login"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80"
          href="/login"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
        <h1 className="text-2xl font-bold text-white">Reset your password</h1>
        <p className="mt-2 text-sm text-white/60">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/80" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            autoComplete="email"
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="you@company.com"
            type="email"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <Button className="w-full" loading={isSubmitting} size="lg" type="submit">
          Send reset link
        </Button>
      </form>
    </div>
  );
}
