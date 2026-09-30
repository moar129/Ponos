import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDecimal, formatPercent } from '../../utils/formatDate'
import type { ApprovalChartProps } from '../../types/statistics/statisticsComponentTypes'

// Status colors are fixed and always paired with an icon + label.
const SEGMENTS = [
    { key: 'accepted', color: 'var(--chart-good)', Icon: CheckCircle2 },
    { key: 'pending', color: 'var(--chart-warning)', Icon: Clock3 },
    { key: 'rejected', color: 'var(--chart-critical)', Icon: XCircle },
] as const

export function ApprovalChart({ data }: ApprovalChartProps) {
    const { t } = useTranslation('statistics')
    const total = data.accepted + data.pending + data.rejected

    // Median handling time: hours below 48 h, otherwise days.
    const median = (() => {
        if (data.medianHours === null) return '–'
        if (data.medianHours < 48) {
            return t('approvals.hours', { count: data.medianHours, formatted: formatDecimal(data.medianHours) })
        }
        const days = Math.round((data.medianHours / 24) * 10) / 10
        return t('approvals.days', { count: days, formatted: formatDecimal(days) })
    })()

    const visible = SEGMENTS.filter((segment) => data[segment.key] > 0)

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-secondary dark:text-slate-400">{t('approvals.rate')}</p>
                    <p className="mt-1 text-2xl font-semibold text-primary dark:text-slate-100">
                        {data.rate === null ? '–' : formatPercent(data.rate)}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-secondary dark:text-slate-400">{t('approvals.median')}</p>
                    <p className="mt-1 text-2xl font-semibold text-primary dark:text-slate-100">{median}</p>
                </div>
            </div>

            <div className="flex h-3 w-full gap-0.5" role="img" aria-label={t('approvals.title')}>
                {visible.map((segment, index) => (
                    <span
                        key={segment.key}
                        title={`${t(`approvals.${segment.key}`)}: ${data[segment.key]}`}
                        className={`block h-full ${index === 0 ? 'rounded-l' : ''} ${index === visible.length - 1 ? 'rounded-r' : ''}`}
                        style={{ width: `${(data[segment.key] / total) * 100}%`, backgroundColor: segment.color }}
                    />
                ))}
            </div>

            <ul className="space-y-2">
                {SEGMENTS.map(({ key, color, Icon }) => (
                    <li key={key} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-secondary dark:text-slate-300">
                            <Icon className="h-4 w-4" style={{ color }} aria-hidden />
                            {t(`approvals.${key}`)}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-primary dark:text-slate-100">
                            {data[key]}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
