import { asDynamic } from '../i18n/config'
import type { StatisticsSnapshot, StatisticsValueGroup } from '../types/statistics/statisticsTypes'

export type SnapshotRowGroup = 'kpis' | StatisticsValueGroup

// Display order of the comparison table.
export const SNAPSHOT_GROUP_ORDER: SnapshotRowGroup[] = [
    'kpis',
    'task_status',
    'task_priority',
    'room',
    'member_load',
    'approvals',
    'item_status',
    'category',
    'top_material',
]

/** Splits a stored value name into its group and key ("room:Sanitet" -> room / Sanitet). */
export function parseValueName(name: string): { group: SnapshotRowGroup; key: string } {
    const separator = name.indexOf(':')
    if (separator === -1) return { group: 'kpis', key: name }
    return { group: name.slice(0, separator) as StatisticsValueGroup, key: name.slice(separator + 1) }
}

/** Human label for one stored value, reusing the task/datalayer labels. */
export function valueLabel(t: unknown, group: SnapshotRowGroup, key: string): string {
    const tr = asDynamic(t)

    switch (group) {
        case 'kpis':
            return tr(`statistics:snapshots.names.${key}`)
        case 'task_status':
            return tr(`tasks:status.${key}`)
        case 'task_priority':
            return key ? tr(`tasks:priority.${key}`) : tr('statistics:priority.none')
        case 'room':
            return key || tr('statistics:rooms.noRoom')
        case 'member_load':
            return tr(`statistics:memberLoad.bucket.${key}`)
        case 'approvals':
            return tr(`statistics:approvals.${key}`)
        case 'item_status':
            return tr(`datalayer:status.${key}`)
        default:
            return key
    }
}

/** Snapshot name: its label, otherwise its period (period_end is exclusive). */
export function snapshotName(snapshot: StatisticsSnapshot, locale: string): string {
    if (snapshot.label) return snapshot.label
    const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    return `${format.format(new Date(snapshot.periodStart))} – ${format.format(new Date(Date.parse(snapshot.periodEnd) - 1))}`
}
