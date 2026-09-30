// src/components/Task/TaskFilters.tsx
import { useState } from 'react'
import { FilterBar } from './FilterBar'
import { FilterPanel } from './FilterPanel'
import type { useTaskBoard } from '../../store/hooks/useTaskBoard'

// Søgefelt + filter-knap og det udfoldelige filterpanel over opgave-tavlen.
export function TaskFilters({ board }: { board: ReturnType<typeof useTaskBoard> }) {
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    return (
        <>
            <FilterBar
                isFilterOpen={isFilterOpen}
                onToggleFilter={() => setIsFilterOpen((open) => !open)}
                search={board.search}
                onSearchChange={board.setSearch}
                availableCount={board.available.length}
                inProgressCount={board.inProgress.length}
                activeFilterCount={board.activeFilterCount}
            />

            <FilterPanel
                isOpen={isFilterOpen}
                selectedStatuses={board.selectedStatuses}
                selectedPriority={board.selectedPriority}
                sortBy={board.sortBy}
                onStatusChange={board.setSelectedStatuses}
                onPriorityChange={board.setSelectedPriority}
                onSortChange={board.setSortBy}
                onReset={board.resetFilters}
            />
        </>
    )
}
