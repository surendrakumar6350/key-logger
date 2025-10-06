"use client";

import { useState } from 'react';

interface MonthOption {
  label: string;
  value: string;
}

interface MonthSelectorProps {
  month: string;
  setMonth: (month: string) => void;
  availableMonths: MonthOption[];
  disabled?: boolean;
}

export default function MonthSelector({ 
  month, 
  setMonth, 
  availableMonths,
  disabled = false
}: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentMonthLabel = month 
    ? availableMonths.find(m => m.value === month)?.label || month
    : 'Select month';
  
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{currentMonthLabel}</span>
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
          <ul className="py-1 max-h-60 overflow-auto">
            <li 
              key="all"
              className="px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 cursor-pointer"
              onClick={() => {
                setMonth('');
                setIsOpen(false);
              }}
            >
              All months
            </li>
            {availableMonths.map(option => (
              <li
                key={option.value}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  month === option.value ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700'
                }`}
                onClick={() => {
                  setMonth(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}