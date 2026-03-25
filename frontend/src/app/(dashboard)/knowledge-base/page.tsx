'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Upload,
  FileText,
  Database,
  Link2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronRight,
  FolderOpen,
  FileCode2,
  FileImage,
  File,
  Clock,
  HardDrive,
  Layers,
  Zap,
  Cloud,
} from 'lucide-react';

interface Connector {
  id: string;
  name: string;
  icon: string;
  color: string;
  docs: number;
  status: 'synced' | 'syncing' | 'error' | 'disconnected';
  lastSync: string;
}

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'md' | 'code' | 'image' | 'other';
  size: string;
  uploadedAt: string;
  status: 'indexed' | 'processing' | 'failed';
  source: string;
}

const CONNECTORS: Connector[] = [
  { id: '1', name: 'Google Drive', icon: '☁', color: 'bg-blue-600', docs: 0, status: 'disconnected', lastSync: 'Not connected' },
  { id: '2', name: 'Confluence', icon: '🔵', color: 'bg-blue-500', docs: 0, status: 'disconnected', lastSync: 'Not connected' },
  { id: '3', name: 'Slack', icon: '💬', color: 'bg-purple-600', docs: 0, status: 'disconnected', lastSync: 'Not connected' },
  { id: '4', name: 'GitHub', icon: '⚫', color: 'bg-surface-200 dark:bg-gray-700', docs: 0, status: 'disconnected', lastSync: 'Not connected' },
  { id: '5', name: 'Notion', icon: '📝', color: 'bg-surface-300 dark:bg-gray-600', docs: 0, status: 'disconnected', lastSync: 'Not connected' },
  { id: '6', name: 'Jira', icon: '🔷', color: 'bg-blue-700', docs: 0, status: 'disconnected', lastSync: 'Not connected' },
  { id: '7', name: 'Salesforce', icon: '☁', color: 'bg-sky-600', docs: 0, status: 'disconnected', lastSync: 'Not connected' },
  { id: '8', name: 'Gmail', icon: '✉', color: 'bg-red-600', docs: 0, status: 'disconnected', lastSync: 'Not connected' },
];

const DOCUMENTS: Document[] = [
  { id: '1', name: 'Product Roadmap 2026.pdf', type: 'pdf', size: '2.4 MB', uploadedAt: 'Mar 20, 2026', status: 'indexed', source: 'Upload' },
  { id: '2', name: 'Engineering Onboarding Guide.docx', type: 'docx', size: '1.1 MB', uploadedAt: 'Mar 18, 2026', status: 'indexed', source: 'Confluence' },
  { id: '3', name: 'Q4 Financial Report.xlsx', type: 'xlsx', size: '890 KB', uploadedAt: 'Mar 15, 2026', status: 'indexed', source: 'Google Drive' },
  { id: '4', name: 'API Architecture Overview.md', type: 'md', size: '48 KB', uploadedAt: 'Mar 14, 2026', status: 'processing', source: 'GitHub' },
  { id: '5', name: 'Security Policy v2.1.pdf', type: 'pdf', size: '3.2 MB', uploadedAt: 'Mar 12, 2026', status: 'indexed', source: 'Upload' },
  { id: '6', name: 'Customer Data Schema.png', type: 'image', size: '540 KB', uploadedAt: 'Mar 10, 2026', status: 'failed', source: 'Upload' },
  { id: '7', name: 'Deployment Runbook.md', type: 'md', size: '92 KB', uploadedAt: 'Mar 8, 2026', status: 'indexed', source: 'Confluence' },
  { id: '8', name: 'backend/app/main.py', type: 'code', size: '12 KB', uploadedAt: 'Mar 6, 2026', status: 'indexed', source: 'GitHub' },
];

const FILE_ICONS: Record<Document['type'], React.ElementType> = {
  pdf: FileText,
  docx: FileText,
  xlsx: Database,
  md: FileCode2,
  code: FileCode2,
  image: FileImage,
  other: File,
};

