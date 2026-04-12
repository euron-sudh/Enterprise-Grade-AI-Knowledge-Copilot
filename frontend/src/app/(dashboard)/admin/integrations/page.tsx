'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, CheckCircle, Clock, AlertCircle, Settings, Trash2, RefreshCw } from 'lucide-react';

import * as knowledgeApi from '@/lib/api/knowledge';

const VISIBLE_CONNECTOR_TYPES = new Set([
  'google_drive',
  'confluence',
  'slack',
  'github',
  'notion',
  'jira',
  'salesforce',
  'gmail',
]);

const CONNECTOR_META: Record<string, { category: string; logo: string }> = {
  google_drive: { category: 'Storage', logo: '🟡' },
  slack: { category: 'Communication', logo: '🟣' },
  confluence: { category: 'Wiki', logo: '🔵' },
  github: { category: 'Development', logo: '⚫' },
  notion: { category: 'Wiki', logo: '⚪' },
  jira: { category: 'Project Mgmt', logo: '🔵' },
  salesforce: { category: 'CRM', logo: '🔵' },
  gmail: { category: 'Email', logo: '🔴' },
};

const AVAILABLE = [
  { type: 'google_drive', name: 'Google Drive', category: 'Storage', logo: '🟡' },
  { name: 'OneDrive', category: 'Storage', logo: '🔵' },
  { name: 'Dropbox', category: 'Storage', logo: '🔷' },
  { type: 'gmail', name: 'Gmail', category: 'Email', logo: '🔴' },
  { name: 'Outlook', category: 'Email', logo: '🔵' },
  { name: 'HubSpot', category: 'CRM', logo: '🟠' },
  { name: 'Zendesk', category: 'Support', logo: '🟢' },
  { type: 'confluence', name: 'Confluence', category: 'Wiki', logo: '🔵' },
  { type: 'notion', name: 'Notion', category: 'Wiki', logo: '⚪' },
  { type: 'slack', name: 'Slack', category: 'Communication', logo: '🟣' },
  { type: 'github', name: 'GitHub', category: 'Development', logo: '⚫' },
  { type: 'jira', name: 'Jira', category: 'Project Mgmt', logo: '🔵' },
  { type: 'salesforce', name: 'Salesforce', category: 'CRM', logo: '🔵' },
  { name: 'Asana', category: 'Project Mgmt', logo: '🔴' },
  { name: 'Linear', category: 'Project Mgmt', logo: '🟣' },
];

const statusConfig = {
  connected: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Connected' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Error' },
  syncing: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Syncing' },
};

function formatLastSync(lastSyncAt?: string) {
  if (!lastSyncAt) return 'Never';
  const diffMs = Date.now() - new Date(lastSyncAt).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  const { data: connectors = [] } = useQuery({
    queryKey: ['admin-integrations-connectors'],
    queryFn: knowledgeApi.listConnectors,
  });
  const { data: stats } = useQuery({
    queryKey: ['admin-integrations-stats'],
    queryFn: knowledgeApi.getKnowledgeStats,
  });

  const visibleIntegrations = connectors
    .filter((connector) => VISIBLE_CONNECTOR_TYPES.has(connector.type))
    .filter((connector) => connector.status !== 'disconnected')
    .map((connector) => ({
      id: connector.id,
      name: connector.name,
      type: connector.type,
      category: CONNECTOR_META[connector.type]?.category ?? 'Integration',
      status: connector.status === 'pending' ? 'syncing' : connector.status,
      docs: connector.documentCount,
      lastSync: formatLastSync(connector.lastSyncedAt),
      logo: CONNECTOR_META[connector.type]?.logo ?? '🔌',
    }));
  const connectedTypes = new Set(visibleIntegrations.map((integration) => integration.type));
  const totalDocuments = stats?.totalDocuments ?? 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-surface-600 dark:text-gray-400 text-sm mt-1">Connect your organization's tools and data sources</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Integration
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Connected', value: visibleIntegrations.filter(i => i.status === 'connected').length.toString(), color: 'text-green-400' },
          { label: 'Total Documents', value: totalDocuments.toLocaleString(), color: 'text-white' },
          { label: 'Errors', value: visibleIntegrations.filter(i => i.status === 'error').length.toString(), color: 'text-red-400' },
          { label: 'Available', value: AVAILABLE.filter((integration) => !integration.type || !connectedTypes.has(integration.type)).length.toString(), color: 'text-surface-600 dark:text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 border border-surface-100 dark:border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-surface-500 dark:text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active integrations */}
      <div className="bg-white dark:bg-gray-900 border border-surface-100 dark:border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-white/5">
          <h3 className="text-white font-semibold">Active Integrations</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 dark:text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-surface-100 dark:bg-gray-800 border border-surface-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 w-40" />
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {visibleIntegrations.filter(i => search === '' || i.name.toLowerCase().includes(search.toLowerCase())).map(integration => {
            const cfg = statusConfig[integration.status as keyof typeof statusConfig];
            const Icon = cfg.icon;
            return (
              <div key={integration.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-100/50 dark:bg-gray-800/50 transition-colors">
                <div className="text-2xl w-10 text-center flex-shrink-0">{integration.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{integration.name}</span>
                    <span className="text-xs bg-surface-100 dark:bg-gray-800 text-surface-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{integration.category}</span>
                  </div>
                  <div className="text-surface-500 dark:text-gray-500 text-xs mt-0.5">
                    {integration.status === 'connected' ? `${integration.docs.toLocaleString()} documents · Last sync: ${integration.lastSync}` : integration.status === 'syncing' ? 'Sync in progress' : 'Sync failed — check credentials'}
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                  <Icon className="w-3 h-3" /> {cfg.label}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {integration.status === 'connected' && (
                    <button className="p-1.5 rounded-lg hover:bg-surface-200 dark:bg-gray-700 text-surface-600 dark:text-gray-400 hover:text-white transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                  )}
                  <button className="p-1.5 rounded-lg hover:bg-surface-200 dark:bg-gray-700 text-surface-600 dark:text-gray-400 hover:text-white transition-colors"><Settings className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded-lg hover:bg-red-500/20 text-surface-600 dark:text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Available integrations */}
      <div>
        <h3 className="text-white font-semibold mb-3">Available to Connect</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AVAILABLE.filter((avail) => !avail.type || !connectedTypes.has(avail.type)).map(avail => (
            <div key={avail.name} className="bg-white dark:bg-gray-900 border border-surface-100 dark:border-white/5 hover:border-white/15 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors group">
              <div className="text-2xl">{avail.logo}</div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{avail.name}</div>
                <div className="text-surface-500 dark:text-gray-500 text-xs">{avail.category}</div>
              </div>
              <Plus className="w-4 h-4 text-surface-500 dark:text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
