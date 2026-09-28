import type { ReactNode } from 'react';

export interface KPICardProps {
    title: string;
    value?: number | string | null;
    change?: number | null;
    trend?: 'up' | 'down' | 'neutral';
    icon?: ReactNode;
    unit?: string;
    loading?: boolean;
}

export function KPICard({
    title,
    value = null,
    change = null,
    trend = 'neutral',
    icon,
    unit,
    loading = false,
}: KPICardProps) {
    const hasValue = value !== null && value !== undefined;
    const hasChange = change !== null && change !== undefined;

    const getTrendSymbol = () => {
        if (trend === 'up') return '↑';
        if (trend === 'down') return '↓';
        return '→';
    };

    return (
        <div className="rounded-lg border border-border-gray bg-bg-gray p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {title}
                    </p>

                    <div className="mt-2">
                        {loading ? (
                            <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        ) : hasValue ? (
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {value}
                                </span>

                                {unit && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {unit}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-2xl font-semibold text-gray-400 dark:text-gray-500">
                                —
                            </span>
                        )}
                    </div>
                </div>

                {icon && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {icon}
                    </div>
                )}
            </div>

            {!loading && hasChange && (
                <div className="mt-3 flex items-center gap-1 text-xs">
                    <span
                        className={
                            trend === 'up'
                                ? 'text-green-600 dark:text-green-400'
                                : trend === 'down'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-500 dark:text-gray-400'
                        }
                    >
                        {getTrendSymbol()} {Math.abs(change)}%
                    </span>

                    <span className="text-gray-500 dark:text-gray-400">
                        vs. tidligere periode
                    </span>
                </div>
            )}
        </div>
    );
}