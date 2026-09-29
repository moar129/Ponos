import { useTranslation } from 'react-i18next'
import { STATISTICS_PERIOD_TYPES } from '../../store/hooks/useStatisticsPeriod'
import type { StatisticsPeriodPickerProps } from '../../types/statistics/statisticsComponentTypes'

export function StatisticsPeriodPicker({
    periodType,
    onChangePeriod,
    onOpenCustom,
    children,
}: StatisticsPeriodPickerProps) {
    const { t } = useTranslation('statistics')

    return (
        <div className="rounded-lg border border-border-gray p-4 dark:border-slate-700">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-primary dark:text-slate-100">
                        {t('period.heading')}
                    </h2>
                    <p className="mt-1 text-xs text-secondary dark:text-slate-400">
                        {t('period.description')}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2" role="group" aria-label={t('period.heading')}>
                    {STATISTICS_PERIOD_TYPES.map((type) => {
                        const selected = periodType === type

                        return (
                            <button
                                key={type}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => (type === 'custom' ? onOpenCustom() : onChangePeriod(type))}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${selected
                                    ? 'bg-primary text-white dark:bg-accent dark:text-accent-text'
                                    : 'bg-bg-gray/60 text-secondary hover:bg-bg-gray dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {t(`period.${type}`)}
                            </button>
                        )
                    })}
                </div>
            </div>

            {children && (
                <div className="mt-3 border-t border-border-gray pt-3 dark:border-slate-700">{children}</div>
            )}
        </div>
    )
}
