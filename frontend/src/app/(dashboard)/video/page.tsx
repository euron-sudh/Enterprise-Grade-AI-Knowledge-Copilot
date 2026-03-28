'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch, getBestToken } from '@/lib/api/token';
import {
  Video,
  Upload,
  Play,
  Plus,
  Search,
  Captions,
  Calendar,
  Loader2,
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
    title: doc.name || 'Untitled Video',
    duration: '—',
    uploadedAt: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
    views: 0,
    category: 'Other',
    thumbnail: GRADIENT_THUMBNAILS[idx % GRADIENT_THUMBNAILS.length] ?? 'from-blue-800 to-indigo-900',
    hasTranscript: doc.status === 'indexed',
    hasChapters: false,
    description: '',
    fileSize: doc.size ? formatBytes(doc.size) : '',
  };
}

export default function VideoPage() {
  const { data: session, status } = useSession();
  const [category, setCategory] = useState<VideoCategory>('All');
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  const fetchVideos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(
        '/api/backend/knowledge/documents?documentType=video&pageSize=50',
        {},
        session?.accessToken,
        getUser(),
      );
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error((msg as any).detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const docs: any[] = data.items || [];
      setVideos(docs.map(docToVideo));
    } catch (e: any) {
      setError(`Failed to load videos: ${e?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchVideos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.accessToken, session?.user?.email]);

  const uploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const videoFile = files?.[0];
    if (!videoFile) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      const form = new FormData();
      form.append('file', videoFile);
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 10, 90));
      }, 300);
      const res = await authFetch(
        '/api/backend/knowledge/videos/upload',
        { method: 'POST', body: form },
        session?.accessToken,
        getUser(),
      );
      clearInterval(progressInterval);
      setUploadProgress(100);
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error((msg as any).detail || 'Upload failed');
      }
      setShowUpload(false);
      setTimeout(() => { fetchVideos(); setUploadProgress(0); }, 800);
    } catch (e: any) {
      setError(`Upload failed: ${e?.message || 'Please try again.'}`);
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
    <div className="min-h-full bg-surface-50 dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Video Library</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-gray-400">Upload and search video content with AI-powered transcription</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => session?.accessToken && fetchVideos(session.accessToken)} className="flex items-center gap-1 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-2 text-sm text-surface-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-surface-900 dark:text-white hover:bg-indigo-700">
            <Upload className="h-4 w-4" /> Upload Video
          </button>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="mb-6 rounded-xl border border-dashed border-indigo-600 bg-indigo-900/10 p-6 text-center">
          <FileVideo className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-surface-900 dark:text-white mb-1">Upload Video Files</p>
          <p className="text-xs text-surface-500 dark:text-gray-400 mb-4">Supports MP4, MOV, AVI, WebM, MKV (up to 10GB)</p>
          {uploading ? (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-surface-200 dark:bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-surface-500 dark:text-gray-400">Uploading... {uploadProgress}%</p>
            </div>
          ) : (
            <>
              <input ref={fileRef} type="file" accept="video/*" multiple onChange={uploadVideo}
                className="hidden" id="video-upload" />
              <label htmlFor="video-upload"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-surface-900 dark:text-white hover:bg-indigo-700 cursor-pointer">
                <Plus className="h-4 w-4" /> Choose Files
              </label>
            </>
          )}
          <button onClick={() => setShowUpload(false)} className="ml-3 text-xs text-surface-400 dark:text-gray-500 hover:text-surface-600 dark:hover:text-gray-300">Cancel</button>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      {/* Search + filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 dark:text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search videos..."
            className="w-full rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 pl-9 pr-4 py-2 text-sm text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="flex gap-1 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 p-0.5">
          {CATEGORY_TABS.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${category === c ? 'bg-surface-200 dark:bg-gray-700 text-surface-900 dark:text-white' : 'text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:hover:text-white'}`}>
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
        <div className="rounded-xl border border-dashed border-surface-300 dark:border-gray-700 p-12 text-center">
          <Video className="h-10 w-10 text-surface-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-surface-500 dark:text-gray-400 text-sm mb-1">No videos yet</p>
          <p className="text-surface-400 dark:text-gray-600 text-xs mb-3">Upload your first video to get AI transcription and search</p>
          <button onClick={() => setShowUpload(true)} className="text-sm text-indigo-400 hover:text-indigo-300">
            Upload a video →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(v => (
            <div key={v.id} className="rounded-xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:border-surface-300 dark:hover:border-gray-700 transition-colors group">
              {/* Thumbnail */}
              <div className={`relative h-40 bg-gradient-to-br ${v.thumbnail} flex items-center justify-center`}>
                <button className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-surface-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-5 w-5 ml-0.5" />
                </button>
                <div className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-surface-900 dark:text-white">
                  {v.duration}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-surface-900 dark:text-white leading-snug mb-1 line-clamp-2">{v.title}</h3>
                <div className="flex items-center gap-3 text-xs text-surface-400 dark:text-gray-500">
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
