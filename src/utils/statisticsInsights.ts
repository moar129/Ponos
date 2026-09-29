import type { StatisticsInsight } from '../types/statistics/statisticsComponentTypes'
import type { StatisticsResult } from '../types/statistics/statisticsTypes'

type Translate = (key: string, options?: Record<string, unknown>) => string

/** At most this many sentences are shown - the figures are right below. */
export const MAX_INSIGHTS = 3

const OUT_OF_SERVICE = new Set(['Missing', 'Damaged', 'Maintenance'])

/**
 * Plain-language summary of the period (rule-based, no AI): each rule has a
 * threshold so only marked changes are mentioned, and a weight so the most
 * important ones win. Derived only from the payload the page already has,
 * so it follows the period and the room filter automatically. Same rules
 * are ported to docs/seed/generate.mjs for FACIT - keep them in step.
 */
export function buildInsights(
    stats: StatisticsResult,
    options: { roomFiltered: boolean; locale: string; t: unknown },
): StatisticsInsight[] {
    const t = options.t as Translate
    const whole = new Intl.NumberFormat(options.locale, { maximumFractionDigits: 0 })
    const decimal = new Intl.NumberFormat(options.locale, { maximumFractionDigits: 1 })
    const percent = (value: number) => `${whole.format(value)} %`
    const days = (value: number) => t('statistics:approvals.days', { count: value, formatted: decimal.format(value) })
    const roomLabel = (name: string | null) => name ?? t('statistics:rooms.noRoom')
    // Ties are broken by room name, so the page and FACIT agree.
    const byName = (a: { name: string | null }, b: { name: string | null }) => (a.name ?? '').localeCompare(b.name ?? '', 'da')

    const insights: StatisticsInsight[] = []
    const add = (key: string, weight: number, tone: StatisticsInsight['tone'], text: string) =>
        insights.push({ key, weight, tone, text })

    const now = stats.kpis
    const before = stats.previousKpis

    // 1. Overdue tasks against the previous period.
    if (before && Math.abs(now.overdue - before.overdue) >= 2) {
        const up = now.overdue > before.overdue
        add('overdue', up ? 90 : 60, up ? 'bad' : 'good',
            t(up ? 'statistics:insights.overdueUp' : 'statistics:insights.overdueDown', { from: before.overdue, to: now.overdue }))
    }

    // 2. Share completed on time, in percentage points.
    if (before && now.onTimeRate !== null && before.onTimeRate !== null && Math.abs(now.onTimeRate - before.onTimeRate) >= 10) {
        const up = now.onTimeRate > before.onTimeRate
        add('onTime', up ? 50 : 80, up ? 'good' : 'bad',
            t(up ? 'statistics:insights.onTimeUp' : 'statistics:insights.onTimeDown', {
                from: percent(before.onTimeRate),
                to: percent(now.onTimeRate),
            }))
    }

    // 3. The room with the most overdue tasks (meaningless once filtered to one room).
    if (!options.roomFiltered) {
        const worst = [...stats.taskRooms].sort((a, b) => b.overdue - a.overdue || byName(a, b))[0]
        if (worst && worst.overdue >= 2) {
            add('worstRoom', 75, 'bad', t('statistics:insights.worstRoom', { room: roomLabel(worst.name), overdue: worst.overdue }))
        }
    }

    // 4. Lead time against the previous period (relative change).
    if (before && now.medianLeadDays !== null && before.medianLeadDays !== null && before.medianLeadDays > 0) {
        const change = (now.medianLeadDays - before.medianLeadDays) / before.medianLeadDays
        if (Math.abs(change) >= 0.25) {
            const up = change > 0
            add('leadTime', up ? 70 : 40, up ? 'bad' : 'good',
                t(up ? 'statistics:insights.leadUp' : 'statistics:insights.leadDown', {
                    from: days(before.medianLeadDays),
                    to: days(now.medianLeadDays),
                }))
        }
    }

    // 5. Capacity: created vs completed in the period.
    if (now.created - now.completed >= 5 && now.created >= now.completed * 1.5) {
        add('backlog', 65, 'bad', t('statistics:insights.backlogGrows', { created: now.created, completed: now.completed }))
    } else if (now.completed - now.created >= 5 && now.completed >= now.created * 1.5) {
        add('backlog', 45, 'good', t('statistics:insights.backlogShrinks', { created: now.created, completed: now.completed }))
    }

    // 6. The room with the lowest share on time (enough deadlines to mean something).
    if (!options.roomFiltered) {
        const lowest = stats.taskRooms
            .filter((room) => room.onTimeRate !== null && room.completedWithDeadline >= 3 && room.onTimeRate < 70)
            .sort((a, b) => (a.onTimeRate ?? 0) - (b.onTimeRate ?? 0) || byName(a, b))[0]
        if (lowest && lowest.onTimeRate !== null) {
            add('lowestOnTime', 55, 'bad', t('statistics:insights.lowestOnTime', {
                room: roomLabel(lowest.name),
                rate: percent(lowest.onTimeRate),
                onTime: lowest.completedOnTime,
                total: lowest.completedWithDeadline,
            }))
        }
    }

    // 7. Rejected completion reports.
    const decided = stats.approvals.accepted + stats.approvals.rejected
    if (decided >= 4 && stats.approvals.rejected / decided >= 0.25) {
        add('rejections', 50, 'bad', t('statistics:insights.rejections', { rejected: stats.approvals.rejected, total: decided }))
    }

    // 8. Units out of service at the end of the period.
    const stock = stats.materials.byStatus
    if (stock) {
        const total = stock.reduce((sum, row) => sum + row.count, 0)
        const out = stock.filter((row) => OUT_OF_SERVICE.has(row.status)).reduce((sum, row) => sum + row.count, 0)
        if (total > 0 && out / total >= 0.1) {
            add('outOfService', 45, 'bad', t('statistics:insights.outOfService', { rate: percent((out / total) * 100), units: out }))
        }
    }

    return insights.sort((a, b) => b.weight - a.weight).slice(0, MAX_INSIGHTS)
}
