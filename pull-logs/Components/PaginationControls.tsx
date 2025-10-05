"use client";

import { PaginationInfo } from "@/types";

interface PaginationControlsProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export default function PaginationControls({
  pagination,
  onPageChange,
  disabled = false
}: PaginationControlsProps) {
  // Generate array of page numbers to show
  const getPageNumbers = () => {
    const { page, totalPages } = pagination;
    const pages: (number | string)[] = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate start and end of page range around current page
    let start = Math.max(2, page - 1);
    let end = Math.min(totalPages - 1, page + 1);
    
    // Adjust for edge cases
    if (page <= 3) {
      end = Math.min(totalPages - 1, 4);
    }
    if (page >= totalPages - 2) {
      start = Math.max(2, totalPages - 3);
    }
    
    // Add ellipsis after first page if needed
    if (start > 2) {
      pages.push("...");
    }
    
    // Add pages in the middle
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (end < totalPages - 1) {
      pages.push("...");
    }
    
    // Always show last page if more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  const pageNumbers = pagination.totalPages > 0 ? getPageNumbers() : [];

  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center mt-6 space-x-1">
      <button
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={!pagination.hasPrevPage || disabled}
        className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          ></path>
        </svg>
      </button>

      {pageNumbers.map((pageNum, index) => (
        <button
          key={index}
          onClick={() => typeof pageNum === 'number' ? onPageChange(pageNum) : null}
          disabled={typeof pageNum !== 'number' || pageNum === pagination.page || disabled}
          className={`px-3 py-1 rounded-lg border ${
            pageNum === pagination.page
              ? 'bg-blue-600 text-white border-blue-600'
              : typeof pageNum === 'number'
              ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              : 'bg-transparent border-transparent text-gray-500 cursor-default'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {pageNum}
        </button>
      ))}

      <button
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={!pagination.hasNextPage || disabled}
        className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5l7 7-7 7"
          ></path>
        </svg>
      </button>
    </div>
  );
}