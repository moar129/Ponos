import type { ReactNode } from 'react'

export interface ChartCardProps {
    title: string
    description?: string
    children?: ReactNode
    loading?: boolean
}

export function ChartCard({
    title,
    description,
    children,
    loading = false,
}: ChartCardProps) {
    return (
        <div className="rounded-lg border border-border-gray bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div>
                <h2 className="font-semibold text-primary dark:text-slate-100">
                    {title}
                </h2>

                {description && (
                    <p className="mt-1 text-sm text-secondary dark:text-slate-400">
                        {description}
                    </p>
                )}
            </div>

            <div className="mt-4">
                {loading ? (
                    <div className="flex min-h-[220px] items-center justify-center rounded-md bg-bg-gray dark:bg-slate-900">
                        <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
                    </div>
                ) : children ? (
                    children
                ) : (
                    <div className="flex min-h-[220px] items-center justify-center rounded-md bg-bg-gray dark:bg-slate-900">
                        <p className="text-sm text-secondary dark:text-slate-400">
                            Statistikdata kommer her
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}