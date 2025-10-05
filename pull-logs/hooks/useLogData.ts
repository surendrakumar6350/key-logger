"use client";

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LogEntry } from '@/types';

export function useLogData({ 
  page: initialPage = 1, 
  limit: initialLimit = 50, 
  date: initialDate = '', 
  refreshInterval = 10000 
}) {
  const today = new Date().toISOString().split('T')[0];
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  // Default to today's date on first load so backend clearly knows it's 'today'
  const [date, setDate] = useState<string>(initialDate || today);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [dataSource, setDataSource] = useState<'database' | 's3'>('database');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateParam = date ? `&date=${date}` : '';
      const response = await axios.get(`/api/log?page=${page}&limit=${limit}${dateParam}`, {
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
        setDataSource(response.data.source || 'database');
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
  }, [page, limit, date]);

  useEffect(() => {
    const filtered = logs.filter(log =>
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.values.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.page.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredLogs(filtered);
  }, [logs, searchQuery]);

  // Reset pagination and selection when date filter changes
  useEffect(() => {
    setPage(1);
    setSelectedLog(null);
  }, [date]);

  useEffect(() => {
    fetchLogs();
    // Auto-refresh only when looking at today's data
    const isToday = date === today;
    const intervalId = isToday ? setInterval(fetchLogs, refreshInterval) : null;
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchLogs, refreshInterval, date, today]);

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
    date,
    setDate,
    dataSource,
  };
}
