"use client";

import { useState, useEffect } from 'react';
import LogItem from './LogItem';
import LogDetail from './LogDetail';
import SearchBar from './SearchBar';
import { useLogData } from '@/hooks/useLogData';

export default function LogViewer() {
  const {
    filteredLogs,
    selectedLog,
    setSelectedLog,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refreshLogs
  } = useLogData();
  
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set the latest log as selected when logs are loaded
  useEffect(() => {
    if (filteredLogs.length > 0 && !selectedLog) {
      setSelectedLog(filteredLogs[0]);
    }
  }, [filteredLogs, selectedLog, setSelectedLog]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Main content area */}
     <div className="w-full md:w-2/3 p-6 overflow-y-auto order-2 md:order-1 min-h-[50vh] md:min-h-0 bg-gray-950"> 
        {error && (
          <div className="bg-red-900/50 border border-red-700 p-4 rounded-lg mb-6 text-red-200">
            {error}
          </div>
        )}
        
        <LogDetail log={selectedLog} isLoading={isLoading} />
      </div>
      
      {/* Sidebar with logs list */}
      <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-gray-800 bg-gray-900 flex flex-col order-1 md:order-2 max-h-[50vh] md:max-h-screen">
        <div className="p-4 border-b border-gray-800">
          <SearchBar 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoading={isLoading}
            onRefresh={refreshLogs}
          />
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-white">Activity Logs</h2>
            <span className="text-sm text-gray-400">{filteredLogs.length} logs</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredLogs.length > 0 ? (
            filteredLogs.map(log => (
              <LogItem
                key={log._id}
                log={log}
                isSelected={selectedLog?._id === log._id}
                onClick={() => setSelectedLog(log)}
              />
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              {isLoading ? 'Loading logs...' : 'No logs found'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}