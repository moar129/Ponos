import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ChartCardProps } from '../../types/statistics/statisticsComponentTypes'

export function ChartCard({
    title,
    description,
    children,
    loading = false,
    error = null,
    empty = false,
    emptyMessage,
}: ChartCardProps) {
    const { t } = useTranslation('statistics')

    return (
        <div className="flex min-w-0 flex-col rounded-lg border border-border-gray bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div>
                <h3 className="font-semibold text-primary dark:text-slate-100">
                    {title}
                </h3>

                {description && (
                    <p className="mt-1 text-sm text-secondary dark:text-slate-400">
                        {description}
                    </p>
                )}
            </div>

            <div className="mt-4 flex-1">
                {loading ? (
                    <div className="flex min-h-[220px] items-center justify-center rounded-md bg-bg-gray/40 dark:bg-slate-900">
                        <div className="h-5 w-32 animate-pulse rounded bg-bg-gray dark:bg-slate-700" />
                    </div>
                ) : error ? (
                    <div className="flex min-h-[220px] items-center justify-center gap-2 rounded-md bg-bg-gray/40 px-4 text-center dark:bg-slate-900">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-secondary dark:text-slate-400">{error}</p>
                    </div>
                ) : empty ? (
                    <div className="flex min-h-[220px] items-center justify-center rounded-md bg-bg-gray/40 px-4 text-center dark:bg-slate-900">
                        <p className="text-sm text-secondary dark:text-slate-400">
                            {emptyMessage ?? t('empty')}
                        </p>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    )
}
