import { formatDecimal, formatPercent } from './formatDate'
import type { KpiTrend } from '../types/statistics/statisticsComponentTypes'

/** Which direction is good for a KPI; null = neither (shown neutral). */
export type KpiGoodDirection = 'up' | 'down' | null

const ARROWS: Record<KpiTrend['direction'], string> = { up: '↑', down: '↓', flat: '→' }

// Good/bad only where the direction has a meaning (e.g. more overdue tasks is
// bad); always with arrow + text, never colour alone.
export const TREND_TONE: Record<KpiTrend['tone'], string> = {
    good: 'text-green-700 dark:text-green-400',
    bad: 'text-red-700 dark:text-red-400',
    neutral: 'text-secondary dark:text-slate-400',
}

/**
 * Trend of a KPI against the previous period of the same length.
 * `sentence` wraps the change, e.g. (change) => t('kpi.trend', { change }).
 * The change is a percentage, or an absolute number when the previous
 * value was 0 (a percentage of 0 is meaningless). Figures that already are
 * percentages pass `pointsSuffix` and get percentage points ("5 pp").
 */
export function kpiTrend(
    current: number,
    previous: number,
    goodWhen: KpiGoodDirection,
    locale: string,
    sentence: (change: string) => string,
    sameSentence: string,
    pointsSuffix?: string,
): KpiTrend {
    const diff = current - previous
    if (diff === 0) return { direction: 'flat', tone: 'neutral', text: `${ARROWS.flat} ${sameSentence}` }

    const direction = diff > 0 ? 'up' : 'down'
    const change = pointsSuffix
        ? `${formatDecimal(Math.abs(diff), 1, locale)} ${pointsSuffix}`
        : previous === 0
            ? formatDecimal(Math.abs(diff), 1, locale)
            : formatPercent(Math.abs((diff / previous) * 100), 0, locale)

    const tone = goodWhen === null ? 'neutral' : goodWhen === direction ? 'good' : 'bad'
    return { direction, tone, text: `${ARROWS[direction]} ${sentence(change)}` }
}
