import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useSearch, useSearchSuggestions } from '@/hooks/useSearch';
import * as searchApi from '@/lib/api/search';
import type { SearchResponse } from '@/types';

// Mock the search API
vi.mock('@/lib/api/search', () => ({
  search: vi.fn(),
  getSuggestions: vi.fn(),
  getTrending: vi.fn(),
  saveSearch: vi.fn(),
  getSavedSearches: vi.fn(),
  deleteSavedSearch: vi.fn(),
}));

const mockSearchResponse: SearchResponse = {
  query: 'test',
  results: [
    {
      id: 'result-1',
      type: 'document',
      title: 'Test Document',
      excerpt: 'This is a test excerpt',
      relevanceScore: 0.95,
      highlights: ['<mark>test</mark> excerpt'],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 20,
  facets: [],
  suggestions: [],
  processingTimeMs: 45,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialises with empty query', () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    expect(result.current.query).toBe('');
    expect(result.current.filters).toEqual([]);
    expect(result.current.page).toBe(1);
  });

  it('updates query when setQuery is called', () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    act(() => {
      result.current.setQuery('hello');
    });
    expect(result.current.query).toBe('hello');
  });

  it('does not search when query is less than 2 characters', () => {
    vi.mocked(searchApi.search).mockResolvedValue(mockSearchResponse);
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    act(() => {
      result.current.setQuery('a');
    });
    // Query is 1 char, search should not be triggered
    expect(searchApi.search).not.toHaveBeenCalled();
  });

  it('fires search after debounce when query >= 2 chars', async () => {
    vi.useFakeTimers();
    vi.mocked(searchApi.search).mockResolvedValue(mockSearchResponse);

    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.setQuery('te');
    });

    // Advance debounce timer
    act(() => {
      vi.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(searchApi.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'te' })
      );
    });

    vi.useRealTimers();
  });

  it('adds a filter', () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    act(() => {
      result.current.addFilter({ field: 'type', operator: 'eq', value: 'pdf' });
    });
    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0]?.field).toBe('type');
  });

  it('replaces existing filter for same field', () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    act(() => {
      result.current.addFilter({ field: 'type', operator: 'eq', value: 'pdf' });
      result.current.addFilter({ field: 'type', operator: 'eq', value: 'docx' });
    });
    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0]?.value).toBe('docx');
  });

  it('removes a filter', () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    act(() => {
      result.current.addFilter({ field: 'type', operator: 'eq', value: 'pdf' });
      result.current.removeFilter('type');
    });
    expect(result.current.filters).toHaveLength(0);
  });

  it('clears all filters', () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    act(() => {
      result.current.addFilter({ field: 'type', operator: 'eq', value: 'pdf' });
      result.current.addFilter({ field: 'source', operator: 'eq', value: 'slack' });
      result.current.clearFilters();
    });
    expect(result.current.filters).toHaveLength(0);
  });

  it('resets page to 1 when filters change', () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    act(() => {
      result.current.setPage(3);
      result.current.addFilter({ field: 'type', operator: 'eq', value: 'pdf' });
    });
    expect(result.current.page).toBe(1);
  });
});

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch suggestions when query < 2 chars', () => {
    vi.mocked(searchApi.getSuggestions).mockResolvedValue(['suggestion1']);
    renderHook(() => useSearchSuggestions('a'), { wrapper: createWrapper() });
    expect(searchApi.getSuggestions).not.toHaveBeenCalled();
  });

  it('fetches suggestions when query >= 2 chars', async () => {
    vi.mocked(searchApi.getSuggestions).mockResolvedValue(['test doc', 'test report']);

    const { result } = renderHook(() => useSearchSuggestions('te'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(['test doc', 'test report']);
    });

    expect(searchApi.getSuggestions).toHaveBeenCalledWith('te');
  });
});
