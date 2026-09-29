import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Download, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
    DEVELOPMENT_METRICS,
    GROUP_NOTES,
    buildDevelopmentComparison,
    buildSnapshotComparison,
    formatDelta,
    hasMixedLengths,
    snapshotName,
    snapshotPeriodDays,
} from '../../utils/statisticsSnapshot'
import { downloadSnapshotComparisonCsv } from '../../utils/statisticsCsv'
import type { SnapshotRowGroup } from '../../utils/statisticsSnapshot'
import { SnapshotDevelopmentChart } from './SnapshotDevelopmentChart'
import type { SnapshotComparisonTableProps } from '../../types/statistics/statisticsComponentTypes'

const CELL = 'px-3 py-1.5 text-right tabular-nums text-primary dark:text-slate-100'
const DELTA = 'block text-xs font-normal text-secondary dark:text-slate-400 sm:ml-2 sm:inline'

// US-54: the same value side by side across the selected snapshots, oldest
// first. Every later column shows its change against the oldest (baseline).
// Rows are the union of the snapshots' values, so a room that only exists in
// one of them still shows up ("–" in the others). Time series rows
// (development:*) are shown as a chart, with the table behind a toggle.
export function SnapshotComparisonTable({ snapshots }: SnapshotComparisonTableProps) {
    const { t, i18n } = useTranslation('statistics')
    const [openGroups, setOpenGroups] = useState<Set<SnapshotRowGroup>>(() => new Set(['kpis']))
    const [showDevelopmentTable, setShowDevelopmentTable] = useState(false)

    const locale = i18n.language
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
    const pointsSuffix = t('snapshots.pointsSuffix')
    const names = snapshots.map((snapshot) => snapshotName(snapshot, locale))

    const { groups, valuesBySnapshot } = buildSnapshotComparison(snapshots, t)
    const development = buildDevelopmentComparison(snapshots, locale, (week) => t('snapshots.weekLabel', { week }))

    const toggleGroup = (group: SnapshotRowGroup) => {
        setOpenGroups((current) => {
            const next = new Set(current)
            if (next.has(group)) next.delete(group)
            else next.add(group)
            return next
        })
    }

    const renderCell = (key: string, name: string, value: number | undefined, baseline: number | undefined, index: number, partial?: string | null) => (
        <td key={key} title={partial ?? undefined} className={CELL}>
            {value === undefined ? '–' : number.format(value)}
            {partial && <span className="ml-1 text-xs text-secondary dark:text-slate-400">({partial})</span>}
            {index > 0 && value !== undefined && baseline !== undefined && (
                <span className={DELTA}>{formatDelta(name, value, baseline, locale, pointsSuffix)}</span>
            )}
        </td>
    )

    const headerRow = (
        <tr className="border-b border-border-gray bg-bg-gray/40 dark:border-slate-700 dark:bg-slate-900">
            <th scope="col" className="px-3 py-2 text-left font-medium text-secondary dark:text-slate-400">
                {t('snapshots.metric')}
            </th>
            {snapshots.map((snapshot, index) => (
                <th key={snapshot.id} scope="col" className="whitespace-nowrap px-3 py-2 text-right font-medium text-primary dark:text-slate-100">
                    {names[index]}
                </th>
            ))}
        </tr>
    )

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => downloadSnapshotComparisonCsv(snapshots, t, locale)}
                    className="inline-flex items-center gap-2 rounded-md border border-border-gray px-3 py-1.5 text-sm font-medium text-primary hover:bg-bg-gray/40 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700/40"
                >
                    <Download className="h-4 w-4" aria-hidden />
                    {t('snapshots.csv.export')}
                </button>
            </div>

            {hasMixedLengths(snapshots) && (
                <p role="note" className="flex items-start gap-2 rounded-md border border-border-gray bg-bg-gray/40 p-3 text-sm text-secondary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {t('snapshots.lengthWarning', {
                        lengths: snapshots.map((snapshot) => t('snapshots.days', { count: snapshotPeriodDays(snapshot) })).join(' / '),
                    })}
                </p>
            )}

            <div className="overflow-x-auto rounded-lg border border-border-gray dark:border-slate-700">
                <table className="w-full text-sm">
                    <thead>{headerRow}</thead>
                    <tbody>
                        {groups.map(({ group, rows }) => {
                            const open = openGroups.has(group)

                            return (
                                <Fragment key={group}>
                                    <tr className="border-b border-border-gray dark:border-slate-700">
                                        <th scope="colgroup" colSpan={snapshots.length + 1} className="p-0 text-left">
                                            <button
                                                type="button"
                                                aria-expanded={open}
                                                onClick={() => toggleGroup(group)}
                                                className="flex w-full items-center gap-1.5 px-3 py-2 text-left hover:bg-bg-gray/40 dark:hover:bg-slate-700/40"
                                            >
                                                {open
                                                    ? <ChevronDown className="h-4 w-4 shrink-0 text-secondary dark:text-slate-400" aria-hidden />
                                                    : <ChevronRight className="h-4 w-4 shrink-0 text-secondary dark:text-slate-400" aria-hidden />}
                                                <span className="text-xs font-semibold uppercase tracking-wide text-secondary dark:text-slate-400">
                                                    {t(`snapshots.groups.${group}`)}
                                                </span>
                                                {GROUP_NOTES[group] && (
                                                    <span className="ml-2 text-xs font-normal normal-case text-secondary dark:text-slate-500">
                                                        {t(`snapshots.${GROUP_NOTES[group]}`)}
                                                    </span>
                                                )}
                                            </button>
                                        </th>
                                    </tr>

                                    {open && rows.map((row) => (
                                        <tr key={row.name} className="border-b border-border-gray/60 last:border-0 dark:border-slate-700/60">
                                            <th scope="row" className="py-1.5 pl-9 pr-3 text-left font-normal text-secondary dark:text-slate-300">
                                                {row.label}
                                            </th>
                                            {valuesBySnapshot.map((values, index) =>
                                                renderCell(snapshots[index].id, row.name, values.get(row.name), valuesBySnapshot[0].get(row.name), index),
                                            )}
                                        </tr>
                                    ))}
                                </Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {development ? (
                <div className="space-y-3 rounded-lg border border-border-gray p-4 dark:border-slate-700">
                    {development.mode === 'dates' && (
                        <p className="text-xs text-secondary dark:text-slate-400">{t('snapshots.developmentDatesNote')}</p>
                    )}

                    <SnapshotDevelopmentChart comparison={development} names={names} />

                    <button
                        type="button"
                        aria-expanded={showDevelopmentTable}
                        onClick={() => setShowDevelopmentTable((current) => !current)}
                        className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100"
                    >
                        {showDevelopmentTable ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                        {showDevelopmentTable ? t('snapshots.hideTable') : t('snapshots.showTable')}
                    </button>

                    {showDevelopmentTable && (
                        <div className="overflow-x-auto rounded-lg border border-border-gray dark:border-slate-700">
                            <table className="w-full text-sm">
                                <thead>{headerRow}</thead>
                                <tbody>
                                    {DEVELOPMENT_METRICS.map((metric) => (
                                        <Fragment key={metric}>
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
                                                    {row.cells.map((cell, index) =>
                                                        renderCell(snapshots[index].id, `development:${metric}`, cell?.value, row.cells[0]?.value, index, cell?.partialRange),
                                                    )}
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {development.hasPartial && (
                        <p className="text-xs text-secondary dark:text-slate-400">{t('snapshots.partialNote')}</p>
                    )}
                </div>
            ) : (
                <p className="text-sm text-secondary dark:text-slate-400">{t('snapshots.noSeries')}</p>
            )}
        </div>
    )
}
