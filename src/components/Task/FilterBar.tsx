import React from 'react';

interface FilterBarProps {
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  availableCount: number;
  inProgressCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({ 
  isFilterOpen, 
  onToggleFilter,
  search,
  onSearchChange,
  availableCount,
  inProgressCount
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFilter}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
              ${isFilterOpen 
                ? 'border-gray-900 bg-gray-900 text-white' 
                : 'border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900'}
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                 d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-1.447.894l-2-1A1 1 0 009 18v-4.586L3.293 6.707A1 1 0 013 6V4z" 
              />
            </svg>
            {isFilterOpen ? 'Skjul filter' : 'Vis filter'}
          </button>

          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Søg opgaver..."
            className="w-56 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-900"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {availableCount} tilgængelige · {inProgressCount} i gang
          </span>
        </div>
      </div>
    </div>
  );
};