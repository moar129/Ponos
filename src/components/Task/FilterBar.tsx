import React from 'react';
import { useTranslation } from 'react-i18next'

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
  inProgressCount,
}) => {
  const { t } = useTranslation(['tasks', 'common'])
  return (
    <div className="bg-white border-b border-border-gray dark:bg-slate-900 dark:border-slate-700">
      <div className="max-w-[1600px] mx-auto px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleFilter}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
              ${isFilterOpen
                ? 'border-accent bg-accent text-white'
                : 'border-border-gray text-secondary hover:border-secondary hover:text-primary dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100'}
            `}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-1.447.894l-2-1A1 1 0 019 18v-4.586L3.293 6.707A1 1 0 013 6V4z"
              />
            </svg>
            {isFilterOpen ? t('filter.hide') : t('filter.show')}
          </button>

          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('filter.searchPlaceholder')}
            className="w-56 rounded-lg border border-border-gray bg-white text-primary px-4 py-2 text-sm outline-none placeholder:text-secondary focus:border-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-secondary dark:text-slate-400">
            {t('filter.counts', { available: availableCount, inProgress: inProgressCount })}
          </span>
        </div>
      </div>
    </div>
  );
};