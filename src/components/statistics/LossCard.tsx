import { useTranslation } from 'react-i18next'
import { BarList } from './BarList'
import { TREND_TONE, kpiTrend } from '../../utils/statisticsTrend'
import type { LossCardProps } from '../../types/statistics/statisticsComponentTypes'

// Loss and damage in the period (units that became Missing/Damaged), with the
// change against the previous period, plus consumption (Brugt op) on its own -
// using up tape and bags is expected and must not inflate the loss figure.
export function LossCard({ loss, previousLoss, previousPeriod, categoryName }: LossCardProps) {
    const { t, i18n } = useTranslation(['statistics', 'datalayer'])

    const total = loss.missing + loss.damaged
    const previousTotal = previousLoss ? previousLoss.missing + previousLoss.damaged : null
    const trend = previousTotal === null
        ? null
        : kpiTrend(
            total,
            previousTotal,
            'down',
            i18n.language,
            (change) => t('kpi.trend', { change, previous: previousTotal, period: previousPeriod }),
            t('kpi.trendSame', { previous: previousTotal, period: previousPeriod }),
        )

    const rows = loss.byCategory
        .filter((row) => row.count > 0)
        .map((row) => ({ key: row.categoryId, label: row.title, value: row.count }))

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <p className="text-2xl font-semibold tabular-nums text-primary dark:text-slate-100">{total}</p>
                <p className="text-sm text-secondary dark:text-slate-400">
                    {t('datalayer:status.Missing')} {loss.missing} · {t('datalayer:status.Damaged')} {loss.damaged}
                </p>
                {trend && <p className={`text-xs font-medium ${TREND_TONE[trend.tone]}`}>{trend.text}</p>}
            </div>

            <p className="text-sm text-secondary dark:text-slate-400">
                {t('loss.consumed', { units: loss.consumed })}
            </p>

            {rows.length > 0 && (
                <div>
                    <p className="mb-2 text-sm font-medium text-primary dark:text-slate-200">
                        {categoryName ? t('loss.bySubcategory', { category: categoryName }) : t('loss.byCategory')}
                    </p>
                    <BarList rows={rows} ariaLabel={t('loss.byCategory')} />
                </div>
            )}
        </div>
    )
}
