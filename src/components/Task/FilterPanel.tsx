import React from 'react';
import { useTranslation } from 'react-i18next'
import type { ETaskPriority, OpenTaskStatus, TaskSortOption } from '../../types/Task/Task';
import { OPEN_TASK_STATUSES } from '../../utils/taskDisplay';
import { toggleInArray } from '../../utils/toggle';
import { PrioritySelect } from './PrioritySelect';


interface FilterPanelProps {
  isOpen: boolean;
  // Hver status er en kolonne; fravalgt status skjuler kolonnen.
  selectedStatuses: OpenTaskStatus[];
  selectedPriority: ETaskPriority | 'All';
  sortBy: TaskSortOption;
  onStatusChange: (statuses: OpenTaskStatus[]) => void;
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

  const toggleStatus = (status: OpenTaskStatus) => {
    onStatusChange(toggleInArray(selectedStatuses, status));
  };

  return (
    <div className="bg-white border-b border-border-gray shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="lg:px-2 py-4 sm:py-6">
        <div className="flex flex-wrap gap-6 lg:gap-12 items-start">

          {/* STATUS */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 dark:text-slate-100">{t('common:status')}</h3>
            <div className="space-y-2">
              {OPEN_TASK_STATUSES.map((status) => {
                const checked = selectedStatuses.includes(status);
                // Sidste valgte kan ikke fravælges - ellers ville siden være tom.
                const isLastChecked = checked && selectedStatuses.length === 1;
                return (
                  <label
                    key={status}
                    className={`flex items-center gap-2 text-sm text-secondary dark:text-slate-400 ${isLastChecked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isLastChecked}
                      onChange={() => toggleStatus(status)}
                      className="rounded border-border-gray text-accent focus:ring-accent dark:border-slate-700"
                    />
                    {t(`status.${status}`)}
                  </label>
                );
              })}
            </div>
          </div>

          {/* PRIORITET */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 dark:text-slate-100">{t('fields.priority')}</h3>
            <PrioritySelect
              value={selectedPriority}
              emptyValue="All"
              emptyLabel={t('common:all')}
              onChange={onPriorityChange}
              className="border border-border-gray rounded-lg px-3 py-2 text-sm bg-white text-primary min-w-[150px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
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