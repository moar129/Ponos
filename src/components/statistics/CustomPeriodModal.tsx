import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { parseDateKey, toDateKey } from '../../utils/calendar'
import type { CustomPeriodModalProps } from '../../types/statistics/statisticsComponentTypes'
import { Modal } from '../common/Modal'

// Rendered only while open (see StatisticsPage), so the inputs start from
// the current custom range every time.
export function CustomPeriodModal({
    isOpen,
    initialStart,
    initialEnd,
    onApply,
    onClose,
}: CustomPeriodModalProps) {
    const { t } = useTranslation(['statistics', 'common'])
    const [start, setStart] = useState(initialStart ? toDateKey(initialStart) : '')
    const [end, setEnd] = useState(initialEnd ? toDateKey(initialEnd) : '')

    const startDate = parseDateKey(start)
    const endDate = parseDateKey(end)
    const endBeforeStart = Boolean(start && end && end < start)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            icon={CalendarDays}
            title={t('custom.title')}
            subtitle={t('custom.description')}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        {t('common:cancel')}
                    </button>

                    <button
                        type="button"
                        disabled={!startDate || !endDate || endBeforeStart}
                        onClick={() => startDate && endDate && onApply(startDate, endDate)}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent dark:text-accent-text"
                    >
                        {t('custom.apply')}
                    </button>
                </>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="statistics-custom-start" className="mb-1 block text-sm font-medium text-primary dark:text-slate-200">
                        {t('custom.from')}
                    </label>
                    <input
                        id="statistics-custom-start"
                        type="date"
                        value={start}
                        max={end || undefined}
                        onChange={(event) => setStart(event.target.value)}
                        className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                </div>

                <div>
                    <label htmlFor="statistics-custom-end" className="mb-1 block text-sm font-medium text-primary dark:text-slate-200">
                        {t('custom.to')}
                    </label>
                    <input
                        id="statistics-custom-end"
                        type="date"
                        value={end}
                        min={start || undefined}
                        onChange={(event) => setEnd(event.target.value)}
                        className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                </div>
            </div>

            {endBeforeStart && (
                <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {t('custom.endBeforeStart')}
                </p>
            )}
        </Modal>
    )
}
