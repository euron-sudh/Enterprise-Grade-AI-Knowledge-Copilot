import apiClient from './client';

import type {
  SavedSearch,
  SearchFilter,
  SearchResponse,
  TrendingSearch,
} from '@/types';

export async function search(params: {
  query: string;
  filters?: SearchFilter[];
  page?: number;
  pageSize?: number;
  types?: string[];
}): Promise<SearchResponse> {
  const { data } = await apiClient.post<SearchResponse>('/search', params);
  return data;
}

export async function getSuggestions(query: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/search/suggestions', {
    params: { q: query },
  });
  return data;
}

export async function saveSearch(payload: {
  query: string;
  filters?: SearchFilter[];
  name: string;
}): Promise<SavedSearch> {
  const { data } = await apiClient.post<SavedSearch>('/search/saved', payload);
  return data;
}

export async function getSavedSearches(): Promise<SavedSearch[]> {
  const { data } = await apiClient.get<SavedSearch[]>('/search/saved');
  return data;
}

export async function deleteSavedSearch(id: string): Promise<void> {
  await apiClient.delete(`/search/saved/${id}`);
}

export async function getTrending(): Promise<TrendingSearch[]> {
  const { data } = await apiClient.get<TrendingSearch[]>('/search/trending');
  return data;
}
