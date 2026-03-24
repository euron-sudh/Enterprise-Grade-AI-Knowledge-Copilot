'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, ExternalLink, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { SourceCitation } from '@/types';

interface SourceCitationPanelProps {
  sources: SourceCitation[];
  className?: string;
}

export function SourceCitationPanel({ sources, className }: SourceCitationPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (sources.length === 0) return null;

  return (
    <div
      className={cn(
        'border-l border-surface-100 bg-surface-50/50 dark:border-surface-800 dark:bg-surface-900/50',
        className
      )}
    >
      {/* Header */}
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-500" />
          Sources
          <Badge size="sm" variant="primary">
            {sources.length}
          </Badge>
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-surface-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-surface-400" />
        )}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 p-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900"
            >
              {/* Source header */}
              <button
                className="flex w-full items-start gap-3 p-3 text-left"
                onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-950">
                  <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">
                    {source.documentName}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {source.pageNumber && (
                      <span className="text-xs text-surface-400">Page {source.pageNumber}</span>
                    )}
                    <Badge
                      size="sm"
                      variant={
                        source.relevanceScore > 0.8
                          ? 'success'
                          : source.relevanceScore > 0.6
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {Math.round(source.relevanceScore * 100)}% match
                    </Badge>
                  </div>
                </div>
                {source.url && (
                  <a
                    className="shrink-0 text-surface-300 hover:text-brand-500"
                    href={source.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </button>

              {/* Expanded chunk text */}
              {expandedId === source.id && (
                <div className="border-t border-surface-100 px-3 pb-3 pt-2 dark:border-surface-800">
                  <p className="text-xs leading-relaxed text-surface-600 dark:text-surface-400">
                    {source.chunkText}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
