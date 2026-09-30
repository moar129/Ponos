// src/utils/taskDisplay.ts
import type { ETaskPriority, OpenTaskStatus, Task } from '../types/Task/Task'

// Prioriteterne i visningsrækkefølge. Selve etiketterne ligger i
// tasks-ordbogen (tasks:priority.<værdi>) og hentes med t() i den
// komponent der viser dem - et modul kan ikke kalde useTranslation, og
// en etiket hentet uden for React ville ikke skifte sprog igen.
export const ALL_PRIORITIES: readonly ETaskPriority[] = ['Low', 'Medium', 'High', 'Critical']

// Statusser der har en kolonne på /tasks og /tasks/mine (= "åbne" opgaver).
export const OPEN_TASK_STATUSES: readonly OpenTaskStatus[] = ['Started', 'InProgress']

export function isOpenTask(task: Pick<Task, 'status'>): boolean {
    return (OPEN_TASK_STATUSES as readonly string[]).includes(task.status)
}

// Valgmulighederne for "maks. antal tilmeldte" ved opret/rediger opgave.
export const ASSIGNEE_LIMIT_OPTIONS: readonly number[] = [1, 2, 3, 4, 5, 10]

export const PRIORITY_COLORS: Record<ETaskPriority, string> = {
    Low: 'bg-green-100 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Medium: 'bg-yellow-100 text-yellow-700 dark:bg-amber-900/30 dark:text-amber-400',
    High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const PRIORITY_RANK: Record<ETaskPriority, number> = {
    Critical: 1,
    High: 2,
    Medium: 3,
    Low: 4,
}

/** Sorteringsrang, højeste prioritet først. Ingen prioritet sorteres sidst. */
export function priorityRank(priority: ETaskPriority | null): number {
    return priority ? PRIORITY_RANK[priority] : 5
}
