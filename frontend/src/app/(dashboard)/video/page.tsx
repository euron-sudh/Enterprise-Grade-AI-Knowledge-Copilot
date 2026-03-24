'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Video,
  Upload,
  Play,
  Clock,
  Eye,
  Plus,
  Search,
  Captions,
  BookOpen,
  Calendar,
  Zap,
  Loader2,
  X,
  FileVideo,
  RefreshCw,
} from 'lucide-react';

type VideoCategory = 'All' | 'Meetings' | 'Training' | 'Product Demo' | 'Other';

interface VideoItem {
  id: string;
  title: string;
  duration: string;
  uploadedAt: string;
  views: number;
  category: VideoCategory;
  thumbnail: string;
  hasTranscript: boolean;
  hasChapters: boolean;
  description: string;
  fileSize?: string;
}

const CATEGORY_TABS: VideoCategory[] = ['All', 'Meetings', 'Training', 'Product Demo', 'Other'];

const GRADIENT_THUMBNAILS = [
  'from-blue-800 to-indigo-900',
  'from-violet-800 to-purple-900',
  'from-rose-800 to-pink-900',
  'from-emerald-800 to-teal-900',
  'from-amber-800 to-orange-900',
  'from-cyan-800 to-sky-900',
];

function formatBytes(bytes: number) {
  if (!bytes) return '';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function docToVideo(doc: any, idx: number): VideoItem {
  return {
    id: doc.id,
    title: doc.title || doc.fileName || 'Untitled Video',
    duration: '—',
    uploadedAt: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
    views: 0,
    category: 'Other',
    thumbnail: GRADIENT_THUMBNAILS[idx % GRADIENT_THUMBNAILS.length],
    hasTranscript: doc.status === 'indexed',
    hasChapters: false,
    description: doc.description || '',
    fileSize: doc.fileSizeBytes ? formatBytes(doc.fileSizeBytes) : '',
  };
}

export default function VideoPage() {
  const { data: session } = useSession();
  const [category, setCategory] = useState<VideoCategory>('All');
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const authHeader = session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};

  const fetchVideos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/backend/knowledge/documents?limit=50', { headers: authHeader });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const docs: any[] = Array.isArray(data) ? data : data.documents || data.items || [];
      // Filter to video file types
      const videoDocs = docs.filter(d => {
        const name = (d.fileName || d.title || '').toLowerCase();
        return name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.avi') ||
          name.endsWith('.webm') || name.endsWith('.mkv') || name.endsWith('.m4v');
      });
      setVideos(videoDocs.map(docToVideo));
    } catch {
      setError('Failed to load videos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideos(); }, []);

  const uploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      const form = new FormData();
      Array.from(files).forEach(f => form.append('files', f));
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 10, 90));
      }, 300);
      const res = await fetch('/api/backend/knowledge/documents', {
        method: 'POST',
        headers: authHeader,
        body: form,
      });
      clearInterval(progressInterval);
      setUploadProgress(100);
      if (!res.ok) throw new Error('Upload failed');
      setShowUpload(false);
      setTimeout(() => { fetchVideos(); setUploadProgress(0); }, 800);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const filtered = videos.filter(v => {
    const matchCat = category === 'All' || v.category === category;
    const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-full bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Video Library</h1>
          <p className="mt-1 text-sm text-gray-400">Upload and search video content with AI-powered transcription</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchVideos} className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Upload className="h-4 w-4" /> Upload Video
          </button>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="mb-6 rounded-xl border border-dashed border-indigo-600 bg-indigo-900/10 p-6 text-center">
          <FileVideo className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-white mb-1">Upload Video Files</p>
          <p className="text-xs text-gray-400 mb-4">Supports MP4, MOV, AVI, WebM, MKV (up to 10GB)</p>
          {uploading ? (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-gray-400">Uploading... {uploadProgress}%</p>
            </div>
          ) : (
            <>
              <input ref={fileRef} type="file" accept="video/*" multiple onChange={uploadVideo}
                className="hidden" id="video-upload" />
              <label htmlFor="video-upload"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer">
                <Plus className="h-4 w-4" /> Choose Files
              </label>
            </>
          )}
          <button onClick={() => setShowUpload(false)} className="ml-3 text-xs text-gray-500 hover:text-gray-300">Cancel</button>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      {/* Search + filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search videos..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-700 bg-gray-800 p-0.5">
          {CATEGORY_TABS.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${category === c ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 p-12 text-center">
          <Video className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-1">No videos yet</p>
          <p className="text-gray-600 text-xs mb-3">Upload your first video to get AI transcription and search</p>
          <button onClick={() => setShowUpload(true)} className="text-sm text-indigo-400 hover:text-indigo-300">
            Upload a video →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(v => (
            <div key={v.id} className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden hover:border-gray-700 transition-colors group">
              {/* Thumbnail */}
              <div className={`relative h-40 bg-gradient-to-br ${v.thumbnail} flex items-center justify-center`}>
                <button className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-5 w-5 ml-0.5" />
                </button>
                <div className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                  {v.duration}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-white leading-snug mb-1 line-clamp-2">{v.title}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{v.uploadedAt}</span>
                  {v.fileSize && <span>{v.fileSize}</span>}
                </div>
                <div className="flex gap-1 mt-2">
                  {v.hasTranscript && (
                    <span className="flex items-center gap-0.5 rounded-full bg-indigo-900/40 px-1.5 py-0.5 text-xs text-indigo-400">
                      <Captions className="h-2.5 w-2.5" /> Transcript
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
