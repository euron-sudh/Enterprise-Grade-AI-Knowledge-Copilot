'use client';

import { useCallback, useState } from 'react';

import { useDropzone } from 'react-dropzone';
import { CheckCircle, FileText, Upload, X, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { cn, formatBytes } from '@/lib/utils';
import * as knowledgeApi from '@/lib/api/knowledge';
import type { UploadProgress } from '@/types';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/html': ['.html'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

interface DocumentUploadProps {
  onUploadComplete?: () => void;
  collectionId?: string;
}

export function DocumentUpload({ onUploadComplete, collectionId }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const next = [...prev];
      for (const f of accepted) {
        if (!next.find((existing) => existing.name === f.name)) {
          next.push(f);
        }
      }
      return next;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024, // 50 MB
    maxFiles: 20,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        toast.error(`${r.file.name}: ${r.errors[0]?.message ?? 'Rejected'}`);
      });
    },
  });

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return;
    setIsUploading(true);

    try {
      await knowledgeApi.uploadDocuments(
        files,
        { collectionId },
        (progressArr) => {
          const map: Record<string, UploadProgress> = {};
          progressArr.forEach((p) => (map[p.fileName] = p));
          setProgress(map);
        }
      );
      toast.success(`${files.length} document${files.length > 1 ? 's' : ''} uploaded successfully`);
      setFiles([]);
      setProgress({});
      onUploadComplete?.();
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
          isDragActive
            ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-950'
            : 'border-surface-200 bg-surface-50 hover:border-brand-300 hover:bg-brand-50/30 dark:border-surface-700 dark:bg-surface-800/50 dark:hover:border-brand-600'
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
            isDragActive ? 'bg-brand-100 dark:bg-brand-900' : 'bg-surface-100 dark:bg-surface-700'
          )}
        >
          <Upload
            className={cn(
              'h-7 w-7',
              isDragActive ? 'text-brand-600' : 'text-surface-400'
            )}
          />
        </div>
        {isDragActive ? (
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
            Drop files here...
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Drag &amp; drop files here, or{' '}
              <span className="text-brand-600 dark:text-brand-400">browse</span>
            </p>
            <p className="mt-1 text-xs text-surface-400">
              PDF, DOCX, TXT, MD, HTML, CSV, XLSX, PNG, JPG — up to 50 MB each
            </p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </p>
            <button
              className="text-xs text-surface-400 hover:text-red-500"
              onClick={() => setFiles([])}
            >
              Clear all
            </button>
          </div>

          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-surface-100 bg-white p-2 dark:border-surface-800 dark:bg-surface-900">
            {files.map((file) => {
              const p = progress[file.name];
              return (
                <div
                  key={file.name}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5"
                >
                  <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-surface-800 dark:text-surface-200">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-surface-400">{formatBytes(file.size)}</p>
                    {p && p.status !== 'done' && p.status !== 'error' && (
                      <div className="mt-1 h-1 w-full rounded-full bg-surface-200">
                        <div
                          className="h-1 rounded-full bg-brand-500 transition-all"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {p?.status === 'done' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : p?.status === 'error' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <button
                      className="text-surface-300 hover:text-red-500"
                      onClick={() => removeFile(file.name)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            className="w-full"
            disabled={files.length === 0}
            loading={isUploading}
            onClick={handleUpload}
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}
