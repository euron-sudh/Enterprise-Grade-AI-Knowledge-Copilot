'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api/token';
import { Upload, Video, X, CheckCircle, AlertCircle, Link as LinkIcon, Loader2 } from 'lucide-react';

type UploadItem = {
  id: string;
  name: string;
  size: string;
  status: 'uploading' | 'done' | 'error';
  errorMsg?: string;
};

const formatBytes = (b: number) =>
  b < 1e6 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1e6).toFixed(1)} MB`;

export default function VideoUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  const uploadVideo = async (file: File, id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'uploading' } : i));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authFetch(
        '/api/backend/knowledge/videos/upload',
        { method: 'POST', body: formData },
        session?.accessToken,
        getUser(),
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Upload failed (${res.status})`);
      }
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'done' } : i));
    } catch (e: any) {
      setItems(prev => prev.map(i =>
        i.id === id ? { ...i, status: 'error', errorMsg: e?.message || 'Upload failed' } : i
      ));
    }
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newItems: UploadItem[] = Array.from(fileList).map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      size: formatBytes(f.size),
      status: 'uploading',
    }));
    setItems(prev => [...prev, ...newItems]);
    newItems.forEach(item => {
      const file = Array.from(fileList).find(f => f.name === item.name)!;
      void uploadVideo(file, item.id);
    });
  };

  const importUrl = async () => {
    if (!url.trim()) return;
    setUrlLoading(true);
    setUrlError('');
    try {
      const res = await authFetch(
        '/api/backend/knowledge/videos/upload-url',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        },
        session?.accessToken,
        getUser(),
      );
      if (!res.ok) throw new Error(`Failed to import (${res.status})`);
      setUrl('');
      router.push('/video');
    } catch (e: any) {
      setUrlError(e?.message || 'Import failed');
    } finally {
      setUrlLoading(false);
    }
  };

  const doneCount = items.filter(i => i.status === 'done').length;
  const hasActive = items.some(i => i.status === 'uploading');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Video</h1>
        <p className="text-gray-400 text-sm mt-1">Upload videos to your knowledge base — they'll be transcribed and indexed for AI search</p>
      </div>

      <div className="flex gap-1 bg-gray-900 border border-white/10 rounded-xl p-1 w-fit">
        {([['file', 'Upload File'], ['url', 'Import URL']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'file' ? (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${dragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/15 hover:border-indigo-500/50'}`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.m4a"
              className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
            />
            <Video className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-white font-semibold">Drop video files here or click to browse</p>
            <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI, MKV, WebM, MP3, WAV — up to 100 MB per file</p>
            <p className="text-gray-600 text-xs mt-2">Files are transcribed with AI and indexed for search</p>
          </div>

          {doneCount > 0 && !hasActive && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-900/20 border border-emerald-800 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-300 text-sm font-medium">{doneCount} video{doneCount > 1 ? 's' : ''} uploaded and indexed successfully</p>
              <button onClick={() => router.push('/video')} className="ml-auto text-xs text-emerald-400 hover:text-emerald-300 underline">
                View in Video Library →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Video URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void importUrl(); }}
                  placeholder="YouTube, Loom, Vimeo, or direct MP4 URL"
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
          <p className="text-gray-600 text-xs">Supports direct video file URLs (MP4, MOV, etc.)</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-sm">Uploads ({items.length})</h3>
          {items.map(item => (
            <div key={item.id} className="bg-gray-900 border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <Video className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{item.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  {item.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />}
                  <span className={`text-xs ${item.status === 'done' ? 'text-emerald-400' : item.status === 'error' ? 'text-red-400' : 'text-gray-500'}`}>
                    {item.status === 'uploading' ? 'Uploading & transcribing...'
                      : item.status === 'done' ? '✓ Indexed'
                      : `✗ ${item.errorMsg || 'Error'}`}
                  </span>
                  <span className="text-gray-600 text-xs">{item.size}</span>
                </div>
              </div>
              {item.status === 'done'
                ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                : item.status === 'error'
                ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                : item.status === 'uploading'
                ? <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                : <button onClick={() => setItems(i => i.filter(x => x.id !== item.id))} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
