import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { StatisticsGranularity } from '../../types/statistics/statisticsTypes'
import type { TaskDevelopmentChartProps } from '../../types/statistics/statisticsComponentTypes'

// Fixed chart colours (not the org colour); slots 1-2 of the validated palette.
const CREATED_COLOR = 'var(--chart-series-1)'
const COMPLETED_COLOR = 'var(--chart-series-2)'

// Buckets come from the RPC as local 'YYYY-MM-DDTHH:mm'.
function parseBucket(bucket: string): Date {
    const [date, time = '00:00'] = bucket.split('T')
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    return new Date(year, month - 1, day, hour, minute)
}

const TICK_FORMAT: Record<StatisticsGranularity, Intl.DateTimeFormatOptions> = {
    hour: { hour: '2-digit', minute: '2-digit' },
    day: { day: 'numeric', month: 'numeric' },
    week: { day: 'numeric', month: 'numeric' },
    month: { month: 'short', year: '2-digit' },
}

const TOOLTIP_FORMAT: Record<StatisticsGranularity, Intl.DateTimeFormatOptions> = {
    hour: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
    day: { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
    week: { day: 'numeric', month: 'short', year: 'numeric' },
    month: { month: 'long', year: 'numeric' },
}

export function TaskDevelopmentChart({ data, granularity }: TaskDevelopmentChartProps) {
    const { t, i18n } = useTranslation('statistics')

    const formatTick = (bucket: string) =>
        new Intl.DateTimeFormat(i18n.language, TICK_FORMAT[granularity]).format(parseBucket(bucket))

    const formatTooltipLabel = (bucket: string) =>
        new Intl.DateTimeFormat(i18n.language, TOOLTIP_FORMAT[granularity]).format(parseBucket(bucket))

    const seriesLabel = (key: string) =>
        key === 'created' ? t('development.created') : t('development.completed')

    const renderTooltip = ({ active, payload, label }: TooltipContentProps) => {
        if (!active || !payload?.length) return null

        return (
            <div className="rounded-md border border-border-gray bg-white px-3 py-2 text-sm shadow-md dark:border-slate-600 dark:bg-slate-800">
                <p className="mb-1 font-medium text-primary dark:text-slate-100">
                    {formatTooltipLabel(String(label))}
                </p>
                {payload.map((entry) => (
                    <p key={String(entry.dataKey)} className="flex items-center gap-2 text-secondary dark:text-slate-300">
                        <span className="h-0.5 w-3 rounded" style={{ backgroundColor: entry.color }} />
                        {seriesLabel(String(entry.dataKey))}
                        <span className="ml-auto pl-3 font-semibold tabular-nums text-primary dark:text-slate-100">
                            {entry.value}
                        </span>
                    </p>
                ))}
            </div>
        )
    }

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />

                    <XAxis
                        dataKey="bucket"
                        tickFormatter={formatTick}
                        tick={{ fontSize: 12, fill: 'var(--chart-axis)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--chart-grid)' }}
                        minTickGap={16}
                    />

                    <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: 'var(--chart-axis)' }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                    />

                    <Tooltip
                        content={renderTooltip}
                        cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                    />

                    <Line
                        type="monotone"
                        dataKey="created"
                        stroke={CREATED_COLOR}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
                    />

                    <Line
                        type="monotone"
                        dataKey="completed"
                        stroke={COMPLETED_COLOR}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
                    />
                </LineChart>
            </ResponsiveContainer>

            <div className="mt-2 flex justify-center gap-6">
                {(['created', 'completed'] as const).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                        <span
                            className="h-0.5 w-4 rounded"
                            style={{ backgroundColor: key === 'created' ? CREATED_COLOR : COMPLETED_COLOR }}
                        />
                        <span className="text-xs text-secondary dark:text-slate-400">
                            {seriesLabel(key)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
