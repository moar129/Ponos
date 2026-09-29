import { asDynamic } from '../i18n/config'
import type {
    SnapshotGranularity,
    StatisticsSnapshot,
    StatisticsValue,
    StatisticsValueGroup,
} from '../types/statistics/statisticsTypes'

// Time series rows (development:*) have their own section, see buildDevelopmentComparison.
export type SnapshotRowGroup = 'kpis' | Exclude<StatisticsValueGroup, 'development'>

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
    return { group: name.slice(0, separator) as SnapshotRowGroup, key: name.slice(separator + 1) }
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

// ---------------------------------------------------------------------
// Time series in snapshots (development:created / development:completed
// rows with period_start/period_end, see save_statistics_snapshot).
// ---------------------------------------------------------------------

export const DEVELOPMENT_METRICS = ['created', 'completed'] as const
export type DevelopmentMetric = (typeof DEVELOPMENT_METRICS)[number]

const DAY_MS = 24 * 60 * 60 * 1000

/** Default resolution for a new snapshot, from the period length in days (null = "Alt"). */
export function defaultSnapshotGranularity(days: number | null): SnapshotGranularity {
    if (days === null) return 'quarter'
    if (days <= 91) return 'week'
    if (days <= 366) return 'month'
    return 'quarter'
}

/** A value that belongs to a sub-period (time series row). */
export function isSeriesValue(value: StatisticsValue): boolean {
    return value.periodStart !== null && value.periodEnd !== null
}

// Only for snapshots saved before series_granularity existed. Wide margins:
// a bucket spanning a DST change is an hour longer/shorter (October = 31
// days + 1 h), so exact day counts would misclassify it.
function guessGranularity(value: StatisticsValue): SnapshotGranularity {
    const days = (Date.parse(value.periodEnd ?? '') - Date.parse(value.periodStart ?? '')) / DAY_MS
    if (days < 20) return 'week'
    if (days < 60) return 'month'
    return 'quarter'
}

/** Start of the full calendar sub-period containing `date` (local time). */
function bucketStart(date: Date, granularity: SnapshotGranularity): Date {
    if (granularity === 'week') {
        const mondayOffset = (date.getDay() + 6) % 7
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset)
    }
    if (granularity === 'quarter') return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

function bucketEnd(start: Date, granularity: SnapshotGranularity): Date {
    if (granularity === 'week') return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
    if (granularity === 'quarter') return new Date(start.getFullYear(), start.getMonth() + 3, 1)
    return new Date(start.getFullYear(), start.getMonth() + 1, 1)
}

function isoWeek(date: Date): { year: number; week: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return { year: d.getUTCFullYear(), week: Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7) }
}

/** Position within the calendar year, e.g. month 7 -> "M07", Q3 -> "Q3", week 27 -> "W27". */
function calendarKey(start: Date, granularity: SnapshotGranularity): string {
    if (granularity === 'week') return `W${String(isoWeek(start).week).padStart(2, '0')}`
    if (granularity === 'quarter') return `Q${Math.floor(start.getMonth() / 3) + 1}`
    return `M${String(start.getMonth() + 1).padStart(2, '0')}`
}

function calendarLabel(start: Date, granularity: SnapshotGranularity, locale: string, weekLabel: (week: number) => string): string {
    if (granularity === 'week') return weekLabel(isoWeek(start).week)
    if (granularity === 'quarter') return `Q${Math.floor(start.getMonth() / 3) + 1}`
    return new Intl.DateTimeFormat(locale, { month: 'long' }).format(start)
}

