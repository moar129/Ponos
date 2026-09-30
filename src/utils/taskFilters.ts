import type { ApprovalSortOption, PendingTaskRequest, Task, TaskSortOption } from '../types/Task/Task'
import { priorityRank } from './taskDisplay'

// Delt søg/sortering for /tasks, /tasks/mine og dashboardets "Dine opgaver"
// (tidligere kopieret tre steder).

// Manglende værdi sorteres altid sidst, uanset retning.
export function compareNullable(a: string | null, b: string | null, direction: 1 | -1 = 1): number {
    if (a && b) return direction * a.localeCompare(b)
    if (a) return -1
    if (b) return 1
    return 0
}

const byCreatedDesc = (a: Task, b: Task): number => b.created_at.localeCompare(a.created_at)

export function compareTasks(sortBy: TaskSortOption): (a: Task, b: Task) => number {
    switch (sortBy) {
        // Prioritet (manglende = sidst), så nærmeste deadline.
        case 'priority':
            return (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || compareNullable(a.end_date, b.end_date)
        // Nærmeste deadline (manglende sidst), så prioritet, så nyeste.
        case 'deadline':
            return (a, b) =>
                compareNullable(a.end_date, b.end_date) || priorityRank(a.priority) - priorityRank(b.priority) || byCreatedDesc(a, b)
        case 'newest':
            return byCreatedDesc
        case 'oldest':
            return (a, b) => a.created_at.localeCompare(b.created_at)
    }
}

// Case-insensitiv søgning i titel, beskrivelse, rumnavn og tilmeldtes navne.
// term forventes allerede trimmet og i små bogstaver; tom term matcher alt.
export function matchesTaskSearch(
    task: Task,
    roomName: string | undefined,
    assigneeNames: string[] | undefined,
    term: string,
): boolean {
    if (term === '') return true
    return (
        task.title.toLowerCase().includes(term) ||
        (task.description ?? '').toLowerCase().includes(term) ||
        (roomName ?? '').toLowerCase().includes(term) ||
        (assigneeNames ?? []).some((name) => name.toLowerCase().includes(term))
    )
}

// Godkendelseslisten (TaskApprovalsPanel). Uafgjort -> ældste
// færdigmelding først, så ingen venter unødigt længe.
const byRequestedAsc = (a: PendingTaskRequest, b: PendingTaskRequest): number => a.requestedAt.localeCompare(b.requestedAt)

export function compareApprovalRequests(sortBy: ApprovalSortOption): (a: PendingTaskRequest, b: PendingTaskRequest) => number {
    switch (sortBy) {
        case 'oldest':
            return byRequestedAsc
        case 'newest':
            return (a, b) => b.requestedAt.localeCompare(a.requestedAt)
        case 'priority':
            return (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || byRequestedAsc(a, b)
        case 'deadline':
            return (a, b) => compareNullable(a.endDate, b.endDate) || byRequestedAsc(a, b)
        case 'rejections':
            return (a, b) => b.rejectionCount - a.rejectionCount || byRequestedAsc(a, b)
    }
}
