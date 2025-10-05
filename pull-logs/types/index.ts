export interface LogEntry {
  _id?: string; // Optional since S3 logs don't have MongoDB IDs
  user: string;
  values: string;
  page: string;
  ip: string;
  timestamp: string;
  date: string;
  source?: 'database' | 's3';
  s3File?: string;
}

export interface LogResponse {
  success: boolean;
  message: LogEntry[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SearchResultCounts {
  database: number;
  s3: number;
  total: number;
}

export interface SearchResponse {
  success: boolean;
  message: string;
  query: string;
  timeMs: number;
  data: LogEntry[];
  counts: SearchResultCounts;
  pagination: PaginationInfo;
  filters: {
    month: string | null;
  };
}