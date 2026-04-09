type GlobalFileDropOverlayProps = {
  active: boolean;
  title: string;
  description: string;
  tone?: 'brand' | 'indigo';
};

export function GlobalFileDropOverlay({
  active,
  title,
  description,
  tone = 'brand',
}: GlobalFileDropOverlayProps) {
  if (!active) return null;

  const palette = tone === 'indigo'
    ? {
        backdrop: 'bg-indigo-950/45',
        panel: 'bg-indigo-900/80 border-indigo-400/60',
        body: 'text-indigo-100/90',
      }
    : {
        backdrop: 'bg-brand-950/45',
        panel: 'bg-brand-900/80 border-brand-400/60',
        body: 'text-brand-100/90',
      };

  return (
    <div className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center ${palette.backdrop} backdrop-blur-sm`}>
      <div className={`rounded-2xl border px-6 py-5 text-center shadow-2xl ${palette.panel}`}>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className={`mt-1 text-xs ${palette.body}`}>{description}</p>
      </div>
    </div>
  );
}