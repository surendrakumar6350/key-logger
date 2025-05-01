"use client";

import { LogEntry } from '../types';

interface LogDetailProps {
  log: LogEntry | null;
  isLoading: boolean;
}

export default function LogDetail({ log, isLoading }: LogDetailProps) {
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col w-full max-w-md">
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-full mb-3"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6 mb-3"></div>
          <div className="h-4 bg-gray-700 rounded w-4/6 mb-3"></div>
          <div className="h-20 bg-gray-700 rounded w-full mb-4"></div>
        </div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        <p>Select a log to view details</p>
      </div>
    );
  }

  // Function to format values for display
  const formatValues = (values: string) => {
    if (values.includes('fileUpload')) {
      const filename = values.split('\\').pop();
      return (
        <div>
          <span className="text-blue-400 font-medium">File Upload</span>
          <p className="mt-2 text-gray-300">{filename}</p>
        </div>
      );
    }
    return values;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Log Details</h2>
        <p className="text-gray-400">{log.timestamp}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">User</h3>
          <p className="text-white">{log.user}</p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">IP Address</h3>
          <p className="text-white">{log.ip}</p>
        </div>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Page</h3>
        <p className="text-white break-all">{log.page}</p>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Values</h3>
        <div className="text-white break-all">
          {formatValues(log.values)}
        </div>
      </div>
    </div>
  );
}