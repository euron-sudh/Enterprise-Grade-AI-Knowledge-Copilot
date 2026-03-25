'use client';

import { ExternalLink, FileText, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useSearch } from '@/hooks/useSearch';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/types';

export function SearchInterface() {
  const {
    query,
    setQuery,
    data,
    isFetching,
    filters,
    removeFilter,
    clearFilters,
  } = useSearch();

  return (
    <div className="flex gap-6">
      {/* Sidebar filters */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-0 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
              Filters
            </h3>
            {filters.length > 0 && (
              <button
                className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400"
                onClick={clearFilters}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Active filters */}
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.field}
                  className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-xs text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300"
                  onClick={() => removeFilter(f.field)}
                >
                  {String(f.value)}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {/* Facets from search response */}
          {data?.facets.map((facet) => (
            <div key={facet.field}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">
                {facet.label}
              </p>
              <div className="space-y-1">
                {facet.values.map((fv) => (
                  <label
                    key={fv.value}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        checked={fv.selected}
                        className="h-3.5 w-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                        type="checkbox"
                        onChange={() => {}}
                      />
                      <span className="text-sm text-surface-700 dark:text-surface-300">
                        {fv.label}
                      </span>
                    </div>
                    <span className="text-xs text-surface-400">{fv.count}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-400" />
          <input
            autoFocus
            className={cn(
              'w-full rounded-xl border border-surface-200 bg-white py-3 pl-12 pr-4 text-sm shadow-sm',
              'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
              'dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:placeholder-surface-500'
            )}
            placeholder="Search your knowledge base..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Stats */}
        {data && (
          <p className="mb-4 text-sm text-surface-500">
            {data.totalCount.toLocaleString()} results
            {data.processingTimeMs && (
              <span className="ml-1">({data.processingTimeMs}ms)</span>
            )}
          </p>
        )}

        {/* Loading */}
        {isFetching && (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        )}

        {/* Results */}
        {!isFetching && data && (
          <div className="space-y-3">
            {data.results.map((result) => (
              <SearchResultCard key={result.id} result={result} />
            ))}
            {data.results.length === 0 && (
              <Card className="py-12 text-center" variant="bordered">
                <p className="text-surface-500">No results found for &quot;{query}&quot;</p>
                <p className="mt-1 text-sm text-surface-400">
                  Try different keywords or remove some filters
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isFetching && !data && (
          <div className="py-16 text-center">
            <Search className="mx-auto h-12 w-12 text-surface-200 dark:text-surface-700" />
            <p className="mt-4 text-surface-400">Start typing to search</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  return (
    <Card
      className="hover:shadow-card-hover cursor-pointer transition-shadow"
      padding="none"
      variant="bordered"
    >
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-brand-500" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              {result.title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge size="sm" variant="primary">
              {Math.round(result.relevanceScore * 100)}%
            </Badge>
            {result.url && (
              <a
                className="text-surface-400 hover:text-brand-500"
                href={result.url}
                rel="noopener noreferrer"
                target="_blank"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        <p className="text-sm text-surface-600 dark:text-surface-400">{result.excerpt}</p>

        {result.highlights.length > 0 && (
          <div className="mt-2 space-y-1">
            {result.highlights.slice(0, 2).map((h, i) => (
              <p
                key={i}
                className="rounded bg-brand-50 px-2 py-1 text-xs text-surface-700 dark:bg-brand-950 dark:text-surface-300"
                dangerouslySetInnerHTML={{ __html: h }}
              />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-[10px] text-surface-400">
          {result.collectionName && <span>{result.collectionName}</span>}
          {result.documentType && (
            <Badge size="sm" variant="default">
              {result.documentType}
            </Badge>
          )}
          {result.connectorType && (
            <span className="capitalize">{result.connectorType.replace(/_/g, ' ')}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// Re-export Button for use in parent
export { Button };
