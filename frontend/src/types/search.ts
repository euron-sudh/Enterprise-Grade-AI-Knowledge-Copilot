export type SearchResultType =
  | 'document'
  | 'chunk'
  | 'conversation'
  | 'meeting'
  | 'action_item';

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in';
  value: string | string[] | number | boolean;
}

export interface SearchFacet {
  field: string;
  label: string;
  values: FacetValue[];
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  excerpt: string;
  url?: string;
  documentType?: string;
  connectorType?: string;
  collectionName?: string;
  relevanceScore: number;
  highlights: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  facets: SearchFacet[];
  suggestions: string[];
  processingTimeMs: number;
}

export interface SavedSearch {
  id: string;
  query: string;
  filters: SearchFilter[];
  name: string;
  userId: string;
  createdAt: string;
}

export interface TrendingSearch {
  query: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  avgResultsPerQuery: number;
  avgClickPosition: number;
  zeroResultRate: number;
  topQueries: Array<{ query: string; count: number }>;
}
