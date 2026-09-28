interface StatisticsStatesProps {
    loading?: boolean
    error?: boolean
    hasData?: boolean
}

export function StatisticsStates({
    loading = false,
    error = false,
    hasData = false,
}: StatisticsStatesProps) {
    if (loading) {
        return (
            <div className="rounded-lg border border-border-gray p-4 dark:border-slate-700">
                <p className="text-sm text-secondary dark:text-slate-400">
                    Indlæser statistik...
                </p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-lg border border-border-gray p-4 dark:border-slate-700">
                <p className="text-sm text-secondary dark:text-slate-400">
                    Statistik kunne ikke indlæses.
                </p>
            </div>
        )
    }

    if (!hasData) {
        return (
            <div className="rounded-lg border border-border-gray p-4 dark:border-slate-700">
                <p className="text-sm text-secondary dark:text-slate-400">
                    Statistikdata er endnu ikke tilgængelig for denne periode.
                </p>
            </div>
        )
    }

    return null
}