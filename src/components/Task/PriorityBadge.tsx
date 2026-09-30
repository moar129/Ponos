// src/components/Task/PriorityBadge.tsx
import { useTranslation } from 'react-i18next'
import { PRIORITY_COLORS } from '../../utils/taskDisplay'
import type { PriorityBadgeProps } from '../../types/Task/Task'

// Farvet prioritets-mærke. Delt af opgavekort, godkendelser, afsluttede
// opgaver og dashboardets "Dine opgaver".
export function PriorityBadge({ priority, size = 'sm', label }: PriorityBadgeProps) {
    const { t } = useTranslation('tasks')
    const sizeClass = size === 'md' ? 'px-3 py-1 font-semibold' : 'px-2 py-0.5 font-medium'

    return (
        <span className={`rounded-full text-xs ${sizeClass} ${PRIORITY_COLORS[priority]}`}>
            {label ?? t(`priority.${priority}`)}
        </span>
    )
}
