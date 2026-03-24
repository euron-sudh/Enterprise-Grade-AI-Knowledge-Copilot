import * as React from 'react';

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightIcon, wrapperClassName, className, id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn('flex flex-col gap-1', wrapperClassName)}>
      {label && (
        <label
          className="text-sm font-medium text-surface-700 dark:text-surface-300"
          htmlFor={inputId}
        >
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 flex items-center text-surface-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'block w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400',
            'transition-colors duration-200',
            'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:placeholder-surface-500',
            'dark:focus:border-brand-400 dark:focus:ring-brand-400',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            className
          )}
          id={inputId}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center text-surface-400">{rightIcon}</div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-surface-500 dark:text-surface-400">{hint}</p>}
    </div>
  );
});