function dateLabel(start: Date, granularity: SnapshotGranularity, locale: string, weekLabel: (week: number) => string): string {
    if (granularity === 'quarter') return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`
    if (granularity === 'month') return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(start)
    // ISO week year, not calendar year: week 1 can start in late December.
    const { year, week } = isoWeek(start)
    return `${weekLabel(week)} ${year}`
}

export interface DevelopmentCell {
    value: number
    /** Set when only part of the sub-period lies inside the snapshot, e.g. "23/9–29/9". */
    partialRange: string | null
}

export interface DevelopmentRow {
    key: string
    label: string
    /** One cell per snapshot (same order as the snapshots), undefined = no data. */
    cells: (DevelopmentCell | undefined)[]
}

export interface DevelopmentComparison {
    /** calendar = rows aligned by position in the year (July next to July). */
    mode: 'calendar' | 'dates'
    hasPartial: boolean
    rows: Record<DevelopmentMetric, DevelopmentRow[]>
}

interface SeriesPoint {
    metric: DevelopmentMetric
    value: number
    granularity: SnapshotGranularity
    /** Full calendar sub-period the point belongs to. */
    bucket: Date
    partialRange: string | null
}

function seriesPoints(snapshot: StatisticsSnapshot, locale: string): SeriesPoint[] {
    const rangeFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric' })

    return snapshot.values
        .filter(isSeriesValue)
        .map((value) => {
            const start = new Date(value.periodStart ?? '')
            const end = new Date(value.periodEnd ?? '')
            const granularity = snapshot.seriesGranularity ?? guessGranularity(value)
            const bucket = bucketStart(start, granularity)
            const partial = start.getTime() !== bucket.getTime() || end.getTime() !== bucketEnd(bucket, granularity).getTime()

            return {
                metric: value.name.slice('development:'.length) as DevelopmentMetric,
                value: value.value,
                granularity,
                bucket,
                partialRange: partial ? `${rangeFormat.format(start)}–${rangeFormat.format(new Date(end.getTime() - 1))}` : null,
            }
        })
        .sort((a, b) => a.bucket.getTime() - b.bucket.getTime())
}

/**
 * Aligns the snapshots' time series for side-by-side comparison. Calendar
 * alignment needs one shared resolution and no repeated calendar position
 * within a snapshot (i.e. at most a year); otherwise rows are real dates.
 * Returns null when none of the snapshots has a time series.
 */
export function buildDevelopmentComparison(
    snapshots: StatisticsSnapshot[],
    locale: string,
    weekLabel: (week: number) => string,
): DevelopmentComparison | null {
    const series = snapshots.map((snapshot) => seriesPoints(snapshot, locale))
    const all = series.flat()
    if (all.length === 0) return null

    const shared = new Set(all.map((point) => point.granularity)).size === 1

    const noRepeats = series.every((points) =>
        DEVELOPMENT_METRICS.every((metric) => {
            const keys = points
                .filter((point) => point.metric === metric)
                .map((point) => calendarKey(point.bucket, point.granularity))
            return new Set(keys).size === keys.length
        }),
    )
    const mode: DevelopmentComparison['mode'] = shared && noRepeats ? 'calendar' : 'dates'

    const rows = {} as Record<DevelopmentMetric, DevelopmentRow[]>

    for (const metric of DEVELOPMENT_METRICS) {
        // Keys in order of first appearance (each series is chronological),
        // so a season crossing New Year keeps its order.
        const byKey = new Map<string, DevelopmentRow & { time: number }>()

        series.forEach((points, index) => {
            for (const point of points.filter((p) => p.metric === metric)) {
                const key = mode === 'calendar'
                    ? calendarKey(point.bucket, point.granularity)
                    : `${point.granularity}-${point.bucket.getTime()}`
                const row = byKey.get(key) ?? {
                    key,
                    time: point.bucket.getTime(),
                    label: mode === 'calendar'
                        ? calendarLabel(point.bucket, point.granularity, locale, weekLabel)
                        : dateLabel(point.bucket, point.granularity, locale, weekLabel),
                    cells: snapshots.map(() => undefined),
                }
                row.cells[index] = { value: point.value, partialRange: point.partialRange }
                byKey.set(key, row)
            }
        })

        const list = [...byKey.values()]
        if (mode === 'dates') list.sort((a, b) => a.time - b.time)
        rows[metric] = list.map(({ key, label, cells }) => ({ key, label, cells }))
    }

    return { mode, hasPartial: all.some((point) => point.partialRange !== null), rows }
}
