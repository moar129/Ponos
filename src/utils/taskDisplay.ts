// src/utils/taskDisplay.ts
import type { ETaskPriority } from '../types/Task/Task'

// Prioriteterne i visningsrækkefølge. Selve etiketterne ligger i
// tasks-ordbogen (tasks:priority.<værdi>) og hentes med t() i den
// komponent der viser dem - et modul kan ikke kalde useTranslation, og
// en etiket hentet uden for React ville ikke skifte sprog igen.
export const ALL_PRIORITIES: ETaskPriority[] = ['Low', 'Medium', 'High', 'Critical']

export const PRIORITY_COLORS: Record<ETaskPriority, string> = {
    Low: 'bg-green-100 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Medium: 'bg-yellow-100 text-yellow-700 dark:bg-amber-900/30 dark:text-amber-400',
    High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const PRIORITY_RANK: Record<ETaskPriority, number> = {
    Critical: 1,
    High: 2,
    Medium: 3,
    Low: 4,
}

// Genudstilles her, så de to widgets der allerede importerer fra denne
// fil ikke skal kende til utils/formatDate. Selve formateringen ligger ét
// sted nu og følger det valgte sprog.
export { formatShortDate as formatDate } from './formatDate'
