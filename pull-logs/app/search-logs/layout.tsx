"use client";

import { PropsWithChildren } from 'react';
import Link from 'next/link';

export default function SearchLogsLayout({ children }: PropsWithChildren) {
  return (
    <main className="min-h-screen bg-gray-900">
      <nav className="bg-gray-950 border-b border-gray-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Log Management
            </Link>
            
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-gray-300 hover:text-white transition">
                Dashboard
              </Link>
              <Link href="/search-logs" className="text-blue-400 hover:text-blue-300 transition">
                Advanced Search
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      {children}
    </main>
  );
}