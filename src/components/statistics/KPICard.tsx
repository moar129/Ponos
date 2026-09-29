import type { KPICardProps, KpiTrend } from '../../types/statistics/statisticsComponentTypes'

// Good/bad only where the direction has a meaning (e.g. more overdue tasks is
// bad); always with arrow + text, never colour alone.
const TREND_TONE: Record<KpiTrend['tone'], string> = {
    good: 'text-green-700 dark:text-green-400',
    bad: 'text-red-700 dark:text-red-400',
    neutral: 'text-secondary dark:text-slate-400',
}

export function KPICard({
    title,
    value = null,
    detail,
    trend,
    icon,
    unit,
    loading = false,
}: KPICardProps) {
    const hasValue = value !== null && value !== undefined

    return (
        <div className="rounded-lg border border-border-gray bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-secondary dark:text-slate-400">
                        {title}
                    </p>

                    <div className="mt-2">
                        {loading ? (
                            <div className="h-8 w-20 animate-pulse rounded bg-bg-gray dark:bg-slate-700" />
                        ) : hasValue ? (
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-semibold text-primary dark:text-slate-100">
                                    {value}
                                </span>

                                {unit && (
                                    <span className="text-sm text-secondary dark:text-slate-400">
                                        {unit}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-2xl font-semibold text-secondary dark:text-slate-500">
                                —
                            </span>
                        )}
                    </div>

                    {detail && !loading && (
                        <p className="mt-1 text-xs text-secondary dark:text-slate-400">{detail}</p>
                    )}

                    {trend && !loading && (
                        <p className={`mt-1 text-xs font-medium ${TREND_TONE[trend.tone]}`}>
                            {trend.text}
                        </p>
                    )}
                </div>

                {icon && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-gray/60 text-secondary dark:bg-slate-700 dark:text-slate-300">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    )
}
