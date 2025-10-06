"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import axios from 'axios';
import { LogEntry } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Checkbox } from '@/Components/ui/checkbox';
import LogDetail from '@/Components/LogDetail';
import { SlidersHorizontal } from 'lucide-react';

function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LogEntry[]>([]);
  const [selectedResult, setSelectedResult] = useState<LogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  // Advanced filters
  const [fromDate, setFromDate] = useState<string>(''); // YYYY-MM-DD
  const [toDate, setToDate] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [source, setSource] = useState<'both' | 'database' | 's3'>('both');
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [counts, setCounts] = useState<{
    database: number;
    s3: number;
    total: number;
  } | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);

  // Search function
  const search = async ({
    newQuery = query,
    newPage = page,
    newLimit = limit,
    newFromDate = fromDate,
    newToDate = toDate,
    newUser = userFilter,
    newSource = source,
  } = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('query', newQuery);
      params.append('page', newPage.toString());
      params.append('limit', newLimit.toString());
      if (newFromDate) params.append('fromDate', newFromDate);
      if (newToDate) params.append('toDate', newToDate);
      if (newUser) params.append('user', newUser);
      if (newSource) params.append('source', newSource);

      const response = await axios.get(`/api/search?${params.toString()}`);

      if (response.data.success) {
        setResults(response.data.data);
        setPagination(response.data.pagination);
        setCounts(response.data.counts);
        setTimeMs(response.data.timeMs);

        // If we have results and none is selected, select the first one
        if (response.data.data.length > 0 && !selectedResult) {
          setSelectedResult(response.data.data[0]);
        } else if (response.data.data.length === 0) {
          setSelectedResult(null);
        }

        // Update state with the actual values used
        setPage(newPage);
        setLimit(newLimit);
        if (newQuery !== query) setQuery(newQuery);
        setFromDate(newFromDate);
        setToDate(newToDate);
        setUserFilter(newUser);
        setSource(newSource);
      } else {
        setError(response.data.message || 'Search failed');
        setResults([]);
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to search API');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    query,
    setQuery,
    results,
    selectedResult,
    setSelectedResult,
    isLoading,
    error,
    page,
    setPage,
    limit,
    setLimit,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    userFilter,
    setUserFilter,
    source,
    setSource,
    search,
    pagination,
    counts,
    timeMs
  };
}

