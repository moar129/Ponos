import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { STATISTICS_YEARS_BACK } from '../../store/hooks/useStatisticsPeriod'
import { defaultSnapshotGranularity, snapshotPeriodRange } from '../../utils/statisticsSnapshot'
import type {
    SnapshotGranularity,
    SnapshotPeriodChoice,
    SnapshotPeriodType,
} from '../../types/statistics/statisticsTypes'
import type { SaveSnapshotModalProps } from '../../types/statistics/statisticsComponentTypes'
import { Modal } from '../common/Modal'

const GRANULARITIES: SnapshotGranularity[] = ['week', 'month', 'quarter']
const PERIOD_TYPES: SnapshotPeriodType[] = ['year', 'quarter', 'month', 'custom', 'view']

const SELECT =
    'rounded-md border border-border-gray bg-white px-2 py-1 text-sm text-primary outline-none focus:border-accent disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
const INPUT =
    'w-full rounded-md border border-border-gray bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-700 dark:text-white'

// The snapshot's period is chosen here, independent of the overview's period
// filter ("Som visningen" still offers that one). Rendered only while open,
// so every field starts fresh.
export function SaveSnapshotModal({
    isOpen,
    viewPeriod,
    isSaving,
    error,
    onSave,
    onClose,
}: SaveSnapshotModalProps) {
    const { t, i18n } = useTranslation(['statistics', 'common'])
    const locale = i18n.language

    const now = new Date()
    const [choice, setChoice] = useState<SnapshotPeriodChoice>({
        type: 'year',
        year: now.getFullYear() - 1,
        quarter: Math.floor(now.getMonth() / 3) + 1,
        month: now.getMonth(),
        from: '',
        to: '',
    })
    const [label, setLabel] = useState('')
    // null = follow the period's length until the user picks one.
    const [chosenGranularity, setChosenGranularity] = useState<SnapshotGranularity | null>(null)

    if (!isOpen) return null

    const range = snapshotPeriodRange(choice, viewPeriod, locale)
    const granularity = chosenGranularity ?? defaultSnapshotGranularity(range?.days ?? null)
    const years = Array.from({ length: STATISTICS_YEARS_BACK }, (_, index) => now.getFullYear() - index)
    const monthName = new Intl.DateTimeFormat(locale, { month: 'long' })
    const update = (patch: Partial<SnapshotPeriodChoice>) => setChoice((current) => ({ ...current, ...patch }))

    const yearSelect = (disabled: boolean) => (
        <select
            value={choice.year}
            disabled={disabled}
            onChange={(event) => update({ year: Number(event.target.value) })}
            aria-label={t('snapshots.year')}
            className={SELECT}
        >
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
    )

    const periodControls = (type: SnapshotPeriodType) => {
        const disabled = choice.type !== type

        switch (type) {
            case 'year':
                return yearSelect(disabled)
            case 'quarter':
                return (
                    <>
                        <select
                            value={choice.quarter}
                            disabled={disabled}
                            onChange={(event) => update({ quarter: Number(event.target.value) })}
                            aria-label={t('snapshots.quarterLabel')}
                            className={SELECT}
                        >
                            {[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>Q{quarter}</option>)}
                        </select>
                        {yearSelect(disabled)}
                    </>
                )
            case 'month':
                return (
                    <>
                        <select
                            value={choice.month}
                            disabled={disabled}
                            onChange={(event) => update({ month: Number(event.target.value) })}
                            aria-label={t('snapshots.monthLabel')}
                            className={SELECT}
                        >
                            {Array.from({ length: 12 }, (_, month) => (
                                <option key={month} value={month}>{monthName.format(new Date(2000, month, 1))}</option>
                            ))}
                        </select>
                        {yearSelect(disabled)}
                    </>
                )
            case 'custom':
                return (
                    <>
                        <input
                            type="date"
                            value={choice.from}
                            max={choice.to || undefined}
                            disabled={disabled}
                            onChange={(event) => update({ from: event.target.value })}
                            aria-label={t('custom.from')}
                            className={SELECT}
                        />
                        <span className="text-secondary dark:text-slate-400">–</span>
                        <input
                            type="date"
                            value={choice.to}
                            min={choice.from || undefined}
                            disabled={disabled}
                            onChange={(event) => update({ to: event.target.value })}
                            aria-label={t('custom.to')}
                            className={SELECT}
                        />
                    </>
                )
            case 'view':
                return <span className="text-xs text-secondary dark:text-slate-400">{viewPeriod.label}</span>
        }
    }

    return (
        <Modal
            onClose={onClose}
            icon={Save}
            title={t('snapshots.saveTitle')}
            subtitle={<>{t('snapshots.saveIntro')}<span className="mt-1 block text-xs">{t('snapshots.wholeOrganisationNote')}</span></>}
            size="lg"
            disableClose={isSaving}
            onSubmit={(event) => {
            event.preventDefault()
            if (!range) return
            onSave({ start: range.start, end: range.end, label: label.trim() || range.name, granularity })
            }}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-md px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        {t('common:cancel')}
                    </button>

                    <button
                        type="submit"
                        disabled={isSaving || !range}
                        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-accent dark:text-accent-text"
                    >
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isSaving ? t('common:saving') : t('common:save')}
                    </button>
                </>
            }
        >
            <fieldset>
                <legend className="mb-2 text-sm font-medium text-primary dark:text-slate-200">
                    {t('snapshots.periodLabel')}
                </legend>

                <div className="space-y-2">
                    {PERIOD_TYPES.map((type) => (
                        <div key={type} className="flex flex-wrap items-center gap-2">
                            <label className="flex min-w-[9rem] cursor-pointer items-center gap-2 text-sm text-primary dark:text-slate-100">
                                <input
                                    type="radio"
                                    name="snapshot-period"
                                    checked={choice.type === type}
                                    onChange={() => update({ type })}
                                    className="accent-[var(--color-accent)]"
                                />
                                {t(`snapshots.periodType.${type}`)}
                            </label>
                            {periodControls(type)}
                        </div>
                    ))}
                </div>

                {choice.type === 'custom' && !range && choice.from && choice.to && (
                    <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {t('custom.endBeforeStart')}
                    </p>
                )}
            </fieldset>

            <label htmlFor="statistics-snapshot-label" className="mb-1 mt-5 block text-sm font-medium text-primary dark:text-slate-200">
                {t('snapshots.label')}
            </label>
            <input
                id="statistics-snapshot-label"
                type="text"
                value={label}
                maxLength={80}
                placeholder={range?.name ?? t('snapshots.labelPlaceholder')}
                onChange={(event) => setLabel(event.target.value)}
                className={INPUT}
            />
            {range && !label.trim() && (
                <p className="mt-1 text-xs text-secondary dark:text-slate-400">
                    {t('snapshots.labelAuto', { name: range.name })}
                </p>
            )}

            <label htmlFor="statistics-snapshot-granularity" className="mb-1 mt-4 block text-sm font-medium text-primary dark:text-slate-200">
                {t('snapshots.granularity')}
            </label>
            <select
                id="statistics-snapshot-granularity"
                value={granularity}
                onChange={(event) => setChosenGranularity(event.target.value as SnapshotGranularity)}
                className={INPUT}
            >
                {GRANULARITIES.map((option) => (
                    <option key={option} value={option}>
                        {t(`snapshots.granularityOption.${option}`)}
                    </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-secondary dark:text-slate-400">{t('snapshots.granularityHint')}</p>

            {error && (
                <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </Modal>
    )
}
