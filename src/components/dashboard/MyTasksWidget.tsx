// src/components/dashboard/MyTasksWidget.tsx
import { readableError } from '../../ErrorMessage';
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ListChecks } from 'lucide-react'
import { useGetMyTaskIdsQuery, useGetTasksQuery } from '../../store/apis/taskApi'
import { PRIORITY_COLORS, PRIORITY_RANK, formatDate } from '../../utils/taskDisplay'
import type { Task } from '../../types/Task/Task'

const MAX_TASKS = 5

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


// US-74: brugerens egne, ikke-afsluttede opgaver på Oversigt-fanen.
// getTasks er filtreret på aktiv organisation, og task_assignees er
// RLS-scopet til samme, så snittet kan aldrig indeholde andre
// organisationers opgaver. Rækkerne navigerer til /tasks/mine?task=<id>, hvor
// MyTasksPage åbner opgavens egen popup (TaskCard).
export function MyTasksWidget() {
    const { t } = useTranslation(['dashboard', 'tasks'])
    const navigate = useNavigate()
    const { data: tasks = [], isLoading: loadingTasks, error: tasksError } = useGetTasksQuery()
    const { data: myTaskIds = [], isLoading: loadingMyTaskIds, error: myTaskIdsError } = useGetMyTaskIdsQuery()

    const myTasks = tasks
        .filter((task) => myTaskIds.includes(task.id) && task.status !== 'Completed')
        .sort(sortByPriorityThenEndDate)
        .slice(0, MAX_TASKS)

    const error = readableError(tasksError) ?? readableError(myTaskIdsError)

    return (
        <div className="rounded-lg border border-border-gray bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-secondary dark:text-slate-400" />
                    <h3 className="font-medium text-primary dark:text-slate-100">{t('myTasks.title')}</h3>
                </div>
                <Link to="/tasks/mine"className="flex items-center gap-1 text-sm text-accent hover:underline shrink-0">
                    {t('myTasks.goToTasks')}
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {loadingTasks || loadingMyTaskIds ? (
                <p className="text-sm text-secondary dark:text-slate-400">{t('myTasks.loading')}</p>
            ) : error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : myTasks.length === 0 ? (
                <p className="text-sm text-secondary dark:text-slate-400">{t('myTasks.empty')}</p>
            ) : (
                <ul className="divide-y divide-border-gray dark:divide-slate-700">
                    {myTasks.map((task) => (
                        <li key={task.id}>
                            <button
                                type="button"
                                onClick={() => navigate(`/tasks/mine?task=${task.id}`)}
                                className="w-full text-left py-2.5 -mx-2 px-2 rounded-md transition-colors hover:bg-bg-gray/50 dark:hover:bg-slate-700/50"
                            >
                                <p className="font-medium text-primary truncate dark:text-slate-100">{task.title}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded-full bg-bg-gray px-2 py-0.5 font-medium text-secondary dark:bg-slate-700 dark:text-slate-400">
                                        {t(`tasks:status.${task.status}`)}
                                    </span>
                                    {task.priority && (
                                        <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_COLORS[task.priority]}`}>
                                            {t(`tasks:priority.${task.priority}`)}
                                        </span>
                                    )}
                                    {task.end_date && (
                                        <span className="text-secondary dark:text-slate-400">{t('myTasks.endsOn', { date: formatDate(task.end_date) })}</span>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