export default function GlobalSearchPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const {
    query,
    setQuery,
    results,
    selectedResult,
    setSelectedResult,
    isLoading,
    error,
    page,
    setPage,
    limit,
    setLimit,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    userFilter,
    setUserFilter,
    source,
    setSource,
    search,
    pagination,
    counts,
    timeMs
  } = useGlobalSearch();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search({ newPage: 1 }); // Reset to page 1 on new search
  };

  const handlePageChange = (newPage: number) => {
    search({ newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // derive source checkboxes from hook state
  const sourceDbChecked = source === 'both' || source === 'database';
  const sourceS3Checked = source === 'both' || source === 's3';

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const handleShowDetail = (log: LogEntry) => {
    setSelectedResult(log);
    setShowDetailPanel(true);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Advanced Log Search</h1>
            <p className="text-gray-400">Search across recent and archived logs</p>
          </div>

          <div className="mt-4 md:mt-0 flex items-center space-x-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'grid')} className="w-[180px]">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="list" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">List View</TabsTrigger>
                <TabsTrigger value="grid" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">Grid View</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Card className="mb-6 bg-gray-900 border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white">Search Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search by user, values, page, or IP address..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  autoComplete="off"
                />
              </div>

              {/* Filters popover */}

              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                      <span className="hidden sm:inline mr-2">Filters</span>
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-gray-900 border border-gray-800 text-white p-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">Advanced Filters</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date Range</label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="date" className="bg-gray-800 border-gray-700" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                          <Input type="date" className="bg-gray-800 border-gray-700" value={toDate} onChange={e => setToDate(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">User</label>
                        <Input className="bg-gray-800 border-gray-700" value={userFilter} onChange={e => setUserFilter(e.target.value)} placeholder="Filter by user" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Source</label>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={sourceDbChecked} onCheckedChange={(v) => setSource((!!v && sourceS3Checked) ? 'both' : (!!v ? 'database' : (sourceS3Checked ? 's3' : 'both')))} id="database" className="bg-gray-800 border-gray-700" />
                          <label htmlFor="database" className="text-sm">Database</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={sourceS3Checked} onCheckedChange={(v) => setSource((!!v && sourceDbChecked) ? 'both' : (!!v ? 's3' : (sourceDbChecked ? 'database' : 'both')))} id="archive" className="bg-gray-800 border-gray-700" />
                          <label htmlFor="archive" className="text-sm">Archive</label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Results per page</label>
                        <Select value={String(limit)} onValueChange={(val) => setLimit(parseInt(val))}>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Results per page" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-60 overflow-auto">
                            {[10, 20, 50, 100, 500, 1000].map((value) => (
                              <SelectItem key={value} value={value.toString()} className="focus:bg-gray-700 focus:text-white">
                                {value} per page
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => search({ newPage: 1 })}>
                        Apply Filters
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button type="submit" disabled={isLoading} className="md:w-auto w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {isLoading ? (
                    <>
                      <span className="mr-2">Searching</span>
                      <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    </>
                  ) : (
                    'Search Logs'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-900/20 border border-red-800 text-white">
            <AlertDescription className="text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        {results.length > 0 && pagination && (
          <Card className="mb-6 bg-gray-900 border border-gray-800">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div className="flex items-center">
                  <div className="bg-blue-600/20 text-blue-200 rounded-lg px-3 py-1.5 flex items-center">
                    <span className="font-medium">{pagination.total}</span>
                    <span className="ml-1.5">results found</span>
                    {timeMs && <span className="ml-1.5 text-blue-300/80">in {(timeMs / 1000).toFixed(2)}s</span>}
                  </div>
                </div>

                {counts && (
                  <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center space-x-2 bg-blue-900/20 rounded-lg px-3 py-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                      <span className="text-blue-200 text-sm">Database: <span className="font-medium">{counts.database}</span></span>
                    </div>
                    <div className="flex items-center space-x-2 bg-green-900/20 rounded-lg px-3 py-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                      <span className="text-green-200 text-sm">Archives: <span className="font-medium">{counts.s3}</span></span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile View: Combined Results and Detail */}
        <div className="md:hidden">
          {!showDetailPanel ? (
            <>
              {results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((log, index) => (
                    <Card
                      key={log._id || `${log.timestamp}-${index}`}
                      className="cursor-pointer hover:bg-gray-800 transition-colors bg-gray-900 border border-gray-800"
                      onClick={() => handleShowDetail(log)}
                    >
                      <div className={`h-1 ${log.source === 'database' ? 'bg-blue-500' : 'bg-green-500'}`} />
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-200">{log.user}</p>
                            <p className="text-sm text-gray-400 truncate">{log.page || 'No page data'}</p>
                          </div>
                          <div className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                            {log.source === 'database' ? 'Recent' : 'Archive'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : query && !isLoading ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-400">No results found for "{query}"</p>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : (
            <div>
              <Button
                variant="outline"
                onClick={() => setShowDetailPanel(false)}
                className="mb-4 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                ← Back to Results
              </Button>

              {selectedResult && (
                <Card className="bg-gray-900 border border-gray-800">
                  <CardHeader className="border-b border-gray-800">
                    <CardTitle className="text-white">Log Details</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <LogDetail log={selectedResult} />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Desktop View: Side by Side Results and Detail */}
        <div className="hidden md:grid md:grid-cols-5 gap-6">
          <div className={showDetailPanel ? "col-span-2" : "col-span-5"}>
            {viewMode === 'list' ? (
              <Card className="bg-gray-900 border border-gray-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-white">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">User</th>
                        <th className="px-4 py-3 text-left font-medium">Page</th>
                        <th className="px-4 py-3 text-left font-medium">Time</th>
                        <th className="px-4 py-3 text-left font-medium">Source</th>
                        <th className="px-4 py-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {results.map((log, index) => (
                        <tr
                          key={log._id || `${log.timestamp}-${index}`}
                          className={`hover:bg-gray-800 transition-colors cursor-pointer ${selectedResult === log ? 'bg-gray-800' : ''}`}
                          onClick={() => {
                            setSelectedResult(log);
                            setShowDetailPanel(true);
                          }}
                        >
                          <td className="px-4 py-3 max-w-[150px] truncate">{log.user}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate">{log.page || 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${log.source === 'database' ? 'bg-blue-600/20 text-blue-300' : 'bg-green-600/20 text-green-300'
                              }`}>
                              {log.source === 'database' ? 'Database' : 'Archive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-700 hover:bg-gray-800 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                                setSelectedResult(log);
                                setShowDetailPanel(true);
                              }}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {results.length === 0 && query && !isLoading && (
                  <div className="p-8 text-center">
                    <p className="text-gray-300">No results found for <span className="text-blue-400 font-medium">"{query}"</span></p>
                    <p className="text-gray-400 mt-2">Try different search terms or filters</p>
                  </div>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((log, index) => (
                  <Card
                    key={log._id || `${log.timestamp}-${index}`}
                    className={`cursor-pointer hover:bg-gray-800 transition-colors bg-gray-900 border border-gray-800 ${selectedResult === log ? 'ring-2 ring-blue-500' : ''
                      }`}
                    onClick={() => {
                      setSelectedResult(log);
                      setShowDetailPanel(true);
                    }}
                  >
                    <div className={`h-1 ${log.source === 'database' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-200">{log.user}</p>
                          <p className="text-sm text-gray-400 truncate max-w-[180px]">{log.page || 'No page data'}</p>
                        </div>
                        <div className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                          {log.source === 'database' ? 'Recent' : 'Archive'}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {results.length === 0 && query && !isLoading && (
                  <div className="col-span-full p-8 text-center">
                    <p className="text-gray-400">No results found for "{query}"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {showDetailPanel && (
            <div className="col-span-3">
              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-800">
                  <CardTitle className="text-white">Log Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetailPanel(false)}
                    className="text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    Close
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  {selectedResult ? (
                    <LogDetail log={selectedResult} />
                  ) : (
                    <p className="text-gray-400">Select a log to view details</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-300">
              Page {pagination.page} of {pagination.totalPages}
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage || isLoading}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                Previous
              </Button>

              {/* Page numbers - show up to 5 pages */}
              <div className="hidden md:flex space-x-2">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = pagination.page <= 3
                    ? i + 1
                    : pagination.page + i - 2;

                  if (pageNum <= pagination.totalPages && pageNum > 0) {
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? "default" : "outline"}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isLoading}
                        className={pageNum === pagination.page
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"}
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage || isLoading}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                Next
              </Button>
            </div>

            <div className="hidden sm:block">
              <Select
                value={limit.toString()}
                onValueChange={(value) => search({ newLimit: parseInt(value), newPage: 1 })}
              >
                <SelectTrigger className="w-[130px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Results per page" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {[10, 20, 50, 100].map((value) => (
                    <SelectItem
                      key={value}
                      value={value.toString()}
                      className="focus:bg-gray-700 focus:text-white"
                    >
                      {value} per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}