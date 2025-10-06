// Shared types for the search API

export interface SearchParams {
  query: string;
  limit: number;
  page: number;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
  user?: string;
  source?: "database" | "s3" | "both";
}

export interface SearchResults {
  databaseResults: any[];
  s3Results: any[];
}

export interface ResultCounts {
  database: number;
  s3: number;
  total: number;
}
