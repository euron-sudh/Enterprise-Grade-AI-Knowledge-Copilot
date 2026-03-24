'use client';

import { useEffect, useRef } from 'react';

import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  closeOnOverlayClick?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-5xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  closeOnOverlayClick = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      prevFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      {/* Overlay */}
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={cn(
          'relative z-10 w-full rounded-xl bg-white shadow-2xl',
          'dark:bg-surface-900 dark:ring-1 dark:ring-surface-700',
          'animate-slide-up',
          sizeClasses[size],
          className
        )}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-surface-100 p-6 dark:border-surface-800">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{description}</p>
              )}
            </div>
            <Button
              aria-label="Close modal"
              className="ml-4 shrink-0"
              size="icon-sm"
              variant="ghost"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-surface-100 px-6 py-4 dark:border-surface-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
