"use client";

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LogEntry } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export function useLogData(refreshInterval = 10000) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/log`, {
        headers: { Accept: 'application/json' },
        validateStatus: () => true, // allow inspecting all responses
      });
      const contentType = response.headers['content-type'] || '';

      // 🔑 Detect Cloudflare HTML page
      if (contentType.includes('text/html')) {
        console.warn('Cloudflare verification required.');
        window.location.href = '/verify';
        return;
      }

      if (response.data.success) {
        setLogs(response.data.message);
        if (response.data.message.length > 0 && !selectedLog) {
          setSelectedLog(response.data.message[0]);
        }
        setError(null);
      }
      else {
        if (response.status === 401) {
          setError('Session expired. Refreshing page in 5 seconds...');
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        } else {
          setError(response.data.message || 'Failed to fetch logs. Please try again later.');
          setTimeout(() => {
            setError(null);
          }, 5000);
        }
      }
    } catch (err) {
      setError('Failed to fetch logs. Please try again later.');
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLog]);

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

    const intervalId = setInterval(() => {
      fetchLogs();
    }, refreshInterval);

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
    refreshLogs: fetchLogs
  };
}