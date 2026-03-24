'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ConnectorCard } from '@/components/knowledge/ConnectorCard';
import { FigmaConnectModal } from '@/components/knowledge/FigmaConnectModal';
import { GitHubConnectModal } from '@/components/knowledge/GitHubConnectModal';
import { GoogleDriveConnectModal } from '@/components/knowledge/GoogleDriveConnectModal';
import * as knowledgeApi from '@/lib/api/knowledge';
import { useKnowledgeStore } from '@/stores/knowledgeStore';

const AVAILABLE_CONNECTORS = [
  { type: 'google_drive', name: 'Google Drive', description: 'Files and folders from Google Drive', logo: '📁' },
  { type: 'sharepoint', name: 'SharePoint', description: 'Microsoft SharePoint sites', logo: '📋' },
  { type: 'onedrive', name: 'OneDrive', description: 'Personal and business OneDrive', logo: '☁️' },
  { type: 'confluence', name: 'Confluence', description: 'Atlassian Confluence spaces', logo: '🌐' },
  { type: 'notion', name: 'Notion', description: 'Notion pages and databases', logo: '📝' },
  { type: 'jira', name: 'Jira', description: 'Jira issues and projects', logo: '🎯' },
  { type: 'github', name: 'GitHub', description: 'GitHub repositories and wikis', logo: '🐙' },
  { type: 'gitlab', name: 'GitLab', description: 'GitLab projects', logo: '🦊' },
  { type: 'slack', name: 'Slack', description: 'Slack channels and messages', logo: '💬' },
  { type: 'teams', name: 'Microsoft Teams', description: 'Teams channels and chats', logo: '👥' },
  { type: 'salesforce', name: 'Salesforce', description: 'CRM records and documents', logo: '☁️' },
  { type: 'hubspot', name: 'HubSpot', description: 'Marketing and CRM content', logo: '🧲' },
  { type: 'zendesk', name: 'Zendesk', description: 'Support tickets and articles', logo: '🎫' },
  { type: 'intercom', name: 'Intercom', description: 'Customer conversations', logo: '💭' },
  { type: 'dropbox', name: 'Dropbox', description: 'Dropbox files and folders', logo: '📦' },
  { type: 'box', name: 'Box', description: 'Box files and collaboration', logo: '📤' },
  { type: 'figma', name: 'Figma', description: 'Design files and assets', logo: '🎨' },
  { type: 'linear', name: 'Linear', description: 'Issues and projects', logo: '📐' },
  { type: 'asana', name: 'Asana', description: 'Tasks and projects', logo: '✅' },
  { type: 'airtable', name: 'Airtable', description: 'Bases and tables', logo: '🗃️' },
  { type: 'web_scraper', name: 'Web Scraper', description: 'Scrape any public website', logo: '🕷️' },
  { type: 's3', name: 'Amazon S3', description: 'S3 buckets and objects', logo: '🪣' },
];

export default function ConnectorsPage() {
  const { connectors, setConnectors } = useKnowledgeStore();
  const [openModal, setOpenModal] = useState<string | null>(null);

  const { isLoading } = useQuery({
    queryKey: ['connectors'],
    queryFn: async () => {
      const data = await knowledgeApi.listConnectors();
      setConnectors(data);
      return data;
    },
  });

  const connectedTypes = new Set(connectors.map((c) => c.type));

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-surface-100 bg-white px-6 py-5 dark:border-surface-800 dark:bg-surface-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
              Data Connectors
            </h1>
            <p className="mt-1 text-sm text-surface-500">
              Connect your tools and data sources to build a unified knowledge base.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <span className="font-semibold text-surface-700 dark:text-surface-300">
              {connectors.length}
            </span>
            connected
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8">
        {/* Active connectors */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : connectors.length > 0 ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                Connected ({connectors.length})
              </h2>
              <Button
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                size="sm"
                variant="ghost"
              >
                Sync all
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {connectors.map((connector) => (
                <ConnectorCard key={connector.id} connector={connector} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Available connectors */}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-300">
            Available Connectors
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {AVAILABLE_CONNECTORS.filter((c) => !connectedTypes.has(c.type as never)).map(
              (connector) => (
                <button
                  key={connector.type}
                  onClick={() => setOpenModal(connector.type)}
                  className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white p-3 text-left transition-all hover:border-brand-300 hover:shadow-card-hover dark:border-surface-700 dark:bg-surface-900 dark:hover:border-brand-700"
                >
                  <span className="text-2xl">{connector.logo}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">
                      {connector.name}
                    </p>
                    <p className="truncate text-xs text-surface-400">{connector.description}</p>
                  </div>
                  <Plus className="ml-auto h-4 w-4 shrink-0 text-surface-300" />
                </button>
              )
            )}
          </div>

          {/* Connector modals */}
          {openModal === 'figma' && (
            <FigmaConnectModal onClose={() => setOpenModal(null)} />
          )}
          {openModal === 'github' && (
            <GitHubConnectModal onClose={() => setOpenModal(null)} />
          )}
          {openModal === 'google_drive' && (
            <GoogleDriveConnectModal onClose={() => setOpenModal(null)} />
          )}
          {openModal && !['figma', 'github', 'google_drive'].includes(openModal) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-surface-900">
                <p className="text-2xl mb-2">🚧</p>
                <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-1">Coming Soon</h3>
                <p className="text-sm text-surface-500 mb-4">
                  The <strong>{AVAILABLE_CONNECTORS.find(c => c.type === openModal)?.name}</strong> connector is coming soon.
                </p>
                <button
                  onClick={() => setOpenModal(null)}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
