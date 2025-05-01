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

interface FeaturedLogCardProps {
  log: LogEntry;
}

const FeaturedLogCard: React.FC<FeaturedLogCardProps> = ({ log }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-blue-500 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center mb-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
              <span className="text-lg font-medium">{log.user.charAt(0).toUpperCase()}</span>
            </div>
            <h3 className="font-bold text-lg text-gray-800">{log.user}</h3>
          </div>
          <p className="text-gray-700 mb-3 break-words">
            {log.values}
          </p>
          <div className="flex items-center text-gray-500 text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
            </svg>
            <a 
              href={log.page} 
              target="_blank" 
              rel="noopener noreferrer"
              className="truncate hover:text-blue-500 transition-colors duration-200"
              title={log.page}
            >
              {log.page}
            </a>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end">
          <div className="bg-gray-100 px-3 py-1 rounded-full text-gray-600 text-sm mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
            <span>{log.ip}</span>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{log.timestamp}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedLogCard;