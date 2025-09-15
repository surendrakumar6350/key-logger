"use client";

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LogEntry } from '@/types';

export function useLogData({ page: initialPage = 1, limit: initialLimit = 50, refreshInterval = 10000 }) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/log?page=${page}&limit=${limit}`, {
        headers: { Accept: 'application/json' },
        validateStatus: () => true,
      });
      const contentType = response.headers['content-type'] || '';

      if (contentType.includes('text/html')) {
        console.warn('Cloudflare verification required.');
        window.location.href = '/verify';
        return;
      }

      if (response.data.success) {
        setLogs(response.data.data);
        setPagination(response.data.pagination);
        const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

        if (!isMobile && response.data.data.length > 0 && !selectedLog) {
          setSelectedLog(response.data.data[0]);
        }
        setError(null);
      } else {
        if (response.status === 401) {
          setError('Session expired. Refreshing page in 5 seconds...');
          setTimeout(() => window.location.reload(), 5000);
        } else {
          setError(response.data.message || 'Failed to fetch logs. Please try again later.');
          setTimeout(() => setError(null), 5000);
        }
      }
    } catch {
      setError('Failed to fetch logs. Please try again later.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedLog]);

  useEffect(() => {
    const filtered = logs.filter(log =>
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.values.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.page.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredLogs(filtered);
  }, [logs, searchQuery]);

  useEffect(() => {
    fetchLogs();
    const intervalId = setInterval(fetchLogs, refreshInterval);
    return () => clearInterval(intervalId);
  }, [fetchLogs, refreshInterval]);

  return {
    logs,
    filteredLogs,
    selectedLog,
    setSelectedLog,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refreshLogs: fetchLogs,
    pagination,
    page,
    setPage,
    limit,
    setLimit,
  };
}
