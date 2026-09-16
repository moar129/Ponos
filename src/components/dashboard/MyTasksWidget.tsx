// src/components/dashboard/MyTasksWidget.tsx
import { ListChecks } from 'lucide-react'
import { useGetMyTaskIdsQuery, useGetTasksQuery } from '../../store/apis/taskApi'
import { PRIORITY_COLORS, PRIORITY_LABELS, PRIORITY_RANK, formatDate } from '../../utils/taskDisplay'
import type { ETaskStatus, Task } from '../../types/Task/Task'

const MAX_TASKS = 5

// Samme danske betegnelser som opgavesidens filter/formularer.
const STATUS_LABELS: Record<ETaskStatus, string> = {
    Started: 'Tilgængelig',
    InProgress: 'I gang',
    Completed: 'Færdig',
}

// Genskaber bevidst sortTasks fra TaskPage.tsx (Studerende 3's fil) i
// stedet for at trække den ud i en delt util - undgår at røre andres
// filer. Kan samles senere. Prioritet først (manglende = rang 5), så
// nærmeste slutdato (manglende sidst).
function sortByPriorityThenEndDate(a: Task, b: Task): number {
    const priorityA = a.priority ? PRIORITY_RANK[a.priority] : 5
    const priorityB = b.priority ? PRIORITY_RANK[b.priority] : 5
    if (priorityA !== priorityB) return priorityA - priorityB

    if (a.end_date && b.end_date) return a.end_date.localeCompare(b.end_date)
    if (a.end_date) return -1
    if (b.end_date) return 1
    return 0
}

function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

// US-74: brugerens egne, ikke-afsluttede opgaver på Oversigt-fanen.
// getTasks er filtreret på aktiv organisation, og task_assignees er
// RLS-scopet til samme, så snittet kan aldrig indeholde andre
// organisationers opgaver. Rækkerne er bevidst ikke klikbare - der findes
// ingen opgave-adresse at linke til før US-36.
export function MyTasksWidget() {
    const { data: tasks = [], isLoading: loadingTasks, error: tasksError } = useGetTasksQuery()
    const { data: myTaskIds = [], isLoading: loadingMyTaskIds, error: myTaskIdsError } = useGetMyTaskIdsQuery()

    const myTasks = tasks
        .filter((task) => myTaskIds.includes(task.id) && task.status !== 'Completed')
        .sort(sortByPriorityThenEndDate)
        .slice(0, MAX_TASKS)

    const error = readableError(tasksError) ?? readableError(myTaskIdsError)

    return (
        <div className="rounded-lg border border-slate-800 bg-[#0B132A] p-5">
            <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-5 h-5 text-slate-400" />
                <h3 className="font-medium text-slate-100">Mine opgaver</h3>
            </div>

            {loadingTasks || loadingMyTaskIds ? (
                <p className="text-sm text-slate-400">Indlæser dine opgaver...</p>
            ) : error ? (
                <p className="text-sm text-red-400">{error}</p>
            ) : myTasks.length === 0 ? (
                <p className="text-sm text-slate-400">Du er ikke tilmeldt nogen opgaver endnu.</p>
            ) : (
                <ul className="divide-y divide-slate-800">
                    {myTasks.map((task) => (
                        <li key={task.id} className="py-2.5 first:pt-0 last:pb-0">
                            <p className="font-medium text-slate-100 truncate">{task.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-full bg-slate-800 px-2 py-0.5 font-medium text-slate-300">
                                    {STATUS_LABELS[task.status]}
                                </span>
                                {task.priority && (
                                    <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_COLORS[task.priority]}`}>
                                        {PRIORITY_LABELS[task.priority]}
                                    </span>
                                )}
                                {task.end_date && (
                                    <span className="text-slate-400">Slut {formatDate(task.end_date)}</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
