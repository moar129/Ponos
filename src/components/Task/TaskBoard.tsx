// src/components/Task/TaskBoard.tsx
import { useState } from 'react'
import { useTaskPermissions } from '../../store/hooks/useTaskPermissions'
import type { Task, TaskBoardProps, TaskColumnKey, TaskColumnLabels } from '../../types/Task/Task'
import { TaskCard } from './TaskCard'
import { TaskColumnEmptyState } from './TaskColumnEmptyState'
import { TaskColumnTabs } from './TaskColumnTabs'

// De to kolonner "Tilgængelige" og "I gang" på /tasks og /tasks/mine.
// Under lg bliver kolonnerne til faner; en åben opgave (?task=) vinder
// over fanevalget, så dens popup ikke ligger i en skjult fane.
export function TaskBoard({
    available,
    inProgress,
    openTaskId,
    onCloseOpenTask,
    selectedStatuses,
    hasActiveFilters,
    onResetFilters,
    labels,
}: TaskBoardProps) {
    const [mobileColumn, setMobileColumn] = useState<TaskColumnKey | null>(null)

    const tasksByColumn: Record<TaskColumnKey, Task[]> = { available, inProgress }
    const visible: Record<TaskColumnKey, boolean> = {
        available: selectedStatuses.includes('Started') || available.length > 0,
        inProgress: selectedStatuses.includes('InProgress') || inProgress.length > 0,
    }

    const showColumnTabs = visible.available && visible.inProgress
    const activeColumn: TaskColumnKey =
        inProgress.some((task) => task.id === openTaskId) ? 'inProgress'
        : available.some((task) => task.id === openTaskId) ? 'available'
        : mobileColumn ?? 'available'

    const columnProps = (column: TaskColumnKey) => ({
        tasks: tasksByColumn[column],
        labels: labels[column],
        openTaskId,
        onCloseOpenTask,
        hasActiveFilters,
        onResetFilters,
        className: showColumnTabs && activeColumn !== column ? 'hidden lg:block' : undefined,
        headerClassName: showColumnTabs ? 'hidden lg:flex' : 'flex',
    })

    return (
        <>
            {showColumnTabs && (
                <TaskColumnTabs
                    active={activeColumn}
                    onChange={setMobileColumn}
                    availableLabel={labels.available.heading}
                    availableCount={available.length}
                    inProgressLabel={labels.inProgress.heading}
                    inProgressCount={inProgress.length}
                />
            )}

            <div className={`grid ${showColumnTabs ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6 lg:gap-8 items-start`}>
                {visible.available && <TaskColumn {...columnProps('available')} />}
                {visible.inProgress && <TaskColumn {...columnProps('inProgress')} />}
            </div>
        </>
    )
}

function TaskColumn({
    tasks,
    labels,
    openTaskId,
    onCloseOpenTask,
    hasActiveFilters,
    onResetFilters,
    className,
    headerClassName,
}: {
    tasks: Task[]
    labels: TaskColumnLabels
    openTaskId: string | null
    onCloseOpenTask: () => void
    hasActiveFilters: boolean
    onResetFilters: () => void
    className?: string
    headerClassName: string
}) {
    const { canUpdate, canDelete, canAssign } = useTaskPermissions()

    return (
        <section className={className}>
            <div className={`${headerClassName} items-center justify-between mb-4`}>
                <div>
                    <h2 className="font-bold text-lg text-primary dark:text-slate-100">{labels.heading}</h2>
                    {labels.subtitle && <p className="text-sm text-secondary mt-1 dark:text-slate-400">{labels.subtitle}</p>}
                </div>
                <span className="bg-bg-gray text-secondary text-xs font-bold px-2.5 py-1 rounded-full dark:bg-slate-700 dark:text-slate-400">
                    {tasks.length}
                </span>
            </div>

            <div className="bg-bg-gray/40 border border-border-gray rounded-2xl p-4 lg:min-h-[300px] space-y-4 dark:bg-slate-800/40 dark:border-slate-700">
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        canAssign={canAssign}
                        defaultDetailsOpen={task.id === openTaskId}
                        onDetailsClose={onCloseOpenTask}
                    />
                ))}

                {tasks.length === 0 && (
                    <TaskColumnEmptyState emptyText={labels.empty} hasActiveFilters={hasActiveFilters} onReset={onResetFilters} />
                )}
            </div>
        </section>
    )
}
