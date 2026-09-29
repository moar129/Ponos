import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fromDateInputValue, toDateInputValue } from '../../utils/statisticsSnapshot'
import type { CustomPeriodModalProps } from '../../types/statistics/statisticsComponentTypes'

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
    const [start, setStart] = useState(toDateInputValue(initialStart))
    const [end, setEnd] = useState(toDateInputValue(initialEnd))

    if (!isOpen) return null

    const endBeforeStart = Boolean(start && end && end < start)
    const canApply = Boolean(start && end) && !endBeforeStart

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="statistics-custom-title"
                className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-800"
            >
                <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-secondary dark:text-slate-400" />
                    <div>
                        <h2 id="statistics-custom-title" className="font-semibold text-primary dark:text-slate-100">
                            {t('custom.title')}
                        </h2>
                        <p className="text-sm text-secondary dark:text-slate-400">
                            {t('custom.description')}
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        {t('common:cancel')}
                    </button>

                    <button
                        type="button"
                        disabled={!canApply}
                        onClick={() => onApply(fromDateInputValue(start), fromDateInputValue(end))}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent dark:text-accent-text"
                    >
                        {t('custom.apply')}
                    </button>
                </div>
            </div>
        </div>
    )
}
