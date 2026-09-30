import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useTranslation } from 'react-i18next'
import { DEVELOPMENT_METRICS } from '../../utils/statisticsSnapshot'
import type { DevelopmentMetric } from '../../utils/statisticsSnapshot'
import type { SnapshotDevelopmentChartProps } from '../../types/statistics/statisticsComponentTypes'
import { formatDecimal } from '../../utils/formatDate'

// One fixed color per column position (never cycled; max 4 snapshots).
const SERIES_COLORS = ['var(--chart-series-1)', 'var(--chart-series-2)', 'var(--chart-series-3)', 'var(--chart-series-4)']

interface ChartRow {
    label: string
    [series: string]: string | number | null
}

// Created/completed per sub-period, one line per snapshot, aligned like the
// table (calendar position when possible, otherwise dates).
export function SnapshotDevelopmentChart({ comparison, names }: SnapshotDevelopmentChartProps) {
    const { t } = useTranslation('statistics')
    const [metric, setMetric] = useState<DevelopmentMetric>('created')

    const rows = comparison.rows[metric]
    const data: ChartRow[] = rows.map((row) => {
        const point: ChartRow = { label: row.label }
        row.cells.forEach((cell, index) => {
            point[`s${index}`] = cell?.value ?? null
            point[`p${index}`] = cell?.partialRange ?? null
        })
        return point
    })

    const renderTooltip = ({ active, payload, label }: TooltipContentProps) => {
        if (!active || !payload?.length) return null
        const row = payload[0].payload as ChartRow

        return (
            <div className="rounded-md border border-border-gray bg-white px-3 py-2 text-sm shadow-md dark:border-slate-600 dark:bg-slate-800">
                <p className="mb-1 font-medium capitalize text-primary dark:text-slate-100">{String(label)}</p>
                {names.map((name, index) => {
                    const value = row[`s${index}`]
                    const partial = row[`p${index}`]
                    return (
                        <p key={name + index} className="flex items-center gap-2 text-secondary dark:text-slate-300">
                            <span className="h-0.5 w-3 rounded" style={{ backgroundColor: SERIES_COLORS[index] }} />
                            {name}
                            <span className="ml-auto pl-3 font-semibold tabular-nums text-primary dark:text-slate-100">
                                {typeof value === 'number' ? formatDecimal(value) : '–'}
                            </span>
                            {partial && <span className="text-xs text-secondary dark:text-slate-400">({partial})</span>}
                        </p>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-primary dark:text-slate-100">{t('snapshots.developmentTitle')}</h3>

                <div className="flex gap-1" role="group" aria-label={t('snapshots.developmentTitle')}>
                    {DEVELOPMENT_METRICS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            aria-pressed={metric === option}
                            onClick={() => setMetric(option)}
                            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${metric === option
                                ? 'bg-primary text-white dark:bg-accent dark:text-accent-text'
                                : 'bg-bg-gray/60 text-secondary hover:bg-bg-gray dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                }`}
                        >
                            {t(`development.${option}`)}
                        </button>
                    ))}
                </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: 'var(--chart-axis)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--chart-grid)' }}
                        minTickGap={12}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: 'var(--chart-axis)' }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                    />
                    <Tooltip content={renderTooltip} cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }} />
                    {names.map((name, index) => (
                        <Line
                            key={name + index}
                            type="monotone"
                            dataKey={`s${index}`}
                            name={name}
                            stroke={SERIES_COLORS[index]}
                            strokeWidth={2}
                            dot={false}
                            connectNulls={false}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>

            {names.length > 1 && (
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
                    {names.map((name, index) => (
                        <div key={name + index} className="flex items-center gap-2">
                            <span className="h-0.5 w-4 rounded" style={{ backgroundColor: SERIES_COLORS[index] }} />
                            <span className="text-xs text-secondary dark:text-slate-400">{name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
