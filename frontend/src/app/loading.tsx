export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="flex flex-col items-center gap-4">
        {/* Logo mark */}
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand shadow-brand">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="absolute inset-0 rounded-xl animate-ping bg-brand-500/20" />
        </div>

        {/* Spinner */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="typing-dot h-2 w-2 rounded-full bg-brand-500"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        <p className="text-sm text-surface-500 dark:text-surface-400">
          Loading KnowledgeForge...
        </p>
      </div>
    </div>
  );
}
