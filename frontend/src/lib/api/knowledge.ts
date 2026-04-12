import apiClient from './client';

import type {
  Chunk,
  Collection,
  Connector,
  Document,
  KnowledgeStats,
  PaginatedResponse,
  UploadProgress,
} from '@/types';

export async function listDocuments(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  collectionId?: string;
  connectorType?: string;
  documentType?: string;
  status?: string;
}): Promise<PaginatedResponse<Document>> {
  const { data } = await apiClient.get<PaginatedResponse<Document>>('/knowledge/documents', {
    params,
  });
  return data;
}

export async function getDocument(id: string): Promise<Document> {
  const { data } = await apiClient.get<Document>(`/knowledge/documents/${id}`);
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/knowledge/documents/${id}`);
}

export async function getDocumentChunks(
  documentId: string,
  params?: { page?: number; pageSize?: number }
): Promise<PaginatedResponse<Chunk>> {
  const { data } = await apiClient.get<PaginatedResponse<Chunk>>(
    `/knowledge/documents/${documentId}/chunks`,
    { params }
  );
  return data;
}

async function uploadViaPresignedS3(
  file: File,
  options?: { collectionId?: string },
  onProgress?: (progress: UploadProgress[]) => void,
): Promise<Document[]> {
  // 1. Get presigned URL from backend
  const { data: urlData } = await apiClient.get<{
    uploadUrl: string; s3Key: string; bucket: string;
  }>('/knowledge/documents/presigned-upload', {
    params: { filename: file.name, content_type: file.type || 'application/octet-stream' },
  });

  // 2. Upload directly to S3 (bypasses Lambda proxy — no body size limit)
  onProgress?.([{ fileId: 'file-0', fileName: file.name, progress: 10, status: 'uploading' }]);
  const uploadRes = await fetch(urlData.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`);
  onProgress?.([{ fileId: 'file-0', fileName: file.name, progress: 80, status: 'processing' }]);

  // 3. Register with backend to trigger indexing
  const regForm = new FormData();
  regForm.append('s3_key', urlData.s3Key);
  regForm.append('filename', file.name);
  regForm.append('file_size', String(file.size));
  regForm.append('content_type', file.type || 'application/octet-stream');
  if (options?.collectionId) regForm.append('collectionId', options.collectionId);
  const { data } = await apiClient.post<Document[]>('/knowledge/documents/register-s3', regForm);
  onProgress?.([{ fileId: 'file-0', fileName: file.name, progress: 100, status: 'done' }]);
  return data;
}

export async function uploadDocuments(
  files: File[],
  options?: { collectionId?: string; tags?: string[] },
  onProgress?: (progress: UploadProgress[]) => void
): Promise<Document[]> {
  // For large files (>3 MB), use presigned S3 upload to bypass Lambda body limit.
  // For small files, use the standard proxy route (faster, no extra round-trips).
  const LARGE_FILE_THRESHOLD = 3 * 1024 * 1024; // 3 MB
  const largeFiles = files.filter(f => f.size > LARGE_FILE_THRESHOLD);
  const smallFiles = files.filter(f => f.size <= LARGE_FILE_THRESHOLD);

  const results: Document[] = [];

  // Upload large files via presigned S3
  for (const file of largeFiles) {
    try {
      const docs = await uploadViaPresignedS3(file, options, onProgress);
      results.push(...docs);
    } catch {
      // Fallback to proxy if S3 unavailable
      const formData = new FormData();
      formData.append('files', file);
      if (options?.collectionId) formData.append('collectionId', options.collectionId);
      const { data } = await apiClient.post<Document[]>('/knowledge/documents/upload', formData);
      results.push(...data);
    }
  }

  // Upload small files via proxy
  if (smallFiles.length > 0) {
    const formData = new FormData();
    smallFiles.forEach((file) => formData.append('files', file));
    if (options?.collectionId) formData.append('collectionId', options.collectionId);
    if (options?.tags) formData.append('tags', JSON.stringify(options.tags));

    const { data } = await apiClient.post<Document[]>('/knowledge/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(
            smallFiles.map((f, i) => ({
              fileId: `file-${i}`,
              fileName: f.name,
              progress: percent,
              status: percent < 100 ? 'uploading' : 'processing',
            }))
          );
        }
      },
    });
    results.push(...data);
  }

  return results;
}

export async function listCollections(): Promise<Collection[]> {
  const { data } = await apiClient.get<Collection[]>('/knowledge/collections');
  return data;
}

export async function createCollection(payload: {
  name: string;
  description?: string;
  color?: string;
}): Promise<Collection> {
  const { data } = await apiClient.post<Collection>('/knowledge/collections', payload);
  return data;
}

export async function listConnectors(): Promise<Connector[]> {
  const { data } = await apiClient.get<Connector[]>('/knowledge/connectors');
  return data;
}

export async function addConnector(payload: {
  type: string;
  name: string;
  config: Record<string, unknown>;
}): Promise<Connector> {
  const { data } = await apiClient.post<Connector>('/knowledge/connectors', payload);
  return data;
}

export async function syncConnector(connectorId: string): Promise<unknown> {
  const { data } = await apiClient.post(`/knowledge/connectors/${connectorId}/sync`);
  return data;
}

export async function deleteConnector(connectorId: string): Promise<void> {
  await apiClient.delete(`/knowledge/connectors/${connectorId}`);
}

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  const { data } = await apiClient.get<KnowledgeStats>('/knowledge/stats');
  return data;
}

export async function downloadDocument(id: string, filename: string): Promise<void> {
  const response = await apiClient.get(`/knowledge/documents/${id}/download`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
