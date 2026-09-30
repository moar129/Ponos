import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    STATISTICS_PERIOD_TYPES,
    STATISTICS_YEARS_BACK,
    isQuarterStarted,
    quarterFromDate,
} from '../../store/hooks/useStatisticsPeriod'
import type { StatisticsQuarter } from '../../types/statistics/statisticsTypes'
import type { StatisticsPeriodPickerProps } from '../../types/statistics/statisticsComponentTypes'

const QUARTERS = [1, 2, 3, 4]

const buttonClass = (selected: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${selected
        ? 'bg-primary text-white dark:bg-accent dark:text-accent-text'
        : 'bg-bg-gray/60 text-secondary hover:bg-bg-gray dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
    }`

const SELECT =
    'rounded-md border border-border-gray bg-white px-2 py-1.5 text-sm text-primary outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-700 dark:text-white'

export function StatisticsPeriodPicker({
    periodType,
    quarter,
    today,
    onChangePeriod,
    onChangeQuarter,
    onOpenCustom,
    children,
}: StatisticsPeriodPickerProps) {
    const { t } = useTranslation('statistics')

    // The dropdowns' choice while another period is selected; the address
    // (quarter) wins once a quarter is selected.
    const [draft, setDraft] = useState<StatisticsQuarter>(() => quarter ?? quarterFromDate(today))
    const shown = quarter ?? draft
    const quarterSelected = periodType === 'quarter'
    const years = Array.from({ length: STATISTICS_YEARS_BACK }, (_, index) => today.getFullYear() - index)
    // An older year from a shared link still shows as selected.
    if (!years.includes(shown.year)) years.push(shown.year)

    const selectQuarter = (patch: Partial<StatisticsQuarter>) => {
        let next = { ...shown, ...patch }
        // Switching to this year with a quarter that has not begun -> the current one.
        if (!isQuarterStarted(next, today)) next = quarterFromDate(today)
        setDraft(next)
        onChangeQuarter(next)
    }

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

                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('period.heading')}>
                    {STATISTICS_PERIOD_TYPES.map((type) => (
                        <button
                            key={type}
                            type="button"
                            aria-pressed={periodType === type}
                            onClick={() => onChangePeriod(type)}
                            className={buttonClass(periodType === type)}
                        >
                            {t(`period.${type}`)}
                        </button>
                    ))}

                    {/* Button + both dropdowns stay together when the row wraps. */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            aria-pressed={quarterSelected}
                            onClick={() => selectQuarter({})}
                            className={buttonClass(quarterSelected)}
                        >
                            {t('period.quarter')}
                        </button>
                        <select
                            value={shown.quarter}
                            onChange={(event) => selectQuarter({ quarter: Number(event.target.value) })}
                            aria-label={t('period.quarterSelect')}
                            className={`${SELECT} ${quarterSelected ? '' : 'opacity-60'}`}
                        >
                            {QUARTERS.map((option) => (
                                <option
                                    key={option}
                                    value={option}
                                    disabled={!isQuarterStarted({ quarter: option, year: shown.year }, today)}
                                >
                                    Q{option}
                                </option>
                            ))}
                        </select>
                        <select
                            value={shown.year}
                            onChange={(event) => selectQuarter({ year: Number(event.target.value) })}
                            aria-label={t('period.quarterYear')}
                            className={`${SELECT} ${quarterSelected ? '' : 'opacity-60'}`}
                        >
                            {years.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                    </div>

                    <button
                        type="button"
                        aria-pressed={periodType === 'max'}
                        onClick={() => onChangePeriod('max')}
                        className={buttonClass(periodType === 'max')}
                    >
                        {t('period.max')}
                    </button>
                    <button
                        type="button"
                        aria-pressed={periodType === 'custom'}
                        onClick={onOpenCustom}
                        className={buttonClass(periodType === 'custom')}
                    >
                        {t('period.custom')}
                    </button>
                </div>
            </div>

            {children && (
                <div className="mt-3 border-t border-border-gray pt-3 dark:border-slate-700">{children}</div>
            )}
        </div>
    )
}
