import React from 'react';
import { useTranslation } from 'react-i18next'
import type { ETaskPriority, ETaskStatus } from '../../types/Task/Task';

export type TaskSortOption =
  | 'newest'
  | 'oldest'
  | 'priority'
  | 'deadline';

interface FilterPanelProps {
  isOpen: boolean;
  selectedStatuses: ETaskStatus[];
  selectedPriority: ETaskPriority | 'All';
  sortBy: TaskSortOption;
  onStatusChange: (statuses: ETaskStatus[]) => void;
  onPriorityChange: (priority: ETaskPriority | 'All') => void;
  onSortChange: (sort: TaskSortOption) => void;
  onReset: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  selectedStatuses,
  selectedPriority,
  sortBy,
  onStatusChange,
  onPriorityChange,
  onSortChange,
  onReset,
}) => {
  const { t } = useTranslation(['tasks', 'common'])

  if (!isOpen) return null;

  const toggleStatus = (status: ETaskStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];

    onStatusChange(newStatuses);
  };

  return (
    <div className="bg-white border-b border-border-gray shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <div className="flex gap-12 items-start">

          {/* STATUS */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 dark:text-slate-100">{t('common:status')}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes('Started')}
                  onChange={() => toggleStatus('Started')}
                  className="rounded border-border-gray text-accent focus:ring-accent dark:border-slate-700"
                />
                {t('status.Started')}
              </label>

              <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes('InProgress')}
                  onChange={() => toggleStatus('InProgress')}
                  className="rounded border-border-gray text-accent focus:ring-accent dark:border-slate-700"
                />
                {t('status.InProgress')}
              </label>

              <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes('Completed')}
                  onChange={() => toggleStatus('Completed')}
                  className="rounded border-border-gray text-accent focus:ring-accent dark:border-slate-700"
                />
                {t('status.Completed')}
              </label>
            </div>
          </div>

          {/* PRIORITET */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 dark:text-slate-100">{t('fields.priority')}</h3>
            <select
              value={selectedPriority}
              onChange={(event) =>
                onPriorityChange(
                  event.target.value as ETaskPriority | 'All'
                )
              }
              className="border border-border-gray rounded-lg px-3 py-2 text-sm bg-white text-primary min-w-[150px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="All">{t('filter.all')}</option>
              <option value="Low">{t('priority.Low')}</option>
              <option value="Medium">{t('priority.Medium')}</option>
              <option value="High">{t('priority.High')}</option>
              <option value="Critical">{t('priority.Critical')}</option>
            </select>
          </div>

          {/* SORTÉR */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 dark:text-slate-100">{t('filter.sortBy')}</h3>
            <select
              value={sortBy}
              onChange={(event) =>
                onSortChange(
                  event.target.value as TaskSortOption
                )
              }
              className="border border-border-gray rounded-lg px-3 py-2 text-sm bg-white text-primary min-w-[150px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="newest">{t('filter.sortNewest')}</option>
              <option value="oldest">{t('filter.sortOldest')}</option>
              <option value="priority">{t('filter.sortPriority')}</option>
              <option value="deadline">{t('filter.sortDeadline')}</option>
            </select>
          </div>

          {/* NULSTIL */}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onReset}
              className="text-sm text-secondary hover:text-primary border border-border-gray rounded-lg px-4 py-2 hover:border-secondary transition dark:text-slate-400 dark:hover:text-slate-100 dark:border-slate-700"
            >
              {t('common:reset')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};