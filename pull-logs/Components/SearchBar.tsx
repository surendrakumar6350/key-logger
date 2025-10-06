"use client";

import { useState, useEffect, KeyboardEvent } from 'react';
import MonthSelector from './MonthSelector';

interface MonthOption {
  label: string;
  value: string;
}

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  onSearch: () => void;
  month?: string;
  setMonth?: (month: string) => void;
  availableMonths?: MonthOption[];
}

export default function SearchBar({ 
  searchQuery, 
  setSearchQuery, 
  isLoading, 
  onSearch,
  month,
  setMonth,
  availableMonths = []
}: SearchBarProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row gap-2 mb-4">
      <div className="flex flex-1 gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg 
            className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>
        
        <button
          onClick={onSearch}
          disabled={isLoading}
          className="flex items-center justify-center bg-blue-600 rounded-lg px-4 py-2 text-white hover:bg-blue-700 transition duration-200 disabled:opacity-50"
        >
          {isLoading ? (
            <svg 
              className="animate-spin h-5 w-5 text-white" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              ></circle>
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <span>Search</span>
          )}
        </button>
      </div>
      
      {/* Month selector - only render if prop is provided */}
      {setMonth && availableMonths.length > 0 && (
        <div className="w-full md:w-48">
          <MonthSelector
            month={month || ''}
            setMonth={setMonth}
            availableMonths={availableMonths}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}