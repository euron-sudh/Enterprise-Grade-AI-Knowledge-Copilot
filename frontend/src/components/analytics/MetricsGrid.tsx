'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  unit?: string;
  icon?: React.ReactNode;
  description?: string;
}

interface MetricsGridProps {
  metrics: MetricCard[];
  columns?: 2 | 3 | 4;
}

export function MetricsGrid({ metrics, columns = 4 }: MetricsGridProps) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div className={cn('grid gap-4', colClass)}>
      {metrics.map((metric, i) => (
        <MetricCardComponent key={i} metric={metric} />
      ))}
    </div>
  );
}

function MetricCardComponent({ metric }: { metric: MetricCard }) {
  const isPositive = (metric.change ?? 0) >= 0;

  return (
    <Card variant="bordered">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-surface-400">
            {metric.label}
          </p>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="text-2xl font-bold text-surface-900 dark:text-surface-100">
              {typeof metric.value === 'number'
                ? metric.value.toLocaleString()
                : metric.value}
            </span>
            {metric.unit && (
              <span className="mb-0.5 text-sm text-surface-400">{metric.unit}</span>
            )}
          </div>
          {metric.change !== undefined && (
            <div
              className={cn(
                'mt-1.5 flex items-center gap-1 text-xs font-medium',
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {Math.abs(metric.change)}% vs last period
            </div>
          )}
          {metric.description && (
            <p className="mt-1 text-xs text-surface-400">{metric.description}</p>
          )}
        </div>
        {metric.icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            {metric.icon}
          </div>
        )}
      </div>
    </Card>
  );
}
