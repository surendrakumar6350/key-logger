export interface LogEntry {
  _id: string;
  user: string;
  values: string;
  page: string;
  ip: string;
  timestamp: string;
  date: string;
}

export interface LogResponse {
  success: boolean;
  message: LogEntry[];
}