'use client';

import { useState, useRef } from 'react';
import { Upload, Video, X, CheckCircle, AlertCircle, Link as LinkIcon, FolderOpen } from 'lucide-react';

type UploadItem = { id: string; name: string; size: string; progress: number; status: 'uploading' | 'processing' | 'done' | 'error' };

const formatBytes = (b: number) => b < 1e6 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1e9).toFixed(2)} GB`;

export default function VideoUploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newItems: UploadItem[] = Array.from(fileList).map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: formatBytes(f.size),
      progress: 0,
      status: 'uploading',
    }));
    setItems(prev => [...prev, ...newItems]);
    newItems.forEach(item => {
      let p = 0;
      const iv = setInterval(() => {
        p += Math.random() * 15;
        if (p >= 100) {
          clearInterval(iv);
          setItems(prev => prev.map(x => x.id === item.id ? { ...x, progress: 100, status: 'processing' } : x));
          setTimeout(() => setItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'done' } : x)), 3000);
        } else {
          setItems(prev => prev.map(x => x.id === item.id ? { ...x, progress: Math.min(p, 100) } : x));
        }
      }, 400);
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Video</h1>
        <p className="text-gray-400 text-sm mt-1">Upload videos to your knowledge base — they'll be transcribed and indexed for AI search</p>
      </div>

      <div className="flex gap-1 bg-gray-900 border border-white/10 rounded-xl p-1 w-fit">
        {([['file', 'Upload File'], ['url', 'Import URL']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>{label}</button>
        ))}
      </div>

      {tab === 'file' ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${dragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/15 hover:border-indigo-500/50'}`}
        >
          <input ref={inputRef} type="file" multiple accept="video/*,.mp4,.mov,.avi,.mkv,.webm" className="hidden" onChange={e => addFiles(e.target.files)} />
          <Video className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-white font-semibold">Drop video files here or click to browse</p>
          <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI, MKV, WebM — up to 10 GB per file</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Video URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="YouTube, Loom, Vimeo, or direct MP4 URL" className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">Import</button>
            </div>
          </div>
          <p className="text-gray-600 text-xs">Supports YouTube (public), Loom, Vimeo, and direct video file URLs</p>
        </div>
      )}

      {/* Processing options */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm">Processing Options</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Add to Collection</label>
            <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
              <option value="">No collection</option>
              {['Engineering Docs', 'HR Policies', 'Sales Playbooks', 'Product & Design'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Language</label>
            <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
              <option>Auto-detect</option>
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
              <option>Japanese</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['Generate transcript', true],
            ['Generate AI chapters', true],
            ['Generate AI summary', true],
          ].map(([label, checked]) => (
            <label key={label as string} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked={!!checked} className="rounded" />
              <span className="text-gray-400 text-sm">{label as string}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Upload list */}
      {items.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-sm">Uploads ({items.length})</h3>
          {items.map(item => (
            <div key={item.id} className="bg-gray-900 border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <Video className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{item.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  {item.status !== 'done' && (
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.status === 'processing' ? 'bg-amber-500 animate-pulse w-full' : 'bg-indigo-500'}`}
                        style={{ width: item.status === 'processing' ? '100%' : `${item.progress}%` }}
                      />
                    </div>
                  )}
                  <span className={`text-xs flex-shrink-0 ${item.status === 'done' ? 'text-green-400' : item.status === 'error' ? 'text-red-400' : 'text-gray-500'}`}>
                    {item.status === 'uploading' ? `${Math.round(item.progress)}%` : item.status === 'processing' ? 'Transcribing…' : item.status === 'done' ? '✓ Ready' : '✗ Error'}
                  </span>
                  <span className="text-gray-600 text-xs">{item.size}</span>
                </div>
              </div>
              {item.status === 'done' ? <CheckCircle className="w-4 h-4 text-green-400" /> : item.status === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> : <button onClick={() => setItems(i => i.filter(x => x.id !== item.id))} className="text-gray-600 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
