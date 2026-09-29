import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import {
    DEVELOPMENT_METRICS,
    SNAPSHOT_GROUP_ORDER,
    buildDevelopmentComparison,
    isSeriesValue,
    parseValueName,
    snapshotName,
    valueLabel,
} from '../../utils/statisticsSnapshot'
import type { SnapshotRowGroup } from '../../utils/statisticsSnapshot'
import type { SnapshotComparisonTableProps } from '../../types/statistics/statisticsComponentTypes'

interface ComparisonRow {
    name: string
    label: string
}

// US-54: the same value side by side across the selected snapshots. Rows are
// the union of the snapshots' values, so a room that only exists in one of
// them still shows up (with "–" in the others). Time series rows
// (development:*) get their own section, aligned by calendar position.
export function SnapshotComparisonTable({ snapshots }: SnapshotComparisonTableProps) {
    const { t, i18n } = useTranslation('statistics')
    const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })

    const totals = snapshots.map((snapshot) => snapshot.values.filter((value) => !isSeriesValue(value)))
    const valuesBySnapshot = totals.map((values) => new Map(values.map((value) => [value.name as string, value.value])))
    const development = buildDevelopmentComparison(snapshots, i18n.language, (week) => t('snapshots.weekLabel', { week }))

    const groups = new Map<SnapshotRowGroup, ComparisonRow[]>()
    const seen = new Set<string>()

    for (const values of totals) {
        for (const value of values) {
            if (seen.has(value.name)) continue
            seen.add(value.name)

            const { group, key } = parseValueName(value.name)
            const rows = groups.get(group) ?? []
            rows.push({ name: value.name, label: valueLabel(t, group, key) })
            groups.set(group, rows)
        }
    }

    return (
        <div className="space-y-2">
            {development?.mode === 'dates' && (
                <p className="text-xs text-secondary dark:text-slate-400">{t('snapshots.developmentDatesNote')}</p>
            )}
            <div className="overflow-x-auto rounded-lg border border-border-gray dark:border-slate-700">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border-gray bg-bg-gray/40 dark:border-slate-700 dark:bg-slate-900">
                            <th scope="col" className="px-3 py-2 text-left font-medium text-secondary dark:text-slate-400">
                                {t('snapshots.metric')}
                            </th>
                            {snapshots.map((snapshot) => (
                                <th
                                    key={snapshot.id}
                                    scope="col"
                                    className="whitespace-nowrap px-3 py-2 text-right font-medium text-primary dark:text-slate-100"
                                >
                                    {snapshotName(snapshot, i18n.language)}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {SNAPSHOT_GROUP_ORDER.filter((group) => groups.has(group)).map((group) => (
                            <Fragment key={group}>
                                <tr className="border-b border-border-gray dark:border-slate-700">
                                    <th
                                        scope="colgroup"
                                        colSpan={snapshots.length + 1}
                                        className="px-3 pb-1 pt-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary dark:text-slate-400"
                                    >
                                        {t(`snapshots.groups.${group}`)}
                                    </th>
                                </tr>

                                {(groups.get(group) ?? []).map((row) => (
                                    <tr key={row.name} className="border-b border-border-gray/60 last:border-0 dark:border-slate-700/60">
                                        <th scope="row" className="px-3 py-1.5 text-left font-normal text-secondary dark:text-slate-300">
                                            {row.label}
                                        </th>
                                        {valuesBySnapshot.map((values, index) => {
                                            const value = values.get(row.name)
                                            return (
                                                <td
                                                    key={snapshots[index].id}
                                                    className="px-3 py-1.5 text-right tabular-nums text-primary dark:text-slate-100"
                                                >
                                                    {value === undefined ? '–' : number.format(value)}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </Fragment>
                        ))}

                        {development && DEVELOPMENT_METRICS.map((metric) => (
                            <Fragment key={`development-${metric}`}>
                                <tr className="border-b border-border-gray dark:border-slate-700">
                                    <th
                                        scope="colgroup"
                                        colSpan={snapshots.length + 1}
                                        className="px-3 pb-1 pt-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary dark:text-slate-400"
                                    >
                                        {t(`snapshots.development.${metric}`)}
                                    </th>
                                </tr>

                                {development.rows[metric].map((row) => (
                                    <tr key={row.key} className="border-b border-border-gray/60 last:border-0 dark:border-slate-700/60">
                                        <th scope="row" className="px-3 py-1.5 text-left font-normal capitalize text-secondary dark:text-slate-300">
                                            {row.label}
                                        </th>
                                        {row.cells.map((cell, index) => (
                                            <td
                                                key={snapshots[index].id}
                                                title={cell?.partialRange ?? undefined}
                                                className="px-3 py-1.5 text-right tabular-nums text-primary dark:text-slate-100"
                                            >
                                                {cell === undefined ? '–' : number.format(cell.value)}
                                                {cell?.partialRange && (
                                                    <span className="ml-1 text-xs text-secondary dark:text-slate-400">
                                                        ({cell.partialRange})
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {development?.hasPartial && (
                <p className="text-xs text-secondary dark:text-slate-400">{t('snapshots.partialNote')}</p>
            )}
        </div>
    )
}
