// src/components/dashboard/MyTasksWidget.tsx
import { readableError } from '../../ErrorMessage';
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ListChecks, Star } from 'lucide-react'
import { useGetMyTaskIdsQuery, useGetTasksQuery } from '../../store/apis/taskApi'
import { READ_TASKS_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import { FavoriteRoomsList } from './FavoriteRoomsList'
import { formatShortDate } from '../../utils/formatDate'
import { PriorityBadge } from '../Task/PriorityBadge'
import { DashboardWidget, PillTabs } from './DashboardWidget'
import { compareTasks } from '../../utils/taskFilters'

const MAX_TASKS = 5

type MyTasksTab = 'tasks' | 'favorites'

// Valgt fane huskes pr. browser (bekvemmelighed, ikke vigtig state).
const TAB_STORAGE_KEY = 'ponos.dashboard.myTasksTab'

function readStoredTab(): MyTasksTab {
    try {
        return localStorage.getItem(TAB_STORAGE_KEY) === 'favorites' ? 'favorites' : 'tasks'
    } catch {
        return 'tasks'
    }
}

// Prioritet først, så nærmeste slutdato - delt med /tasks (utils/taskFilters.ts).
const sortByPriorityThenEndDate = compareTasks('priority')


// US-74: brugerens egne, ikke-afsluttede opgaver på Oversigt-fanen.
// getTasks er filtreret på aktiv organisation, og task_assignees er
// RLS-scopet til samme, så snittet kan aldrig indeholde andre
// organisationers opgaver. Rækkerne navigerer til /tasks/mine?task=<id>, hvor
// MyTasksPage åbner opgavens egen popup (TaskCard). US-77: fanen
// "Favoritrum" (FavoriteRoomsList) vises kun med read_tasks.
export function MyTasksWidget() {
    const { t } = useTranslation(['dashboard', 'tasks'])
    const navigate = useNavigate()
    const { hasPrivilege: canReadTasks } = useHasPrivilege(READ_TASKS_PRIVILEGE)
    const [storedTab, setStoredTab] = useState<MyTasksTab>(readStoredTab)
    const tab: MyTasksTab = canReadTasks ? storedTab : 'tasks'

    const selectTab = (next: MyTasksTab) => {
        setStoredTab(next)
        try {
            localStorage.setItem(TAB_STORAGE_KEY, next)
        } catch {
            // Ingen storage (privat vindue o.l.) - fanen huskes bare ikke.
        }
    }

    const { data: tasks = [], isLoading: loadingTasks, error: tasksError } = useGetTasksQuery()
    const { data: myTaskIds = [], isLoading: loadingMyTaskIds, error: myTaskIdsError } = useGetMyTaskIdsQuery()

    const myTasks = tasks
        .filter((task) => myTaskIds.includes(task.id) && task.status !== 'Completed')
        .sort(sortByPriorityThenEndDate)
        .slice(0, MAX_TASKS)

    const error = readableError(tasksError) ?? readableError(myTaskIdsError)

    return (
        <DashboardWidget
            icon={tab === 'favorites'
                ? <Star className="w-5 h-5 text-amber-500 dark:text-amber-400" fill="currentColor" />
                : <ListChecks className="w-5 h-5 text-secondary dark:text-slate-400" />}
            title={tab === 'favorites' ? t('favoriteRooms.title') : t('myTasks.title')}
            link={tab === 'favorites'
                ? { to: '/tasks', label: t('favoriteRooms.goToTasks') }
                : { to: '/tasks/mine', label: t('myTasks.goToTasks') }}
            actions={canReadTasks && (
                <PillTabs
                    tabs={[
                        { key: 'tasks', label: t('myTasks.tab') },
                        { key: 'favorites', label: t('favoriteRooms.tab') },
                    ]}
                    active={tab}
                    onSelect={selectTab}
                />
            )}
        >
            {tab === 'favorites' ? (
                <FavoriteRoomsList />
            ) : loadingTasks || loadingMyTaskIds ? (
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
                                    {task.priority && <PriorityBadge priority={task.priority} />}
                                    {task.end_date && (
                                        <span className="text-secondary dark:text-slate-400">{t('myTasks.endsOn', { date: formatShortDate(task.end_date) })}</span>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </DashboardWidget>
    )
}
