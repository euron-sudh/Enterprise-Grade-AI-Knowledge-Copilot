export type ConnectorType =
  | 'google_drive'
  | 'sharepoint'
  | 'onedrive'
  | 'confluence'
  | 'notion'
  | 'jira'
  | 'github'
  | 'gitlab'
  | 'slack'
  | 'teams'
  | 'salesforce'
  | 'hubspot'
  | 'zendesk'
  | 'intercom'
  | 'dropbox'
  | 'box'
  | 'figma'
  | 'linear'
  | 'asana'
  | 'trello'
  | 'airtable'
  | 'web_scraper'
  | 'rss_feed'
  | 's3';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'paused';

export type DocumentType =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'pptx'
  | 'xlsx'
  | 'txt'
  | 'md'
  | 'html'
  | 'csv'
  | 'json'
  | 'image'
  | 'video'
  | 'audio';

export type ProcessingStatus = 'pending' | 'processing' | 'indexed' | 'failed';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  mimeType: string;
  url?: string;
  thumbnailUrl?: string;
  collectionId?: string;
  collectionName?: string;
  connectorId?: string;
  connectorType?: ConnectorType;
  processingStatus: ProcessingStatus;
  chunkCount: number;
  tokenCount: number;
  language?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
}

export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  pageNumber?: number;
  position: number;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  documentCount: number;
  totalSize: number;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Connector {
  id: string;
  type: ConnectorType;
  name: string;
  description: string;
  logoUrl: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  nextSyncAt?: string;
  documentCount: number;
  errorMessage?: string;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeStats {
  totalDocuments: number;
  totalChunks: number;
  totalTokens: number;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  connectorCount: number;
  activeConnectors: number;
  lastUpdatedAt: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'queued' | 'uploading' | 'processing' | 'done' | 'error';
  errorMessage?: string;
}
