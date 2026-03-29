'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api/token';
import { Upload, FileText, X, CheckCircle, AlertCircle, Link as LinkIcon, Loader2 } from 'lucide-react';

type UploadFile = {
  id: string;
  name: string;
  size: string;
  type: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  errorMsg?: string;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const TYPE_COLORS: Record<string, string> = {
  PDF: 'bg-red-500/20 text-red-400',
  DOCX: 'bg-blue-500/20 text-blue-400',
  DOC: 'bg-blue-500/20 text-blue-400',
  XLSX: 'bg-green-500/20 text-green-400',
  XLS: 'bg-green-500/20 text-green-400',
  PPTX: 'bg-orange-500/20 text-orange-400',
  PPTX2: 'bg-orange-500/20 text-orange-400',
  MD: 'bg-gray-700 text-gray-300',
  TXT: 'bg-gray-700 text-gray-300',
  CSV: 'bg-emerald-500/20 text-emerald-400',
  JSON: 'bg-yellow-500/20 text-yellow-400',
};

export default function UploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  const uploadFile = async (file: File, id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'uploading' } : f));
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await authFetch(
        '/api/backend/knowledge/documents/upload',
        { method: 'POST', body: formData },
        session?.accessToken,
        getUser(),
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Upload failed (${res.status})`);
      }
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'done' } : f));
    } catch (e: any) {
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'error', errorMsg: e?.message || 'Upload failed' } : f
      ));
    }
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: UploadFile[] = Array.from(fileList).map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      size: formatBytes(f.size),
      type: f.name.split('.').pop()?.toUpperCase() || 'FILE',
      status: 'uploading',
    }));
    setFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(uf => {
      const file = Array.from(fileList).find(f => f.name === uf.name)!;
      void uploadFile(file, uf.id);
    });
  };

  const importUrl = async () => {
    if (!url.trim()) return;
    setUrlLoading(true);
    setUrlError('');
    try {
      const res = await authFetch(
        '/api/backend/knowledge/crawlers',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim(), name: url.trim() }),
        },
        session?.accessToken,
        getUser(),
      );
      if (!res.ok) throw new Error(`Failed to import (${res.status})`);
      setUrl('');
      router.push('/knowledge-base');
    } catch (e: any) {
      setUrlError(e?.message || 'Import failed');
    } finally {
      setUrlLoading(false);
    }
  };

  const doneCount = files.filter(f => f.status === 'done').length;
  const hasActive = files.some(f => f.status === 'uploading' || f.status === 'processing');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Documents</h1>
        <p className="text-gray-400 text-sm mt-1">Add files to your knowledge base — PDFs, Word docs, spreadsheets, and more</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-white/10 rounded-xl p-1 w-fit">
        {([['file', 'Upload Files'], ['url', 'Import URL']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'file' ? (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/15 hover:border-indigo-500/50 hover:bg-gray-900/50'}`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,.html"
              className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
            />
            <Upload className="w-10 h-10 text-gray-500 mx-auto mb-4" />
            <p className="text-white font-semibold">Drop files here or click to browse</p>
            <p className="text-gray-500 text-sm mt-1">PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, HTML, JSON up to 100MB each</p>
          </div>

          {/* Progress summary */}
          {files.length > 0 && doneCount > 0 && !hasActive && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-900/20 border border-emerald-800 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-300 text-sm font-medium">{doneCount} file{doneCount > 1 ? 's' : ''} uploaded and indexed successfully</p>
              <button
                onClick={() => router.push('/knowledge-base')}
                className="ml-auto text-xs text-emerald-400 hover:text-emerald-300 underline"
              >
                View in Knowledge Base →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">URL to Import</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void importUrl(); }}
                  placeholder="https://docs.example.com/guide"
                  className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => void importUrl()}
                disabled={urlLoading || !url.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                {urlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Import
              </button>
            </div>
            {urlError && <p className="text-red-400 text-xs mt-1.5">{urlError}</p>}
          </div>
          <p className="text-gray-600 text-xs">Supports web pages, public docs, Confluence pages, GitHub README files</p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-sm">Files ({files.length})</h3>
          {files.map(file => (
            <div key={file.id} className="bg-gray-900 border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium truncate">{file.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[file.type] || 'bg-gray-700 text-gray-400'}`}>{file.type}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {file.status === 'uploading' && (
                    <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                  )}
                  <span className={`text-xs ${file.status === 'done' ? 'text-emerald-400' : file.status === 'error' ? 'text-red-400' : 'text-gray-500'}`}>
                    {file.status === 'uploading' ? 'Uploading & indexing...'
                      : file.status === 'done' ? '✓ Indexed'
                      : file.status === 'error' ? `✗ ${file.errorMsg || 'Error'}`
                      : file.status}
                  </span>
                  <span className="text-gray-600 text-xs">{file.size}</span>
                </div>
              </div>
              {file.status === 'done'
                ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                : file.status === 'error'
                ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                : file.status === 'uploading'
                ? <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                : <button onClick={() => setFiles(f => f.filter(x => x.id !== file.id))} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
