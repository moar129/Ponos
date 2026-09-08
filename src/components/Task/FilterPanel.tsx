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
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <div className="flex gap-12 items-start">
          {/* Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={statuses.includes('Started')}
                  onChange={() => toggleStatus('Started')}
                  className="rounded border-gray-300"
                />
                Tilgængelig
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={statuses.includes('InProgress')}
                  onChange={() => toggleStatus('InProgress')}
                  className="rounded border-gray-300"
                />
                I gang
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={statuses.includes('Completed')}
                  onChange={() => toggleStatus('Completed')}
                  className="rounded border-gray-300"
                />
                Færdig
              </label>
            </div>
          </div>

          {/* Prioritet */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Prioritet</h3>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[150px]">
              <option>Alle</option>
              <option>Lav</option>
              <option>Mellem</option>
              <option>Høj</option>
            </select>
          </div>

          {/* Sortér */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Sortér efter</h3>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[150px]">
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
              className="text-sm text-gray-500 hover:text-gray-900 border border-gray-300 rounded-lg px-4 py-2 hover:border-gray-900 transition"
            >
              Nulstil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};