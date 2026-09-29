import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { InsightSummaryProps, StatisticsInsight } from '../../types/statistics/statisticsComponentTypes'

const TONE: Record<StatisticsInsight['tone'], { icon: typeof Info; className: string }> = {
    bad: { icon: TriangleAlert, className: 'text-red-700 dark:text-red-400' },
    good: { icon: CheckCircle2, className: 'text-green-700 dark:text-green-400' },
    neutral: { icon: Info, className: 'text-secondary dark:text-slate-400' },
}

// The period in a few sentences (utils/statisticsInsights.ts). Icon + text,
// never colour alone; the figures behind each sentence are right below.
export function InsightSummary({ insights, subtitle, loading }: InsightSummaryProps) {
    const { t } = useTranslation('statistics')

    return (
        <section aria-labelledby="statistics-insights-title" className="rounded-lg border border-border-gray p-4 dark:border-slate-700">
            <h2 id="statistics-insights-title" className="text-base font-semibold text-primary dark:text-slate-100">
                {t('insights.title')}
            </h2>
            <p className="text-sm text-secondary dark:text-slate-400">{subtitle}</p>

            {loading ? (
                <div className="mt-3 space-y-2">
                    {[0, 1, 2].map((line) => (
                        <div key={line} className="h-4 w-3/4 animate-pulse rounded bg-bg-gray dark:bg-slate-700" />
                    ))}
                </div>
            ) : insights.length === 0 ? (
                <p className="mt-3 text-sm text-secondary dark:text-slate-400">{t('insights.none')}</p>
            ) : (
                <ul className="mt-3 space-y-2">
                    {insights.map((insight) => {
                        const { icon: Icon, className } = TONE[insight.tone]
                        return (
                            <li key={insight.key} className="flex items-start gap-2 text-sm text-primary dark:text-slate-100">
                                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} aria-hidden />
                                <span>
                                    {insight.tone !== 'neutral' && (
                                        <span className="sr-only">{t(insight.tone === 'bad' ? 'insights.toneBad' : 'insights.toneGood')}: </span>
                                    )}
                                    {insight.text}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
