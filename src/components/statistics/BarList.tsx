import type { BarListProps } from '../../types/statistics/statisticsComponentTypes'

// Horizontal single-hue bars for "compare magnitude" data (priority, rooms,
// categories, item status ...). One series, so no legend - the card title
// names it. Bars use the org accent; labels and values stay in text ink.
export function BarList({ rows, ariaLabel }: BarListProps) {
    const max = Math.max(0, ...rows.map((row) => row.value))

    return (
        <ul aria-label={ariaLabel} className="space-y-2.5">
            {rows.map((row) => {
                const width = max > 0 ? (row.value / max) * 100 : 0
                const valueLabel = row.valueLabel ?? row.value.toLocaleString()

                return (
                    <li
                        key={row.key}
                        title={`${row.label}: ${valueLabel}`}
                        className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3"
                    >
                        <span className="truncate text-sm text-secondary dark:text-slate-300">
                            {row.label}
                        </span>

                        <span className="h-3 w-full">
                            {width > 0 && (
                                <span
                                    className="block h-full rounded-r bg-accent"
                                    style={{ width: `${Math.max(width, 1)}%` }}
                                />
                            )}
                        </span>

                        <span className="text-right text-sm font-semibold tabular-nums text-primary dark:text-slate-100">
                            {valueLabel}
                        </span>
                    </li>
                )
            })}
        </ul>
    )
}