const FILE_COLORS: Record<Document['type'], string> = {
  pdf: 'text-red-400',
  docx: 'text-blue-400',
  xlsx: 'text-green-400',
  md: 'text-surface-500 dark:text-gray-400',
  code: 'text-purple-400',
  image: 'text-orange-400',
  other: 'text-surface-400 dark:text-gray-500',
};

const STATUS_CONFIG = {
  indexed: { label: 'Indexed', color: 'text-emerald-400 bg-emerald-900/40', icon: CheckCircle2 },
  processing: { label: 'Processing', color: 'text-amber-400 bg-amber-900/40', icon: Loader2 },
  failed: { label: 'Failed', color: 'text-red-400 bg-red-900/40', icon: AlertCircle },
};

const CONNECTOR_STATUS = {
  synced: { dot: 'bg-emerald-500', label: 'Synced' },
  syncing: { dot: 'bg-amber-500 animate-pulse', label: 'Syncing' },
  error: { dot: 'bg-red-500', label: 'Error' },
  disconnected: { dot: 'bg-surface-300 dark:bg-gray-600', label: 'Connect' },
};

export default function KnowledgeBasePage() {
  const { data: session } = useSession();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'uploading' | 'done' | 'error'>>({});
  const [realDocs, setRealDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeader = { Authorization: `Bearer ${(session as any)?.accessToken ?? ''}` };

  const totalDocs = CONNECTORS.reduce((a, c) => a + c.docs, 0) + realDocs.length;
  const activeConnectors = CONNECTORS.filter(c => c.status !== 'disconnected').length;

  // Load real documents from backend
  useEffect(() => {
    if (!(session as any)?.accessToken) return;
    setLoadingDocs(true);
    fetch('/api/backend/knowledge/documents?pageSize=20', { headers: authHeader })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.items) {
          setRealDocs(data.items.map((d: any) => ({
            id: d.id,
            name: d.name,
            type: d.type ?? 'other',
            size: d.size ? `${Math.round(d.size / 1024)} KB` : '—',
            uploadedAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—',
            status: d.status ?? 'indexed',
            source: 'Upload',
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }, [session]);

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    const names = files.map(f => f.name);
    setUploadingFiles(names);
    const statusMap: Record<string, 'uploading' | 'done' | 'error'> = {};
    names.forEach(n => { statusMap[n] = 'uploading'; });
    setUploadStatus({ ...statusMap });

    await Promise.all(files.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('files', file);
        const res = await fetch('/api/backend/knowledge/documents/upload', {
          method: 'POST',
          headers: authHeader,
          body: formData,
        });
        statusMap[file.name] = res.ok ? 'done' : 'error';
        setUploadStatus({ ...statusMap });
        if (res.ok) {
          const docs = await res.json();
          const doc = Array.isArray(docs) ? docs[0] : docs;
          if (doc) {
            setRealDocs(prev => [{
              id: doc.id,
              name: doc.name,
              type: doc.type ?? 'other',
              size: doc.size ? `${Math.round(doc.size / 1024)} KB` : '—',
              uploadedAt: new Date().toLocaleDateString(),
              status: 'processing',
              source: 'Upload',
            }, ...prev]);
          }
        }
      } catch {
        statusMap[file.name] = 'error';
        setUploadStatus({ ...statusMap });
      }
    }));
    setTimeout(() => { setUploadingFiles([]); setUploadStatus({}); }, 3000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    void uploadFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    void uploadFiles(files);
    e.target.value = '';
  };

  return (
    <div className="min-h-full bg-surface-50 dark:bg-gray-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Knowledge Base</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-gray-400">
            Manage your organization's indexed documents and connected data sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-surface-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors">
            <FolderOpen className="h-4 w-4" />
            Collections
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-surface-900 dark:text-white hover:bg-indigo-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: totalDocs.toLocaleString(), icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-900/30' },
          { label: 'Storage Used', value: '47.2 GB', icon: HardDrive, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
          { label: 'Last Synced', value: '5 min ago', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-900/30' },
          { label: 'Active Connectors', value: `${activeConnectors} / ${CONNECTORS.length}`, icon: Zap, color: 'text-violet-400', bg: 'bg-violet-900/30' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-surface-400 dark:text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold text-surface-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-950/30'
            : 'border-surface-300 dark:border-gray-700 bg-white dark:bg-gray-900/50 hover:border-surface-300 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-900'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
            isDragging ? 'bg-indigo-600' : 'bg-surface-100 dark:bg-gray-800'
          }`}>
            <Upload className={`h-6 w-6 ${isDragging ? 'text-surface-900 dark:text-white' : 'text-surface-500 dark:text-gray-400'}`} />
          </div>
          {uploadingFiles.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading {uploadingFiles.length} file(s)...
              </p>
              <p className="text-xs text-surface-400 dark:text-gray-500 mt-1">{uploadingFiles[0]}{uploadingFiles.length > 1 ? ` and ${uploadingFiles.length - 1} more` : ''}</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                {isDragging ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-xs text-surface-400 dark:text-gray-500">
                Supports PDF, DOCX, XLSX, PPTX, Markdown, CSV, images and more · Up to 50 files at once
              </p>
            </>
          )}
        </div>
      </div>

      {/* Connected sources */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <Cloud className="h-4.5 w-4.5 text-surface-500 dark:text-gray-400" />
            Connected Sources
          </h2>
          <button className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Source
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CONNECTORS.map(connector => (
            <div
              key={connector.id}
              className={`rounded-2xl border bg-white dark:bg-gray-900 p-4 transition-all ${
                connector.status === 'disconnected'
                  ? 'border-surface-200 dark:border-gray-800 opacity-60 hover:opacity-80 cursor-pointer'
                  : 'border-surface-200 dark:border-gray-800 hover:border-surface-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${connector.color}`}>
                  {connector.icon}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${CONNECTOR_STATUS[connector.status].dot}`} />
                  <span className="text-[10px] text-surface-400 dark:text-gray-500">{CONNECTOR_STATUS[connector.status].label}</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{connector.name}</p>
              {connector.status !== 'disconnected' ? (
                <p className="text-[11px] text-surface-400 dark:text-gray-500 mt-0.5">{connector.docs.toLocaleString()} docs</p>
              ) : (
                <p className="text-[11px] text-indigo-400 mt-0.5 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Click to connect
                </p>
              )}
              <p className="text-[10px] text-surface-600 dark:text-gray-700 mt-1">{connector.lastSync}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-surface-500 dark:text-gray-400" />
            Recent Documents
          </h2>
          <button className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="rounded-2xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider hidden sm:table-cell">Size</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider hidden md:table-cell">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider hidden lg:table-cell">Uploaded</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-gray-800">
              {loadingDocs ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-surface-400 dark:text-gray-500 text-sm">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading documents...
                  </td>
                </tr>
              ) : realDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-surface-400 dark:text-gray-500 text-sm">
                    No documents yet. Upload a file above to get started.
                  </td>
                </tr>
              ) : (
                realDocs.map(doc => {
                  const docType = (doc.type in FILE_ICONS ? doc.type : 'other') as Document['type'];
                  const docStatus = (doc.status in STATUS_CONFIG ? doc.status : 'indexed') as Document['status'];
                  const Icon = FILE_ICONS[docType];
                  const statusCfg = STATUS_CONFIG[docStatus];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={doc.id} className="hover:bg-surface-100 dark:hover:bg-gray-800/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 flex-shrink-0 ${FILE_COLORS[docType]}`} />
                          <span className="text-surface-700 dark:text-gray-200 font-medium truncate max-w-[200px]">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-surface-400 dark:text-gray-500 text-xs hidden sm:table-cell">{doc.size}</td>
                      <td className="px-4 py-3.5 text-surface-400 dark:text-gray-500 text-xs hidden md:table-cell">{doc.source}</td>
                      <td className="px-4 py-3.5 text-surface-400 dark:text-gray-500 text-xs hidden lg:table-cell">{doc.uploadedAt}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                          <StatusIcon className={`h-3 w-3 ${docStatus === 'processing' ? 'animate-spin' : ''}`} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="rounded p-1 text-surface-400 dark:text-gray-500 hover:text-surface-600 dark:hover:text-gray-300 hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button className="rounded p-1 text-surface-400 dark:text-gray-500 hover:text-red-400 hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
