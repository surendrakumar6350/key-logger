"use client";

import { LogEntry } from '../types';
import { cn } from '@/lib/utils';

interface LogItemProps {
  log: LogEntry;
  isSelected: boolean;
  onClick: () => void;
}

export default function LogItem({ log, isSelected, onClick }: LogItemProps) {
  // Extract domain from URL for cleaner display
  const getDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return domain;
    } catch {
      return url;
    }
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-3 border-b border-gray-800 transition-colors duration-200 cursor-pointer",
        "hover:bg-gray-800 group animate-in fade-in",
        isSelected ? "bg-gray-800" : "bg-transparent"
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-medium text-gray-200">{log.user}</span>
        <span className="text-xs text-gray-400">{log.timestamp}</span>
      </div>
      <div className="text-sm text-gray-400 truncate">
        {log.values.includes('fileUpload') ? (
          <span className="text-blue-400">📁 File Upload</span>
        ) : (
          log.values.substring(0, 40) + (log.values.length > 40 ? '...' : '')
        )}
      </div>
      <div className="text-xs text-gray-500 mt-1 truncate">
        {getDomain(log.page)}
      </div>
    </div>
  );
}