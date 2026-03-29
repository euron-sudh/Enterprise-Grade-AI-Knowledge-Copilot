import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { Collection, Connector, Document, SearchResult, UploadProgress } from '@/types';

interface KnowledgeState {
  documents: Document[];
  collections: Collection[];
  connectors: Connector[];
  uploadProgress: Record<string, UploadProgress>;
  searchResults: SearchResult[];
  isSearching: boolean;
  selectedCollectionId: string | null;
  selectedDocumentIds: string[];

  // Actions
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;

  setCollections: (collections: Collection[]) => void;
  addCollection: (collection: Collection) => void;

  setConnectors: (connectors: Connector[]) => void;
  updateConnector: (id: string, updates: Partial<Connector>) => void;

  setUploadProgress: (fileId: string, progress: UploadProgress) => void;
  removeUploadProgress: (fileId: string) => void;
  clearUploadProgress: () => void;

  setSearchResults: (results: SearchResult[]) => void;
  setSearching: (searching: boolean) => void;

  setSelectedCollection: (id: string | null) => void;
  toggleDocumentSelection: (id: string) => void;
  clearDocumentSelection: () => void;
}

export const useKnowledgeStore = create<KnowledgeState>()(
  devtools(
    (set) => ({
      documents: [],
      collections: [],
      connectors: [],
      uploadProgress: {},
      searchResults: [],
      isSearching: false,
      selectedCollectionId: null,
      selectedDocumentIds: [],

      setDocuments: (documents) => set({ documents }),
      addDocument: (document) =>
        set((state) => ({ documents: [document, ...state.documents] })),
      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),
      removeDocument: (id) =>
        set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),

      setCollections: (collections) => set({ collections }),
      addCollection: (collection) =>
        set((state) => ({ collections: [...state.collections, collection] })),

      setConnectors: (connectors) => set({ connectors }),
      updateConnector: (id, updates) =>
        set((state) => ({
          connectors: state.connectors.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      setUploadProgress: (fileId, progress) =>
        set((state) => ({
          uploadProgress: { ...state.uploadProgress, [fileId]: progress },
        })),
      removeUploadProgress: (fileId) =>
        set((state) => {
          const next = { ...state.uploadProgress };
          delete next[fileId];
          return { uploadProgress: next };
        }),
      clearUploadProgress: () => set({ uploadProgress: {} }),

      setSearchResults: (searchResults) => set({ searchResults }),
      setSearching: (isSearching) => set({ isSearching }),

      setSelectedCollection: (selectedCollectionId) => set({ selectedCollectionId }),
      toggleDocumentSelection: (id) =>
        set((state) => ({
          selectedDocumentIds: state.selectedDocumentIds.includes(id)
            ? state.selectedDocumentIds.filter((d) => d !== id)
            : [...state.selectedDocumentIds, id],
        })),
      clearDocumentSelection: () => set({ selectedDocumentIds: [] }),
    }),
    { name: 'kf-knowledge-store' }
  )
);
