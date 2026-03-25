'use client';

import { useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Filter, Search, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { DocumentUpload } from '@/components/knowledge/DocumentUpload';
import * as knowledgeApi from '@/lib/api/knowledge';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';
import type { ProcessingStatus } from '@/types';

const statusVariant: Record<
  ProcessingStatus,
  'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'outline'
> = {
  pending: 'warning',
  processing: 'info',
  indexed: 'success',
  failed: 'danger',
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', { search }],
    queryFn: () => knowledgeApi.listDocuments({ search, pageSize: 50 }),
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    await knowledgeApi.deleteDocument(id);
    void queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-surface-100 bg-white px-6 py-5 dark:border-surface-800 dark:bg-surface-950">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
            Documents
          </h1>
          <Button onClick={() => setUploadModalOpen(true)}>Upload Documents</Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-surface-100 bg-white px-6 py-3 dark:border-surface-800 dark:bg-surface-950">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            className="w-full rounded-lg border border-surface-200 bg-surface-50 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button leftIcon={<Filter className="h-4 w-4" />} size="sm" variant="outline">
          Filters
        </Button>
        {selectedIds.length > 0 && (
          <Button
            leftIcon={<Trash2 className="h-4 w-4" />}
            size="sm"
            variant="danger-ghost"
          >
            Delete ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-16 w-16 text-surface-200 dark:text-surface-700" />
            <p className="mt-4 text-surface-500">No documents found</p>
            <Button className="mt-4" onClick={() => setUploadModalOpen(true)}>
              Upload your first document
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-950">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-800">
                  <th className="w-10 px-4 py-3">
                    <input
                      checked={selectedIds.length === data.items.length}
                      className="h-4 w-4 rounded border-surface-300 text-brand-600"
                      type="checkbox"
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? data.items.map((d) => d.id) : [])
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
                    Name
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 md:table-cell">
                    Type
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 lg:table-cell">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 md:table-cell">
                    Added
                  </th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50 dark:divide-surface-800">
                {data.items.map((doc) => (
                  <tr
                    key={doc.id}
                    className={cn(
                      'transition-colors',
                      selectedIds.includes(doc.id)
                        ? 'bg-brand-50 dark:bg-brand-950/20'
                        : 'hover:bg-surface-50 dark:hover:bg-surface-800'
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        checked={selectedIds.includes(doc.id)}
                        className="h-4 w-4 rounded border-surface-300 text-brand-600"
                        type="checkbox"
                        onChange={() => toggleSelection(doc.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950">
                          <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                            {doc.name}
                          </p>
                          {doc.collectionName && (
                            <p className="truncate text-xs text-surface-400">{doc.collectionName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Badge size="sm" variant="default">
                        {doc.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-surface-500 lg:table-cell">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge dot size="sm" variant={statusVariant[doc.processingStatus]}>
                        {doc.processingStatus}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-surface-400 md:table-cell">
                      {formatRelativeTime(doc.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        aria-label="Delete document"
                        size="icon-xs"
                        variant="danger-ghost"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload modal */}
      <Modal
        description="Upload PDF, DOCX, TXT, Markdown, and more"
        open={uploadModalOpen}
        size="lg"
        title="Upload Documents"
        onClose={() => setUploadModalOpen(false)}
      >
        <DocumentUpload
          onUploadComplete={() => {
            setUploadModalOpen(false);
            void queryClient.invalidateQueries({ queryKey: ['documents'] });
          }}
        />
      </Modal>
    </div>
  );
}
