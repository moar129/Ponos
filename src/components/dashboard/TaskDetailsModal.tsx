// src/components/dashboard/TaskDetailsModal.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGetTaskAssigneesQuery } from '../../store/apis/taskApi'
import { supabase } from '../../lib/supabase'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/taskDisplay'
import type { ETaskStatus, Task } from '../../types/Task/Task'

const STATUS_LABELS: Record<ETaskStatus, string> = {
    Started: 'Tilgængelig',
    InProgress: 'I gang',
    Completed: 'Færdig',
}

function formatFullDate(date: string | null): string {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getInitials(name: string): string {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

type AssigneeProfile = { name: string; url_picture: string | null }

// Read-only preview af en opgave, åbnet fra MyTasksWidget.tsx (US-74). Ingen
// tildel/afmeld/rediger-handlinger - fuld håndtering sker på /tasks. Henter
// selv navne på ansvarlige (duplikeret fra TaskCard.tsx linje 56-95, samme
// begrundelse som sortByPriorityThenEndDate i MyTasksWidget.tsx) i stedet for
// at trække delt kode ud af Tasks-domænets fil.
export function TaskDetailsModal({ task, onClose }: { task: Task; onClose: () => void }) {
    const { data: assignees = [] } = useGetTaskAssigneesQuery(task.id)
    const [assigneeProfiles, setAssigneeProfiles] = useState<Record<string, AssigneeProfile>>({})

    useEffect(() => {
        const loadAssigneeProfiles = async () => {
            if (assignees.length === 0) {
                setAssigneeProfiles({})
                return
            }

            const userIds = assignees.map((assignee) => assignee.user_id)
            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, url_picture')
                .in('id', userIds)

            if (error || !data) return

            const profiles: Record<string, AssigneeProfile> = {}
            data.forEach((profile) => {
                profiles[profile.id] = {
                    name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
                    url_picture: profile.url_picture,
                }
            })
            setAssigneeProfiles(profiles)
        }

        loadAssigneeProfiles()
    }, [assignees])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-xl bg-white border border-border-gray p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">{task.title}</h2>
                        <p className="mt-1 text-sm text-secondary">Opgavedetaljer</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-secondary hover:text-primary">
                        X
                    </button>
                </div>

                <div className="mb-5 rounded-lg border border-border-gray bg-bg-gray/40 p-4">
                    <span className="mb-2 block text-xs font-bold uppercase text-secondary">Beskrivelse</span>
                    <p className="break-words text-sm text-secondary">{task.description || 'Ingen beskrivelse'}</p>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary">
                        {STATUS_LABELS[task.status]}
                    </span>
                    {task.priority && (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                            Prioritet: {PRIORITY_LABELS[task.priority]}
                        </span>
                    )}
                </div>

                <div className="mb-6">
                    <span className="mb-3 block text-xs font-bold uppercase text-secondary">Ansvarlige</span>

                    {assignees.length === 0 ? (
                        <p className="text-sm text-secondary">Ingen er tildelt endnu.</p>
                    ) : (
                        <div className="space-y-2">
                            {assignees.map((assignee) => {
                                const profile = assigneeProfiles[assignee.user_id]
                                const name = profile?.name || 'Ukendt bruger'

                                return (
                                    <div
                                        key={assignee.user_id}
                                        className="flex items-center gap-3 rounded-lg border border-border-gray px-4 py-3"
                                    >
                                        {profile?.url_picture ? (
                                            <img
                                                src={profile.url_picture}
                                                alt={name}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-gray text-sm font-bold text-primary">
                                                {getInitials(name)}
                                            </div>
                                        )}
                                        <p className="font-medium text-primary">{name}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border-gray p-4">
                        <span className="block text-xs font-semibold uppercase text-secondary">Startdato</span>
                        <span className="mt-1 block font-medium text-primary">{formatFullDate(task.start_date)}</span>
                    </div>
                    <div className="rounded-lg border border-border-gray p-4">
                        <span className="block text-xs font-semibold uppercase text-secondary">Slutdato</span>
                        <span className="mt-1 block font-medium text-primary">{formatFullDate(task.end_date)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <Link to="/tasks" className="text-sm text-accent hover:underline">
                        Gå til opgaver
                    </Link>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-bg-gray px-5 py-2 text-sm font-semibold text-primary hover:bg-gray-300"
                    >
                        Luk
                    </button>
                </div>
            </div>
        </div>
    )
}
