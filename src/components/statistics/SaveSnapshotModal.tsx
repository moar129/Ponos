import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SaveSnapshotModalProps } from '../../types/statistics/statisticsComponentTypes'

// Rendered only while open, so the label input starts empty every time.
export function SaveSnapshotModal({
    isOpen,
    periodLabel,
    isSaving,
    error,
    onSave,
    onClose,
}: SaveSnapshotModalProps) {
    const { t } = useTranslation(['statistics', 'common'])
    const [label, setLabel] = useState('')

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isSaving) onClose()
            }}
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="statistics-save-title"
                className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-800"
                onSubmit={(event) => {
                    event.preventDefault()
                    onSave(label)
                }}
            >
                <div className="flex items-center gap-3">
                    <Save className="h-5 w-5 text-secondary dark:text-slate-400" />
                    <div>
                        <h2 id="statistics-save-title" className="font-semibold text-primary dark:text-slate-100">
                            {t('snapshots.saveTitle')}
                        </h2>
                        <p className="text-sm text-secondary dark:text-slate-400">
                            {t('snapshots.saveDescription', { period: periodLabel })}
                        </p>
                    </div>
                </div>

                <label htmlFor="statistics-snapshot-label" className="mb-1 mt-5 block text-sm font-medium text-primary dark:text-slate-200">
                    {t('snapshots.label')}
                </label>
                <input
                    id="statistics-snapshot-label"
                    type="text"
                    value={label}
                    maxLength={80}
                    placeholder={t('snapshots.labelPlaceholder')}
                    onChange={(event) => setLabel(event.target.value)}
                    className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />

                {error && (
                    <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-md px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        {t('common:cancel')}
                    </button>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-accent dark:text-accent-text"
                    >
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isSaving ? t('snapshots.saving') : t('common:save')}
                    </button>
                </div>
            </form>
        </div>
    )
}
