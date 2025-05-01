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

interface LogTableProps {
  logs: LogEntry[];
}

const LogTable: React.FC<LogTableProps> = ({ logs }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-md">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Values</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                No logs found
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                      <span className="text-xs font-medium">{log.user.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="font-medium text-gray-900">{log.user}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-600 truncate max-w-xs" title={log.values}>
                    {log.values}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-600 truncate max-w-xs" title={log.page}>
                    {log.page}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{log.ip}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{log.timestamp}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 text-sm transition duration-200">
                    Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LogTable;