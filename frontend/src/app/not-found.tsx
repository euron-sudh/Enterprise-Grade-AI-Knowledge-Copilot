import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-md px-6 text-center">
        <p className="mb-2 text-7xl font-extrabold text-brand-500 opacity-40">
          404
        </p>
        <h1 className="mb-2 text-xl font-semibold text-surface-900 dark:text-surface-100">
          Page not found
        </h1>
        <p className="mb-6 text-sm text-surface-500 dark:text-surface-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/home"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
