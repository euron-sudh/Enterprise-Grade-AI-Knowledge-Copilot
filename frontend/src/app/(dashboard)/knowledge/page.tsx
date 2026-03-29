'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileText, HardDrive, Link2, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import * as knowledgeApi from '@/lib/api/knowledge';
import { formatBytes, formatRelativeTime } from '@/lib/utils';

export default function KnowledgePage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: knowledgeApi.getKnowledgeStats,
  });

  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', { pageSize: 8 }],
    queryFn: () => knowledgeApi.listDocuments({ pageSize: 8 }),
  });

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: knowledgeApi.listCollections,
  });

  const storagePercent = 0; // quota not provided by backend

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-surface-100 bg-white px-6 py-5 dark:border-surface-800 dark:bg-surface-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
              Knowledge Base
            </h1>
            <p className="mt-1 text-sm text-surface-500">
              Manage your documents, collections, and data connectors.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/knowledge/connectors">
              <Button leftIcon={<Link2 className="h-4 w-4" />} variant="secondary">
                Connectors
              </Button>
            </Link>
            <Link href="/knowledge/documents">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Add Documents</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Stats row */}
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={<FileText className="h-5 w-5" />}
              label="Total Documents"
              value={stats?.totalDocuments.toLocaleString() ?? '—'}
            />
            <StatCard
              icon={<BookOpen className="h-5 w-5" />}
              label="Collections"
              value={collections?.length.toLocaleString() ?? '—'}
            />
            <StatCard
              icon={<Link2 className="h-5 w-5" />}
              label="Active Connectors"
              value={stats?.totalConnectors?.toLocaleString() ?? '—'}
            />
            <StatCard
              icon={<HardDrive className="h-5 w-5" />}
              label="Storage Used"
              value={stats ? formatBytes(stats.storageUsedBytes) : '—'}
              extra={
                stats && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-surface-200 dark:bg-surface-700">
                      <div
                        className="h-1.5 rounded-full bg-brand-500 transition-all"
                        style={{ width: `${storagePercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-surface-400">
                      {stats.totalChunks} chunks indexed
                    </p>
                  </div>
                )
              }
            />
          </div>
        )}

        {/* Collections */}
        {collections && collections.length > 0 && (
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Collections</CardTitle>
              <Button size="sm" variant="ghost">
                View all
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {collections.map((col) => (
                  <button
                    key={col.id}
                    className="flex items-center gap-3 rounded-lg border border-surface-100 p-3 text-left hover:border-brand-200 hover:bg-brand-50/30 dark:border-surface-800 dark:hover:border-brand-800 dark:hover:bg-brand-950/30 transition-colors"
                  >
                    <div
                      className="h-8 w-8 rounded-lg shrink-0"
                      style={{ background: col.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">
                        {col.name}
                      </p>
                      <p className="text-xs text-surface-400">{col.documentCount} docs</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent documents */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <Link href="/knowledge/documents">
              <Button size="sm" variant="ghost">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="space-y-2">
                {docsData?.items.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 rounded-lg px-2 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950">
                      <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-surface-400">
                        <span>{formatBytes(doc.size)}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(doc.createdAt)}</span>
                      </div>
                    </div>
                    <Badge
                      size="sm"
                      variant={
                        doc.processingStatus === 'indexed'
                          ? 'success'
                          : doc.processingStatus === 'failed'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {doc.processingStatus}
                    </Badge>
                  </div>
                ))}
                {!docsData?.items.length && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-surface-400">No documents yet</p>
                    <Link href="/knowledge/documents">
                      <Button className="mt-3" size="sm">
                        Upload documents
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  extra,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <Card variant="bordered">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">{value}</p>
        <p className="mt-0.5 text-xs text-surface-500">{label}</p>
        {extra}
      </div>
    </Card>
  );
}
