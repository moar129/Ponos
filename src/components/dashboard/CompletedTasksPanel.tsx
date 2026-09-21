// src/components/dashboard/CompletedTasksPanel.tsx
import { readableError } from '../../ErrorMessage';
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Pencil, RotateCcw } from 'lucide-react'
import { useGetCompletedTasksQuery, useUpdateTaskStatusMutation } from '../../store/apis/taskApi'
import { EditTaskModal } from '../Task/EditTaskModal'
import { DELETE_TASKS_PRIVILEGE, UPDATE_TASKS_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import { ALL_PRIORITIES, PRIORITY_COLORS, formatDate } from '../../utils/taskDisplay'
import type { CompletedTaskDetails, ETaskPriority } from '../../types/Task/Task'


// US-70: organisationens afsluttede opgaver med fulde detaljer, til
// opfølgning på udført arbejde. Ekspanderbar række til detaljer (i stedet
// for en separat detalje-modal). Fase 3 trin 6 (2026-09-17): Rediger/
// Genåbn/Slet er tilføjet, gated på update_tasks/delete_tasks - genbruger
// Opgave-domænets EditTaskModal (indeholder nu selv slet) og
// updateTaskStatus (kalder set_task_status-RPC'en).
export function CompletedTasksPanel() {
    const { t } = useTranslation(['dashboard', 'tasks'])
    const { data: tasks, isLoading, error: tasksError } = useGetCompletedTasksQuery()
    const [searchTerm, setSearchTerm] = useState('')
    const [priorityFilter, setPriorityFilter] = useState<ETaskPriority | 'all'>('all')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [editingTask, setEditingTask] = useState<CompletedTaskDetails | null>(null)

    const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_TASKS_PRIVILEGE)
    const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_TASKS_PRIVILEGE)
    const [updateTaskStatus, { isLoading: isReopening, error: reopenError }] = useUpdateTaskStatusMutation()

    // Kun listens EGEN hentefejl blokerer hele panelet - en fejl ved
    // genåbning må ikke fjerne den allerede indlæste liste, så den vises
    // i stedet inline i den ekspanderede række.
    const error = readableError(tasksError)
    const reopenErrorMessage = readableError(reopenError)

    if (isLoading) {
        return <p className="text-secondary dark:text-slate-400">{t('completedTasks.loading')}</p>
    }

    if (error) {
        return (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                {error}
            </div>
        )
    }

    if (!tasks || tasks.length === 0) {
        return <p className="text-secondary dark:text-slate-400">{t('completedTasks.empty')}</p>
    }

    const filteredTasks = tasks.filter((task) => {
        const matchesSearch =
            searchTerm.trim() === '' ||
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.description ?? '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
        return matchesSearch && matchesPriority
    })

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('completedTasks.searchPlaceholder')}
                    className="flex-1 min-w-[200px] rounded-md border border-border-gray bg-white px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as ETaskPriority | 'all')}
                    className="rounded-md border border-border-gray bg-white px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                    <option value="all">{t('completedTasks.allPriorities')}</option>
                    {ALL_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>{t(`tasks:priority.${priority}`)}</option>
                    ))}
                </select>
            </div>

            {filteredTasks.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('completedTasks.noMatch')}</p>
            ) : (
                <ul className="divide-y divide-border-gray border-t border-border-gray dark:divide-slate-700 dark:border-slate-700">
                    {filteredTasks.map((task) => (
                        <CompletedTaskRow
                            key={task.id}
                            task={task}
                            isExpanded={expandedId === task.id}
                            onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                            onEdit={() => setEditingTask(task)}
                            onReopen={() => updateTaskStatus({ id: task.id, status: 'InProgress' })}
                            isReopening={isReopening}
                            reopenErrorMessage={reopenErrorMessage}
                        />
                    ))}
                </ul>
            )}

            {editingTask && (
                <EditTaskModal
                    isOpen={editingTask !== null}
                    onClose={() => setEditingTask(null)}
                    task={editingTask}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                />
            )}
        </div>
    )
}

function CompletedTaskRow({
    task,
    isExpanded,
    onToggle,
    canUpdate,
    canDelete,
    onEdit,
    onReopen,
    isReopening,
    reopenErrorMessage,
}: {
    task: CompletedTaskDetails
    isExpanded: boolean
    onToggle: () => void
    canUpdate: boolean
    canDelete: boolean
    onEdit: () => void
    onReopen: () => void
    isReopening: boolean
    reopenErrorMessage: string | null
}) {
    const { t } = useTranslation(['dashboard', 'tasks'])

    return (
        <li className="py-3">
            <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-4 text-left">
                <div>
                    <p className="font-medium text-primary dark:text-slate-100">{task.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {task.priority && (
                            <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_COLORS[task.priority]}`}>
                                {t(`tasks:priority.${task.priority}`)}
                            </span>
                        )}
                        {task.end_date && (
                            <span className="text-secondary dark:text-slate-400">{t('myTasks.endsOn', { date: formatDate(task.end_date) })}</span>
                        )}
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-secondary shrink-0 dark:text-slate-400" /> : <ChevronDown className="w-4 h-4 text-secondary shrink-0 dark:text-slate-400" />}
            </button>

            {isExpanded && (
                <div className="mt-3 space-y-2 text-sm text-secondary dark:text-slate-400">
                    <p>{task.description || t('completedTasks.noDescription')}</p>
                    <p><span className="font-medium text-primary dark:text-slate-100">{t('completedTasks.room')}</span> {task.roomName ?? t('completedTasks.noRoom')}</p>
                    <p>
                        <span className="font-medium text-primary dark:text-slate-100">{t('completedTasks.period')}</span>{' '}
                        {task.start_date ? formatDate(task.start_date) : t('completedTasks.unknown')} – {task.end_date ? formatDate(task.end_date) : t('completedTasks.unknown')}
                    </p>
                    <div>
                        <span className="font-medium text-primary dark:text-slate-100">{t('completedTasks.assignees')}</span>{' '}
                        {task.assignees.length > 0 ? task.assignees.map((a) => a.name || t('tasks:assignees.unknownUser')).join(', ') : t('completedTasks.noAssignees')}
                    </div>
                    <div>
                        <span className="font-medium text-primary dark:text-slate-100">{t('completedTasks.materials')}</span>{' '}
                        {task.materials.length > 0
                            ? task.materials.map((m) => `${m.name} (${m.quantity})`).join(', ')
                            : t('completedTasks.noMaterials')}
                    </div>

                    {(canUpdate || canDelete) && (
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            <button
                                type="button"
                                onClick={onEdit}
                                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                {t('completedTasks.edit')}
                            </button>
                            {canUpdate && (
                                <button
                                    type="button"
                                    onClick={onReopen}
                                    disabled={isReopening}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-60 dark:text-emerald-400 dark:hover:text-emerald-300"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    {isReopening ? t('completedTasks.reopening') : t('completedTasks.reopen')}
                                </button>
                            )}
                        </div>
                    )}
                    {reopenErrorMessage && (
                        <p className="text-sm text-red-700 dark:text-red-400">{reopenErrorMessage}</p>
                    )}
                </div>
            )}
        </li>
    )
}
