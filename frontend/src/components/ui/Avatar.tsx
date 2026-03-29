import * as React from 'react';

import Image from 'next/image';

import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const colorMap = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-indigo-500',
];

function getColorForName(name: string): string {
  const index = name.charCodeAt(0) % colorMap.length;
  return colorMap[index] ?? 'bg-indigo-500';
}

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

const statusColors = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
  offline: 'bg-surface-400',
};

export function Avatar({ name = '', src, size = 'md', className, status }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const initials = getInitials(name);
  const color = getColorForName(name);
  const showInitials = !src || imgError;

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-semibold text-white overflow-hidden',
          sizeClasses[size],
          showInitials ? color : 'bg-surface-200 dark:bg-surface-700'
        )}
      >
        {src && !imgError ? (
          <Image
            alt={name}
            className="h-full w-full object-cover"
            height={64}
            src={src}
            width={64}
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-surface-900',
            statusColors[status],
            size === 'xs' ? 'h-1.5 w-1.5' : size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
          )}
        />
      )}
    </div>
  );
}
