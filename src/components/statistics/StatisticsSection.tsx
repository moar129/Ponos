import type { StatisticsSectionProps } from '../../types/statistics/statisticsComponentTypes'

export function StatisticsSection({ title, children }: StatisticsSectionProps) {
    return (
        <section className="space-y-3">
            <h2 className="text-base font-semibold text-primary dark:text-slate-100">{title}</h2>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>
        </section>
    )
}
