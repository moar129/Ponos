// src/utils/taskDisplay.ts
import type { ETaskPriority } from '../types/Task/Task'

// Samme danske betegnelser/farver som TaskCard.tsx, delt mellem
// MyTasksWidget.tsx (US-74) og CompletedTasksPanel.tsx (US-70).
export const PRIORITY_LABELS: Record<ETaskPriority, string> = {
    Low: 'Lav',
    Medium: 'Mellem',
    High: 'Høj',
    Critical: 'Kritisk',
}

export const PRIORITY_COLORS: Record<ETaskPriority, string> = {
    Low: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
}

export const PRIORITY_RANK: Record<ETaskPriority, number> = {
    Critical: 1,
    High: 2,
    Medium: 3,
    Low: 4,
}

export function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
}
