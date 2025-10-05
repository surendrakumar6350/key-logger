import React from 'react';

interface LogEntry {
  _id: string;
  user: string;
  values: string;
  page: string;
  ip: string;
  timestamp: string;
  date: string;
}

interface LogCardsProps {
  logs: LogEntry[];
}

const LogCards: React.FC<LogCardsProps> = ({ logs }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {logs.length === 0 ? (
        <div className="col-span-full text-center py-10 bg-white rounded-xl shadow-md">
          <p className="text-gray-500">No logs found</p>
        </div>
      ) : (
        logs.map((log) => (
          <div 
            key={log._id || `${log.timestamp}-${log.ip}`} 
            className="bg-white rounded-xl p-5 shadow-md border-l-4 border-gray-200 transition duration-200 hover:shadow-lg hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                  <span className="text-xs font-medium">{log.user.charAt(0).toUpperCase()}</span>
                </div>
                <h3 className="font-semibold text-gray-800">{log.user}</h3>
              </div>
              <span className="text-xs text-gray-500">{log.timestamp}</span>
            </div>
            
            <p className="text-gray-600 text-sm line-clamp-2 mb-3" title={log.values}>
              {log.values}
            </p>

            <div className="flex justify-between items-end">
              <div className="flex items-center text-gray-500 text-xs">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                </svg>
                <span className="truncate max-w-xs" title={log.page}>{log.page}</span>
              </div>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                {log.ip}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default LogCards;