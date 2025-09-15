"use client";

import { useState, useEffect, useRef } from "react";
import LogItem from "./LogItem";
import LogDetail from "./LogDetail";
import SearchBar from "./SearchBar";
import { useLogData } from "@/hooks/useLogData";

export default function LogViewer() {
  const {
    filteredLogs,
    selectedLog,
    setSelectedLog,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refreshLogs,
    pagination,
    page,
    setPage,
    limit,
    setLimit,
  } = useLogData({ page: 1, limit: 20, refreshInterval: 10000 });

  // Two refs: one for desktop, one for mobile
  const desktopListRef = useRef<HTMLDivElement | null>(null);
  const mobileListRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const scrollToTop = () => {
    if (window.innerWidth < 768) {
      // Mobile
      if (mobileListRef.current) {
        mobileListRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      // Desktop
      if (desktopListRef.current) {
        desktopListRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    scrollToTop(); // ✅ always scroll back to top
  };

  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    if (!isMobile && filteredLogs.length > 0 && !selectedLog) {
      setSelectedLog(filteredLogs[0]); // ✅ auto-select only on desktop
    }
  }, [filteredLogs, selectedLog, setSelectedLog]);

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Desktop: side-by-side layout */}
      <div className="hidden md:block w-2/3 p-6 overflow-y-auto bg-gray-950">
        {error && (
          <div className="bg-red-900/50 border border-red-700 p-4 rounded-lg mb-6 text-red-200">
            {error}
          </div>
        )}
        <LogDetail log={selectedLog} isLoading={isLoading} />
      </div>

      <div className="hidden md:flex w-1/3 border-l border-gray-800 bg-gray-900 flex-col">
        <div className="p-4 border-b border-gray-800">
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoading={isLoading}
            onRefresh={refreshLogs}
          />
          <div className="flex justify-between items-center mt-2">
            <h2 className="text-lg font-medium text-white">Activity Logs</h2>
            <span className="text-sm text-gray-400">
              {pagination?.total || 0} total
            </span>
          </div>
        </div>

        {/* Desktop log list */}
        <div
          ref={desktopListRef}
          className="flex-1 overflow-y-auto min-h-[300px]"
        >
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <LogItem
                key={log._id}
                log={log}
                isSelected={selectedLog?._id === log._id}
                onClick={() => setSelectedLog(log)}
              />
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 flex items-center justify-center h-full">
              {isLoading ? "Loading logs..." : "No logs found"}
            </div>
          )}
        </div>

        {/* Pagination (desktop) */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <button
            className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50 cursor-pointer"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            Prev
          </button>
          <span className="text-sm text-gray-300 cursor-pointer">
            Page {page} of {pagination?.totalPages || 1}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50 cursor-pointer"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= (pagination?.totalPages || 1) || isLoading}
          >
            Next
          </button>
          <select
            className="ml-3 bg-gray-800 text-white rounded px-2 py-1"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              scrollToTop();
            }}
            disabled={isLoading}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex-1 bg-gray-900">
        {!selectedLog ? (
          <>
            {/* Logs List */}
            <div className="p-4 border-b border-gray-800">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isLoading={isLoading}
                onRefresh={refreshLogs}
              />
              <div className="flex justify-between items-center mt-2">
                <h2 className="text-lg font-medium text-white">Activity Logs</h2>
                <span className="text-sm text-gray-400">
                  {pagination?.total || 0} total
                </span>
              </div>
            </div>

            {/* Mobile log list */}
            <div
              ref={mobileListRef}
              className="overflow-y-auto h-[calc(100vh-100px)]"
            >
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <LogItem
                    key={log._id}
                    log={log}
                    //@ts-ignore
                    isSelected={selectedLog?._id === log._id}
                    onClick={() => setSelectedLog(log)}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 flex items-center justify-center h-full">
                  {isLoading ? "Loading logs..." : "No logs found"}
                </div>
              )}
            </div>

            {/* Pagination (mobile) */}
            <div className="p-4 border-t border-gray-800 flex items-center justify-between md:hidden">
              <button
                className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || isLoading}
              >
                Prev
              </button>
              <span className="text-sm text-gray-300">
                Page {page} of {pagination?.totalPages || 1}
              </span>
              <button
                className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= (pagination?.totalPages || 1) || isLoading}
              >
                Next
              </button>
              <select
                className="ml-3 bg-gray-800 text-white rounded px-2 py-1"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  scrollToTop();
                }}
                disabled={isLoading}
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="p-4 bg-gray-950 h-full overflow-y-auto">
            <button
              className="mb-4 px-3 py-1 rounded bg-gray-700 text-white"
              onClick={() => setSelectedLog(null)}
            >
              ← Back to Logs
            </button>
            <LogDetail log={selectedLog} isLoading={isLoading} />
          </div>
        )}
      </div>
    </div>
  );
}
