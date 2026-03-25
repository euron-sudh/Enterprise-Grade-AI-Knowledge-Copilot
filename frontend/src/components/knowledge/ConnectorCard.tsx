'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import * as knowledgeApi from '@/lib/api/knowledge';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import type { Connector } from '@/types';

interface ConnectorCardProps {
  connector: Connector;
}

const statusConfig = {
  connected: { label: 'Connected', variant: 'success' as const, icon: CheckCircle },
  disconnected: { label: 'Disconnected', variant: 'default' as const, icon: XCircle },
  error: { label: 'Error', variant: 'danger' as const, icon: AlertCircle },
  pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
};

export function ConnectorCard({ connector }: ConnectorCardProps) {
  const { updateConnector } = useKnowledgeStore();

  const handleSync = async () => {
    try {
      updateConnector(connector.id, { syncStatus: 'syncing' });
      await knowledgeApi.syncConnector(connector.id);
      updateConnector(connector.id, {
        syncStatus: 'success',
        lastSyncedAt: new Date().toISOString(),
      });
      toast.success(`${connector.name} sync started`);
    } catch {
      updateConnector(connector.id, { syncStatus: 'error' });
      toast.error('Sync failed');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${connector.name} connector?`)) return;
    try {
      await knowledgeApi.deleteConnector(connector.id);
      toast.success('Connector removed');
    } catch {
      toast.error('Failed to remove connector');
    }
  };

  const { label, variant, icon: StatusIcon } = statusConfig[connector.status];

  return (
    <Card className="group flex flex-col gap-4" variant="bordered">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-lg dark:bg-surface-800">
            {connector.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={connector.name} className="h-7 w-7 object-contain" src={connector.logoUrl} />
            ) : (
              '🔌'
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              {connector.name}
            </p>
            <p className="text-xs text-surface-500">{connector.type.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <Badge dot size="sm" variant={variant}>
          <StatusIcon className="h-3 w-3" />
          {label}
        </Badge>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-surface-500">
        <span>
          <span className="font-semibold text-surface-700 dark:text-surface-300">
            {connector.documentCount.toLocaleString()}
          </span>{' '}
          documents
        </span>
        {connector.lastSyncedAt && (
          <span>
            Last sync{' '}
            {formatDistanceToNow(new Date(connector.lastSyncedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Error */}
      {connector.errorMessage && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
          {connector.errorMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          className="flex-1"
          disabled={connector.syncStatus === 'syncing'}
          leftIcon={
            <RefreshCw
              className={`h-3.5 w-3.5 ${connector.syncStatus === 'syncing' ? 'animate-spin' : ''}`}
            />
          }
          size="sm"
          variant="secondary"
          onClick={handleSync}
        >
          {connector.syncStatus === 'syncing' ? 'Syncing...' : 'Sync now'}
        </Button>
        <Button
          aria-label={`Remove ${connector.name}`}
          size="icon-sm"
          variant="danger-ghost"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
