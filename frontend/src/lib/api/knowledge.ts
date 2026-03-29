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

export async function uploadDocuments(
  files: File[],
  options?: { collectionId?: string; tags?: string[] },
  onProgress?: (progress: UploadProgress[]) => void
): Promise<Document[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  if (options?.collectionId) formData.append('collectionId', options.collectionId);
  if (options?.tags) formData.append('tags', JSON.stringify(options.tags));

  const { data } = await apiClient.post<Document[]>('/knowledge/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(
          files.map((f, i) => ({
            fileId: `file-${i}`,
            fileName: f.name,
            progress: percent,
            status: percent < 100 ? 'uploading' : 'processing',
          }))
        );
      }
    },
  });
  return data;
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
