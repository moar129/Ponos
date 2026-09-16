// src/components/dashboard/CompletedTasksPanel.tsx
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useGetCompletedTasksQuery } from '../../store/apis/taskApi'
import { PRIORITY_COLORS, PRIORITY_LABELS, formatDate } from '../../utils/taskDisplay'
import type { CompletedTaskDetails, ETaskPriority } from '../../types/Task/Task'

function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

// US-70: organisationens afsluttede opgaver med fulde detaljer, til
// opfølgning på udført arbejde. Ren visning - "marker som færdig" hører
// til US-39 (Studerende 3, endnu ikke bygget), så listen er reelt tom
// indtil da; testdata sættes manuelt i Supabase. Ekspanderbar række i
// stedet for en separat modal - ingen ny modal-komponent nødvendig, og
// EditTaskModal.tsx (Studerende 3's fil) røres ikke.
export function CompletedTasksPanel() {
    const { data: tasks, isLoading, error: tasksError } = useGetCompletedTasksQuery()
    const [searchTerm, setSearchTerm] = useState('')
    const [priorityFilter, setPriorityFilter] = useState<ETaskPriority | 'all'>('all')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const error = readableError(tasksError)

    if (isLoading) {
        return <p className="text-slate-400">Indlæser afsluttede opgaver...</p>
    }

    if (error) {
        return (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                {error}
            </div>
        )
    }

    if (!tasks || tasks.length === 0) {
        return <p className="text-slate-400">Ingen opgaver er markeret som afsluttede endnu.</p>
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
                    placeholder="Søg efter titel eller beskrivelse..."
                    className="flex-1 min-w-[200px] rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-accent"
                />
                <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as ETaskPriority | 'all')}
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-accent"
                >
                    <option value="all">Alle prioriteter</option>
                    {(Object.keys(PRIORITY_LABELS) as ETaskPriority[]).map((priority) => (
                        <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
                    ))}
                </select>
            </div>

            {filteredTasks.length === 0 ? (
                <p className="text-slate-400">Ingen opgaver matcher søgningen/filteret.</p>
            ) : (
                <ul className="divide-y divide-slate-800 border-t border-slate-800">
                    {filteredTasks.map((task) => (
                        <CompletedTaskRow
                            key={task.id}
                            task={task}
                            isExpanded={expandedId === task.id}
                            onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}

function CompletedTaskRow({
    task,
    isExpanded,
    onToggle,
}: {
    task: CompletedTaskDetails
    isExpanded: boolean
    onToggle: () => void
}) {
    return (
        <li className="py-3">
            <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-4 text-left">
                <div>
                    <p className="font-medium text-slate-100">{task.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {task.priority && (
                            <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_COLORS[task.priority]}`}>
                                {PRIORITY_LABELS[task.priority]}
                            </span>
                        )}
                        {task.end_date && (
                            <span className="text-slate-400">Slut {formatDate(task.end_date)}</span>
                        )}
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>

            {isExpanded && (
                <div className="mt-3 space-y-2 text-sm text-slate-400">
                    <p>{task.description || 'Ingen beskrivelse.'}</p>
                    <p><span className="font-medium text-slate-100">Rum:</span> {task.roomName ?? 'Intet rum'}</p>
                    <p>
                        <span className="font-medium text-slate-100">Periode:</span>{' '}
                        {task.start_date ? formatDate(task.start_date) : 'Ukendt'} – {task.end_date ? formatDate(task.end_date) : 'Ukendt'}
                    </p>
                    <div>
                        <span className="font-medium text-slate-100">Tilmeldte:</span>{' '}
                        {task.assignees.length > 0 ? task.assignees.map((a) => a.name).join(', ') : 'Ingen tilmeldte'}
                    </div>
                    <div>
                        <span className="font-medium text-slate-100">Materialer:</span>{' '}
                        {task.materials.length > 0
                            ? task.materials.map((m) => `${m.name} (${m.quantity})`).join(', ')
                            : 'Ingen materialer'}
                    </div>
                </div>
            )}
        </li>
    )
}
