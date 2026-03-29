'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import * as searchApi from '@/lib/api/search';
import type { SearchFilter, SearchResponse } from '@/types';

export function useSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [page, setPage] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const searchResult = useQuery<SearchResponse>({
    queryKey: ['search', debouncedQuery, filters, page],
    queryFn: () =>
      searchApi.search({ query: debouncedQuery, filters, page, pageSize: 20 }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const addFilter = useCallback((filter: SearchFilter) => {
    setFilters((prev) => {
      const exists = prev.findIndex((f) => f.field === filter.field);
      if (exists !== -1) {
        const next = [...prev];
        next[exists] = filter;
        return next;
      }
      return [...prev, filter];
    });
    setPage(1);
  }, []);

  const removeFilter = useCallback((field: string) => {
    setFilters((prev) => prev.filter((f) => f.field !== field));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
    setPage(1);
  }, []);

  return {
    query,
    setQuery,
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    page,
    setPage,
    ...searchResult,
  };
}

export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: () => searchApi.getSuggestions(query),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}

export function useTrending() {
  return useQuery({
    queryKey: ['trending-searches'],
    queryFn: searchApi.getTrending,
    staleTime: 5 * 60_000,
  });
}
