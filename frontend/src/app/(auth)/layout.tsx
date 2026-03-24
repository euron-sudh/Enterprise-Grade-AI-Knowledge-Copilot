import type { Metadata } from 'next';
import { Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 overflow-hidden">
      {/* Background mesh gradient */}
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-60 dark:opacity-40" />

      {/* Decorative circles */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />

      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-brand">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-lg font-bold text-surface-900 dark:text-surface-100 leading-tight">
            KnowledgeForge
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400 leading-tight">
            Enterprise AI Copilot
          </p>
        </div>
      </div>

      {/* Auth card */}
      <div className="relative w-full max-w-md px-4">
        <div className="card-glass p-8 shadow-xl">{children}</div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-surface-400 dark:text-surface-500">
        &copy; {new Date().getFullYear()} KnowledgeForge. All rights reserved.
      </p>
    </div>
  );
}
