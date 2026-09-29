import type { KpiTrend } from '../types/statistics/statisticsComponentTypes'

/** Which direction is good for a KPI; null = neither (shown neutral). */
export type KpiGoodDirection = 'up' | 'down' | null

const ARROWS: Record<KpiTrend['direction'], string> = { up: '↑', down: '↓', flat: '→' }

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
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: pointsSuffix || previous === 0 ? 1 : 0 })
    const change = pointsSuffix
        ? `${number.format(Math.abs(diff))} ${pointsSuffix}`
        : previous === 0
            ? number.format(Math.abs(diff))
            : `${number.format(Math.abs((diff / previous) * 100))} %`

    const tone = goodWhen === null ? 'neutral' : goodWhen === direction ? 'good' : 'bad'
    return { direction, tone, text: `${ARROWS[direction]} ${sentence(change)}` }
}
