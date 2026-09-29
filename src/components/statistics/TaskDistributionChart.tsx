import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { ETaskStatus } from '../../types/Task/Task'
import type { TaskDistributionChartProps } from '../../types/statistics/statisticsComponentTypes'

// The statuses are ordered (available -> in progress -> done), so they get
// an ordinal ramp of the fixed chart blue instead of unrelated hues.
const STATUS_COLORS: Record<ETaskStatus, string> = {
    Started: 'color-mix(in srgb, var(--chart-series-1) 35%, var(--chart-surface))',
    InProgress: 'color-mix(in srgb, var(--chart-series-1) 65%, var(--chart-surface))',
    Completed: 'var(--chart-series-1)',
}

export function TaskDistributionChart({ data }: TaskDistributionChartProps) {
    const { t } = useTranslation(['statistics', 'tasks'])
    const total = data.reduce((sum, item) => sum + item.count, 0)

    const rows = data.map((item) => ({
        status: item.status,
        name: t(`tasks:status.${item.status}`),
        value: item.count,
    }))

    const renderTooltip = ({ active, payload }: TooltipContentProps) => {
        if (!active || !payload?.length) return null
        const entry = payload[0]

        return (
            <div className="rounded-md border border-border-gray bg-white px-3 py-2 text-sm shadow-md dark:border-slate-600 dark:bg-slate-800">
                <span className="text-secondary dark:text-slate-300">{entry.name}</span>
                <span className="ml-3 font-semibold tabular-nums text-primary dark:text-slate-100">{entry.value}</span>
            </div>
        )
    }

    return (
        <div className="flex min-h-[220px] flex-col items-center gap-6 sm:flex-row">
            <div className="h-[220px] w-full min-w-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={rows}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            stroke="var(--chart-surface)"
                            strokeWidth={2}
                        >
                            {rows.map((row) => (
                                <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
                            ))}
                        </Pie>

                        <Tooltip content={renderTooltip} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="w-full shrink-0 space-y-3 sm:w-40">
                {rows.map((row) => (
                    <div key={row.status} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                            <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: STATUS_COLORS[row.status] }}
                            />
                            <span className="truncate text-sm text-secondary dark:text-slate-300">
                                {row.name}
                            </span>
                        </div>

                        <span className="text-sm font-semibold tabular-nums text-primary dark:text-slate-100">
                            {row.value}
                        </span>
                    </div>
                ))}

                <div className="border-t border-border-gray pt-3 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary dark:text-slate-400">
                            {t('status.total')}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-primary dark:text-slate-100">
                            {total}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
