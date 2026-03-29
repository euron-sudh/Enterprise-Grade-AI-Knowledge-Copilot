'use client';

import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  audioLevel: number;
  isActive: boolean;
  barCount?: number;
  className?: string;
}

export function AudioWaveform({
  audioLevel,
  isActive,
  barCount = 20,
  className,
}: AudioWaveformProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        // Create a wave pattern based on index and audio level
        const phase = (i / barCount) * Math.PI * 2;
        const waveFactor = Math.abs(Math.sin(phase + Date.now() / 200));
        const height = isActive
          ? Math.max(4, Math.min(48, audioLevel * 60 * waveFactor + 8))
          : 4;

        return (
          <div
            key={i}
            className={cn(
              'w-1 rounded-full transition-all',
              isActive ? 'bg-brand-500' : 'bg-surface-300 dark:bg-surface-600'
            )}
            style={{
              height: `${height}px`,
              animationDelay: `${(i * 50) % 300}ms`,
              animation: isActive ? `waveform ${0.8 + (i % 4) * 0.15}s ease-in-out infinite alternate` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
