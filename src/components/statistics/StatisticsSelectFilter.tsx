import type { StatisticsSelectFilterProps } from '../../types/statistics/statisticsComponentTypes'

// One labelled dropdown in the period card - used for the room filter (US-55)
// and the category filter. "" = no filter.
export function StatisticsSelectFilter({ id, label, allLabel, options, value, onChange }: StatisticsSelectFilterProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={id} className="text-sm font-medium text-primary dark:text-slate-200">
                {label}
            </label>
            <select
                id={id}
                value={value ?? ''}
                onChange={(event) => onChange(event.target.value || null)}
                className="min-w-[12rem] rounded-md border border-border-gray bg-white px-3 py-1.5 text-sm text-primary outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
                <option value="">{allLabel}</option>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}
