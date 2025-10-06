"use client";

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface GlobalSearchParams {
  query?: string;
  page?: number;
  limit?: number;
  month?: string;
}

import { PaginationInfo } from '@/types';

export function useGlobalSearch({
  initialQuery = '',
  initialPage = 1,
  initialLimit = 100,
  initialMonth = ''
}: {
  initialQuery?: string;
  initialPage?: number;
  initialLimit?: number;
  initialMonth?: string;
} = {}) {
  const [query, setQuery] = useState<string>(initialQuery);
  const [page, setPage] = useState<number>(initialPage);
  const [limit] = useState<number>(initialLimit); // Fixed at 100 per page
  const [month, setMonth] = useState<string>(initialMonth);
  
  const [results, setResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [counts, setCounts] = useState<{database: number; s3: number; total: number} | null>(null);
  const [timeMs, setTimeMs] = useState<number>(0);
  
  // For month selection
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
  
  // Generate list of available months (last 12 months)
  const availableMonths = useCallback(() => {
    const months = [];
    let year = currentYear;
    let month = currentMonth;
    
    for (let i = 0; i < 12; i++) {
      const monthStr = month.toString().padStart(2, '0');
      months.push({
        label: `${year}-${monthStr}`,
        value: `${year}-${monthStr}`
      });
      
      month -= 1;
      if (month === 0) {
        month = 12;
        year -= 1;
      }
    }
    
    return months;
  }, [currentYear, currentMonth]);

  const search = useCallback(async (searchParams?: GlobalSearchParams) => {
    if (!searchParams?.query && !query) {
      return; // Don't search with empty query
    }
    
    const searchQuery = searchParams?.query || query;
    const searchPage = searchParams?.page || page;
    const searchLimit = searchParams?.limit || limit;
    const searchMonth = searchParams?.month !== undefined ? searchParams.month : month;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('query', searchQuery);
      params.append('page', searchPage.toString());
      params.append('limit', searchLimit.toString());
      if (searchMonth) {
        params.append('month', searchMonth);
      }
      
      const response = await axios.get(`/api/search?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });

      if (response.data.success) {
        setResults(response.data.data);
        setPagination(response.data.pagination);
        setCounts(response.data.counts);
        setTimeMs(response.data.timeMs);
        
        // Auto-select first result if available and none selected
        if (response.data.data.length > 0 && !selectedResult) {
          setSelectedResult(response.data.data[0]);
        }
        
        // Update state with the actual search parameters used
        if (searchQuery !== query) setQuery(searchQuery);
        if (searchPage !== page) setPage(searchPage);
        if (searchMonth !== month) setMonth(searchMonth);
      } else {
        setError(response.data.message || 'Search failed');
        setResults([]);
        setPagination(null);
        setCounts(null);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to perform search');
      setResults([]);
      setPagination(null);
      setCounts(null);
    } finally {
      setIsLoading(false);
    }
  }, [query, page, limit, month, selectedResult]);

  // Clear selected result when query or month changes
  useEffect(() => {
    setSelectedResult(null);
  }, [query, month]);
  
  // Reset to page 1 when query or month changes
  useEffect(() => {
    setPage(1);
  }, [query, month]);

  return {
    query,
    setQuery,
    page,
    setPage,
    limit,
    month,
    setMonth,
    results,
    selectedResult,
    setSelectedResult,
    isLoading,
    error,
    search,
    pagination,
    counts,
    timeMs,
    availableMonths: availableMonths(),
  };
}