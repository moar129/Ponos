import { useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '../../ErrorMessage'
import {
    useDeleteStatisticsSnapshotMutation,
    useGetStatisticsSnapshotsQuery,
    useSaveStatisticsSnapshotMutation,
} from '../../store/apis/statisticApi'
import {
    CREATE_STATISTICS_PRIVILEGE,
    DELETE_STATISTICS_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import {
    MAX_COMPARED_SNAPSHOTS,
    snapshotName,
    snapshotPeriodDays,
    sortChronologically,
} from '../../utils/statisticsSnapshot'
import { ConfirmDialogComponent } from '../dataLayer/confirmDialogComponent'
import { SaveSnapshotModal } from './SaveSnapshotModal'
import { SnapshotComparisonTable } from './SnapshotComparisonTable'
import type { SnapshotSaveRequest, StatisticsSnapshot } from '../../types/statistics/statisticsTypes'
import type { SnapshotPanelProps } from '../../types/statistics/statisticsComponentTypes'

// US-52 (save) + US-54 (compare). Save and delete are gated independently;
// the server enforces both (save_statistics_snapshot / delete policy).
export function SnapshotPanel({ viewPeriod, timeZone }: SnapshotPanelProps) {
    const { t, i18n } = useTranslation('statistics')
    const { hasPrivilege: canCreate } = useHasPrivilege(CREATE_STATISTICS_PRIVILEGE)
    const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_STATISTICS_PRIVILEGE)

    const { data: snapshots = [], isLoading, error: loadError } = useGetStatisticsSnapshotsQuery(undefined, { refetchOnFocus: true })
    const [saveSnapshot, { isLoading: isSaving }] = useSaveStatisticsSnapshotMutation()
    const [deleteSnapshot, { isLoading: isDeleting }] = useDeleteStatisticsSnapshotMutation()

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isSaveOpen, setIsSaveOpen] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [toDelete, setToDelete] = useState<StatisticsSnapshot | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    // Oldest first (comparison reads left to right); drops ids of deleted snapshots.
    const selected = sortChronologically(snapshots.filter((snapshot) => selectedIds.includes(snapshot.id)))
    const isFull = selected.length >= MAX_COMPARED_SNAPSHOTS

    const shortDate = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'numeric' })
    const snapshotMeta = (snapshot: StatisticsSnapshot) =>
        [
            `${shortDate.format(new Date(snapshot.periodStart))}–${shortDate.format(new Date(Date.parse(snapshot.periodEnd) - 1))} ${new Date(Date.parse(snapshot.periodEnd) - 1).getFullYear()}`,
            t('snapshots.days', { count: snapshotPeriodDays(snapshot) }),
            snapshot.seriesGranularity ? t(`snapshots.per.${snapshot.seriesGranularity}`) : null,
            t('snapshots.savedOn', { date: shortDate.format(new Date(snapshot.createdAt)) }),
        ]
            .filter(Boolean)
            .join(' · ')

    const toggle = (id: string) => {
        setSelectedIds((current) => {
            if (current.includes(id)) return current.filter((existing) => existing !== id)
            return current.length >= MAX_COMPARED_SNAPSHOTS ? current : [...current, id]
        })
    }

    const handleSave = async ({ start, end, label, granularity }: SnapshotSaveRequest) => {
        setSaveError(null)
        try {
            const id = await saveSnapshot({ start, end, label, tz: timeZone, granularity }).unwrap()
            // Auto-select the new snapshot only while there is room for it.
            setSelectedIds((current) => (current.length >= MAX_COMPARED_SNAPSHOTS ? current : [...current, id]))
            setIsSaveOpen(false)
        } catch (err) {
            setSaveError(getErrorMessage(err, t('snapshots.saveFailed')))
        }
    }

    const handleDelete = async () => {
        if (!toDelete) return
        setDeleteError(null)
        try {
            await deleteSnapshot({ id: toDelete.id }).unwrap()
            setSelectedIds((current) => current.filter((id) => id !== toDelete.id))
        } catch (err) {
            setDeleteError(getErrorMessage(err, t('snapshots.deleteFailed')))
        }
        setToDelete(null)
    }

    return (
        <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-primary dark:text-slate-100">
                        {t('snapshots.title')}
                    </h2>
                    <p className="text-sm text-secondary dark:text-slate-400">
                        {t('snapshots.description')}
                    </p>
                </div>

                {canCreate && (
                    <button
                        type="button"
                        onClick={() => {
                            setSaveError(null)
                            setIsSaveOpen(true)
                        }}
                        className="inline-flex items-center gap-2 self-start rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:self-auto dark:bg-accent dark:text-accent-text"
                    >
                        <Save className="h-4 w-4" />
                        {t('snapshots.save')}
                    </button>
                )}
            </div>

            {deleteError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
            )}

            {isLoading ? (
                <div className="h-10 animate-pulse rounded-md bg-bg-gray/60 dark:bg-slate-700" />
            ) : loadError ? (
                <p className="text-sm text-secondary dark:text-slate-400">
                    {getErrorMessage(loadError, t('snapshots.loadFailed'))}
                </p>
            ) : snapshots.length === 0 ? (
                <p className="rounded-md border border-dashed border-border-gray p-4 text-center text-sm text-secondary dark:border-slate-700 dark:text-slate-400">
                    {t('snapshots.empty')}
                </p>
            ) : (
                <>
                    <ul className="flex flex-wrap gap-2">
                        {snapshots.map((snapshot) => {
                            const name = snapshotName(snapshot, i18n.language)
                            const checked = selectedIds.includes(snapshot.id)
                            const disabled = !checked && isFull

                            return (
                                <li
                                    key={snapshot.id}
                                    title={disabled ? t('snapshots.maxSelected', { max: MAX_COMPARED_SNAPSHOTS }) : undefined}
                                    className={`flex items-start rounded-md border text-sm ${checked
                                        ? 'border-accent bg-accent/10 dark:bg-accent/15'
                                        : 'border-border-gray dark:border-slate-600'
                                        } ${disabled ? 'opacity-50' : ''}`}
                                >
                                    <label className={`flex items-start gap-2 px-3 py-1.5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={disabled}
                                            onChange={() => toggle(snapshot.id)}
                                            className="mt-1 accent-[var(--color-accent)]"
                                        />
                                        <span className="min-w-0">
                                            <span className="block font-medium text-primary dark:text-slate-100">{name}</span>
                                            <span className="block text-xs text-secondary dark:text-slate-400">{snapshotMeta(snapshot)}</span>
                                        </span>
                                    </label>

                                    {canDelete && (
                                        <button
                                            type="button"
                                            onClick={() => setToDelete(snapshot)}
                                            title={t('snapshots.delete')}
                                            aria-label={`${t('snapshots.delete')}: ${name}`}
                                            className="mr-1 mt-1 rounded p-1 text-secondary hover:bg-bg-gray hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-red-400"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </li>
                            )
                        })}
                    </ul>

                    {isFull && (
                        <p className="text-xs text-secondary dark:text-slate-400">
                            {t('snapshots.maxSelected', { max: MAX_COMPARED_SNAPSHOTS })}
                        </p>
                    )}

                    {selected.length === 0 ? (
                        <p className="text-sm text-secondary dark:text-slate-400">{t('snapshots.compareHint')}</p>
                    ) : (
                        <SnapshotComparisonTable snapshots={selected} />
                    )}
                </>
            )}

            {isSaveOpen && (
                <SaveSnapshotModal
                    isOpen={isSaveOpen}
                    viewPeriod={viewPeriod}
                    isSaving={isSaving}
                    error={saveError}
                    onSave={handleSave}
                    onClose={() => setIsSaveOpen(false)}
                />
            )}

            <ConfirmDialogComponent
                isOpen={toDelete !== null}
                title={t('snapshots.deleteTitle')}
                message={toDelete ? t('snapshots.deleteMessage', { name: snapshotName(toDelete, i18n.language) }) : ''}
                confirmLabel={t('snapshots.delete')}
                isLoading={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setToDelete(null)}
            />
        </section>
    )
}
