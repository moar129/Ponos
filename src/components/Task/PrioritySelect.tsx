// src/components/Task/PrioritySelect.tsx
import { useTranslation } from 'react-i18next'
import { ALL_PRIORITIES } from '../../utils/taskDisplay'
import type { ETaskPriority, PrioritySelectProps } from '../../types/Task/Task'

// Prioritets-dropdown - i opret/rediger opgave ("Ingen") og i filtrene ("Alle").
export function PrioritySelect<E extends string>({ id, value, emptyValue, emptyLabel, onChange, className }: PrioritySelectProps<E>) {
    const { t } = useTranslation('tasks')

    return (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value as ETaskPriority | E)} className={className}>
            <option value={emptyValue}>{emptyLabel}</option>
            {ALL_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{t(`priority.${priority}`)}</option>
            ))}
        </select>
    )
}
