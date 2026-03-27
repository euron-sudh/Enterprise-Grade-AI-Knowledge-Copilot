'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, FolderOpen, Link as LinkIcon } from 'lucide-react';

type UploadFile = {
  id: string;
  name: string;
  size: string;
  type: string;
  progress: number;
  status: 'uploading' | 'processing' | 'done' | 'error';
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [collection, setCollection] = useState('');
  const [tab, setTab] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: UploadFile[] = Array.from(fileList).map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: formatBytes(f.size),
      type: f.name.split('.').pop()?.toUpperCase() || 'FILE',
      progress: 0,
      status: 'uploading',
    }));
    setFiles(prev => [...prev, ...newFiles]);
    // Simulate upload progress
    newFiles.forEach(f => {
      let p = 0;
      const iv = setInterval(() => {
        p += Math.random() * 25;
        if (p >= 100) {
          p = 100;
          clearInterval(iv);
          setFiles(prev => prev.map(x => x.id === f.id ? { ...x, progress: 100, status: 'processing' } : x));
          setTimeout(() => {
            setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'done' } : x));
          }, 1500);
        } else {
          setFiles(prev => prev.map(x => x.id === f.id ? { ...x, progress: Math.min(p, 100) } : x));
        }
      }, 300);
    });
  };

  const TYPES_MAP: Record<string, string> = { PDF: 'bg-red-500/20 text-red-400', DOCX: 'bg-blue-500/20 text-blue-400', XLSX: 'bg-green-500/20 text-green-400', PPTX: 'bg-orange-500/20 text-orange-400', MD: 'bg-gray-700 text-gray-300' };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Documents</h1>
        <p className="text-gray-400 text-sm mt-1">Add files to your knowledge base — PDFs, Word docs, spreadsheets, and more</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-white/10 rounded-xl p-1 w-fit">
        {([['file', 'Upload Files'], ['url', 'Import URL']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>{label}</button>
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
            <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,.html" className="hidden" onChange={e => addFiles(e.target.files)} />
            <Upload className="w-10 h-10 text-gray-500 mx-auto mb-4" />
            <p className="text-white font-semibold">Drop files here or click to browse</p>
            <p className="text-gray-500 text-sm mt-1">PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, HTML, JSON up to 100MB each</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Add to Collection (optional)</label>
              <select value={collection} onChange={e => setCollection(e.target.value)} className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option value="">No collection</option>
                {['Engineering Docs', 'HR Policies', 'Sales Playbooks', 'Product & Design', 'Legal & Compliance'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Processing Mode</label>
              <select className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option>Auto-detect (recommended)</option>
                <option>OCR (for scanned PDFs)</option>
                <option>Code parsing</option>
                <option>Table extraction</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">URL to Import</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.example.com/guide" className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">Import</button>
            </div>
          </div>
          <p className="text-gray-600 text-xs">Supports web pages, Google Docs (public), Confluence pages, GitHub README files</p>
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
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{file.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPES_MAP[file.type] || 'bg-gray-700 text-gray-400'}`}>{file.type}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {file.status === 'done' ? null : (
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${file.status === 'processing' ? 'bg-amber-500 animate-pulse w-full' : 'bg-indigo-500'}`} style={{ width: file.status === 'processing' ? '100%' : `${file.progress}%` }} />
                    </div>
                  )}
                  <span className={`text-xs flex-shrink-0 ${file.status === 'done' ? 'text-green-400' : file.status === 'error' ? 'text-red-400' : 'text-gray-500'}`}>
                    {file.status === 'uploading' ? `${Math.round(file.progress)}%` : file.status === 'processing' ? 'Indexing…' : file.status === 'done' ? '✓ Done' : '✗ Error'}
                  </span>
                  <span className="text-gray-600 text-xs">{file.size}</span>
                </div>
              </div>
              {file.status === 'done'
                ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                : file.status === 'error'
                ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                : <button onClick={() => setFiles(f => f.filter(x => x.id !== file.id))} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
