import { useState } from 'react';
import type { ETaskPriority, OpenTaskStatus, TaskSortOption } from '../../types/Task/Task';
import { OPEN_TASK_STATUSES } from '../../utils/taskDisplay';

const ALL_OPEN_STATUSES = [...OPEN_TASK_STATUSES];

// Søg/filter/sortering delt af /tasks og /tasks/mine (FilterBar +
// FilterPanel). Sortering tæller ikke som aktivt filter - kun det der
// skjuler opgaver.
export function useTaskFilters() {
  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<OpenTaskStatus[]>(ALL_OPEN_STATUSES);
  const [selectedPriority, setSelectedPriority] = useState<ETaskPriority | 'All'>('All');
  const [sortBy, setSortBy] = useState<TaskSortOption>('priority');

  const searchTerm = search.trim().toLowerCase();

  const activeFilterCount =
    (searchTerm !== '' ? 1 : 0) +
    (selectedPriority !== 'All' ? 1 : 0) +
    (selectedStatuses.length < ALL_OPEN_STATUSES.length ? 1 : 0);

  // "Nulstil" rydder alt, også søgefeltet.
  const resetFilters = () => {
    setSearch('');
    setSelectedStatuses(ALL_OPEN_STATUSES);
    setSelectedPriority('All');
    setSortBy('priority');
  };

  return {
    search,
    setSearch,
    searchTerm,
    selectedStatuses,
    setSelectedStatuses,
    selectedPriority,
    setSelectedPriority,
    sortBy,
    setSortBy,
    activeFilterCount,
    resetFilters,
  };
}
