import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../common/ConfirmDialog'
import type { ColorSlotProps, ModePreviewProps, SavedColorsPaletteProps } from '../../types/dashboard/dashboardType'

function SavedColorsPalette({ savedColors, activeColor, onPick, onSave, onRemove }: SavedColorsPaletteProps) {
    const { t } = useTranslation(['organisation', 'common'])
    const alreadySaved = savedColors.some((c) => c.toUpperCase() === activeColor.toUpperCase())
    const [colorToRemove, setColorToRemove] = useState<string | null>(null)

    function confirmRemove() {
        if (colorToRemove) onRemove(colorToRemove)
        setColorToRemove(null)
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-secondary uppercase tracking-wide dark:text-slate-400">{t('admin.savedColors')}</p>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={alreadySaved}
                    className="text-xs font-medium text-accent hover:text-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {t('admin.saveCurrentColor')}
                </button>
            </div>

            {savedColors.length === 0 ? (
                <p className="text-xs text-secondary dark:text-slate-400">{t('admin.noSavedColors')}</p>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    {savedColors.map((c) => (
                        <div key={c} className="relative group">
                            <button
                                type="button"
                                onClick={() => onPick(c)}
                                title={c}
                                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                                    activeColor.toUpperCase() === c.toUpperCase()
                                        ? 'border-primary dark:border-slate-100'
                                        : 'border-border-gray dark:border-slate-700'
                                }`}
                                style={{ backgroundColor: c }}
                            />
                            <button
                                type="button"
                                onClick={() => setColorToRemove(c)}
                                aria-label={t('admin.removeSavedColor')}
                                className="absolute -top-1.5 -right-1.5 flex lg:hidden lg:group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-none"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                isOpen={colorToRemove !== null}
                title={t('admin.removeSavedColor')}
                confirmLabel={t('admin.removeSavedColor')}
                onConfirm={confirmRemove}
                onCancel={() => setColorToRemove(null)}
            >
                {colorToRemove && (
                    <div className="flex items-center gap-3">
                        <span
                            className="w-8 h-8 shrink-0 rounded-full border border-border-gray dark:border-slate-600"
                            style={{ backgroundColor: colorToRemove }}
                        />
                        <p className="text-sm text-secondary dark:text-slate-400">
                            {t('admin.removeSavedColorConfirm', colorToRemove.toUpperCase())}
                        </p>
                    </div>
                )}
            </ConfirmDialog>
        </div>
    )
}

export function ModePreview({ chosen, light, dark }: ModePreviewProps) {
    const { t } = useTranslation('organisation')
    const adjusted = [light, dark].some((c) => c.toUpperCase() !== chosen.toUpperCase())
    const swatch = (label: string, color: string) => (
        <span className="flex items-center gap-1" title={color}>
            {label}
            <span
                className="w-3.5 h-3.5 rounded-full border border-border-gray dark:border-slate-600"
                style={{ backgroundColor: color }}
            />
        </span>
    )

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary dark:text-slate-400">
            {swatch(t('admin.previewLight'), light)}
            {swatch(t('admin.previewDark'), dark)}
            {adjusted && <span className="italic">{t('admin.colorAdjusted')}</span>}
        </div>
    )
}

export function ColorSlot({ label, hint, value, fallback, onChange, savedColors, onSaveCurrent, onRemoveSaved, preview }: ColorSlotProps) {
    const { t } = useTranslation('organisation')
    const effective = value ?? fallback

    return (
        <div className="mb-6">
            <label className="block text-sm text-secondary mb-1 dark:text-slate-400">{label}</label>
            <p className="text-xs text-secondary mb-2 dark:text-slate-400">{hint}</p>

            <div className="flex items-center gap-3 mb-3">
                <input
                    type="color"
                    value={effective}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-10 w-14 shrink-0 rounded-md border border-border-gray bg-white cursor-pointer dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                    type="text"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value || null)}
                    placeholder={fallback}
                    maxLength={7}
                    className="w-32 rounded-md border border-border-gray bg-white px-3 py-2 text-sm font-mono text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="text-xs text-secondary hover:text-primary hover:underline dark:text-slate-400 dark:hover:text-slate-100"
                    >
                        {t('admin.colorUseDefault')}
                    </button>
                )}
            </div>

            <div className="mb-3">
                <ModePreview chosen={effective} light={preview.light} dark={preview.dark} />
            </div>

            <SavedColorsPalette
                savedColors={savedColors}
                activeColor={effective}
                onPick={onChange}
                onSave={onSaveCurrent}
                onRemove={onRemoveSaved}
            />
        </div>
    )
}