import React, { useState } from 'react';
import type { ETaskStatus } from '../../types/Task/Task';

interface FilterPanelProps {
  isOpen: boolean;
  selectedStatuses: ETaskStatus[];
  onStatusChange: (statuses: ETaskStatus[]) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  selectedStatuses,
  onStatusChange
}) => {
  const [statuses, setStatuses] = useState<ETaskStatus[]>(selectedStatuses);

  if (!isOpen) return null;

  const toggleStatus = (status: ETaskStatus) => {
    const newStatuses = statuses.includes(status)
      ? statuses.filter(s => s !== status)
      : [...statuses, status];
    setStatuses(newStatuses);
    onStatusChange(newStatuses);
  };

  return (
    <div className="bg-white border-b border-border-gray shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <div className="flex gap-12 items-start">
          {/* Status */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 dark:text-slate-100">Status</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={statuses.includes('Started')}
                  onChange={() => toggleStatus('Started')}
                  className="rounded border-border-gray text-accent focus:ring-accent dark:border-slate-700"
                />
                Tilgængelig
              </label>
              <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={statuses.includes('InProgress')}
                  onChange={() => toggleStatus('InProgress')}
                  className="rounded border-border-gray text-accent focus:ring-accent dark:border-slate-700"
                />
                I gang
              </label>
              <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={statuses.includes('Completed')}
                  onChange={() => toggleStatus('Completed')}
                  className="rounded border-border-gray text-accent focus:ring-accent dark:border-slate-700"
                />
                Færdig
              </label>
            </div>
          </div>

          {/* Prioritet */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 dark:text-slate-100">Prioritet</h3>
            <select className="border border-border-gray rounded-lg px-3 py-2 text-sm bg-white text-primary min-w-[150px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <option>Alle</option>
              <option>Lav</option>
              <option>Mellem</option>
              <option>Høj</option>
            </select>
          </div>

          {/* Sortér */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 dark:text-slate-100">Sortér efter</h3>
            <select className="border border-border-gray rounded-lg px-3 py-2 text-sm bg-white text-primary min-w-[150px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <option>Nyeste</option>
              <option>Ældste</option>
              <option>Prioritet</option>
              <option>Deadline</option>
            </select>
          </div>

          {/* Nulstil */}
          <div className="ml-auto">
            <button
              onClick={() => {
                setStatuses([]);
                onStatusChange([]);
              }}
              className="text-sm text-secondary hover:text-primary border border-border-gray rounded-lg px-4 py-2 hover:border-secondary transition dark:text-slate-400 dark:hover:text-slate-100 dark:border-slate-700"
            >
              Nulstil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};