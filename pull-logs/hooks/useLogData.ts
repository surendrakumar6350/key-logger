"use client";

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LogEntry, LogResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export function useLogData(refreshInterval = 6000) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get<LogResponse>(`${API_URL}/log`);
      if (response.data.success) {
        setLogs(response.data.message);
        if (response.data.message.length > 0 && !selectedLog) {
          setSelectedLog(response.data.message[0]);
        }
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to fetch logs. Please try again later.');
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