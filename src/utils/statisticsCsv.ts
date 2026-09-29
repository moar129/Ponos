import { asDynamic } from '../i18n/config'
import type { StatisticsSnapshot } from '../types/statistics/statisticsTypes'
import {
    DEVELOPMENT_METRICS,
    buildDevelopmentComparison,
    buildSnapshotComparison,
    snapshotName,
    toDateInputValue,
} from './statisticsSnapshot'

type CsvCell = string | number | null | undefined

// RFC 4180: quote fields containing comma, quote or line break; double quotes.
function csvField(cell: CsvCell): string {
    if (cell === null || cell === undefined) return ''
    // Numbers are machine-readable regardless of UI language: "87.5", never "87,5".
    const text = typeof cell === 'number' ? String(cell) : cell
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: CsvCell[][]): string {
    return rows.map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n'
}

/** Saves the text as a file; the BOM makes Excel read æøå as UTF-8. */
export function downloadCsv(fileName: string, csv: string): void {
    const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

/**
 * US-80: the snapshot comparison as CSV - one column per snapshot (oldest
 * first, as on screen), one row per figure, the same translated labels as
 * the table, then the time series. Built only from snapshots already loaded,
 * i.e. data the user can see (read_statistics, own organisation via RLS).
 */
export function snapshotComparisonCsv(snapshots: StatisticsSnapshot[], t: unknown, locale: string): string {
    const tr = asDynamic(t)
    const { groups, valuesBySnapshot } = buildSnapshotComparison(snapshots, t)
    const development = buildDevelopmentComparison(snapshots, locale, (week) =>
        (t as (key: string, options: { week: number }) => string)('statistics:snapshots.weekLabel', { week }))

    const periodGroup = tr('statistics:snapshots.csv.period')
    const rows: CsvCell[][] = [
        [tr('statistics:snapshots.csv.group'), tr('statistics:snapshots.metric'), ...snapshots.map((snapshot) => snapshotName(snapshot, locale))],
        [periodGroup, tr('statistics:snapshots.csv.start'), ...snapshots.map((snapshot) => toDateInputValue(new Date(snapshot.periodStart)))],
        // period_end is exclusive; the last included day is shown.
        [periodGroup, tr('statistics:snapshots.csv.end'), ...snapshots.map((snapshot) => toDateInputValue(new Date(Date.parse(snapshot.periodEnd) - 1)))],
    ]

    for (const { group, rows: groupRows } of groups) {
        const groupLabel = tr(`statistics:snapshots.groups.${group}`)
        for (const row of groupRows) {
            rows.push([groupLabel, row.label, ...valuesBySnapshot.map((values) => values.get(row.name))])
        }
    }

    if (development) {
        for (const metric of DEVELOPMENT_METRICS) {
            const groupLabel = (t as (key: string, options: { metric: string }) => string)(
                'statistics:snapshots.csv.development',
                { metric: tr(`statistics:snapshots.development.${metric}`) },
            )
            for (const row of development.rows[metric]) {
                rows.push([groupLabel, row.label, ...row.cells.map((cell) => cell?.value)])
            }
        }
    }

    return toCsv(rows)
}

export function downloadSnapshotComparisonCsv(snapshots: StatisticsSnapshot[], t: unknown, locale: string): void {
    const fileName = `${asDynamic(t)('statistics:snapshots.csv.fileName')}-${toDateInputValue(new Date())}.csv`
    downloadCsv(fileName, snapshotComparisonCsv(snapshots, t, locale))
}
