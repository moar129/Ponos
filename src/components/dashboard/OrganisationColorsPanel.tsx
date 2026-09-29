// src/components/dashboard/OrganisationColorsPanel.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
    useAddSavedOrganisationColorMutation,
    useGetMyOrganisationQuery,
    useRemoveSavedOrganisationColorMutation,
    useUpdateMyOrganisationMutation,
} from '../../store/apis/organisationApi'
import { UPDATE_ORGANISATION_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import type { Organisation } from '../../types/organisation/organisationType'
import { ColorSlot } from './colorSlot'

// Standardfarverne er husets egne (index.css: --color-accent/--color-header-bg/
// --color-header-text) - bruges som forudfyldt værdi i farvevælgeren og som
// fallback, når organisationen ikke selv har valgt en farve (null).
const DEFAULT_ORG_COLOR = '#C7975D'
const DEFAULT_BAR_COLOR = '#071B33'
const DEFAULT_BAR_TEXT_COLOR = '#F1F5F9'

// Rækkefølge og i18n-nøgler for de fem farver - bruges af både oversigten
// og formularen, så de altid viser de samme felter. as const: nøglerne
// skal være literal-typer for de typede t()-kald.
const COLOR_FIELDS = [
    { field: 'color', labelKey: 'admin.colorLabel', hintKey: 'admin.colorHint', fallback: DEFAULT_ORG_COLOR },
    { field: 'headerColor', labelKey: 'admin.headerColorLabel', hintKey: 'admin.headerColorHint', fallback: DEFAULT_BAR_COLOR },
    { field: 'headerTextColor', labelKey: 'admin.headerTextColorLabel', hintKey: 'admin.headerTextColorHint', fallback: DEFAULT_BAR_TEXT_COLOR },
    { field: 'footerColor', labelKey: 'admin.footerColorLabel', hintKey: 'admin.footerColorHint', fallback: DEFAULT_BAR_COLOR },
    { field: 'footerTextColor', labelKey: 'admin.footerTextColorLabel', hintKey: 'admin.footerTextColorHint', fallback: DEFAULT_BAR_TEXT_COLOR },
] as const

type ColorField = (typeof COLOR_FIELDS)[number]['field']
type ColorForm = Record<ColorField, string | null>

const emptyForm: ColorForm = {
    color: null, headerColor: null, footerColor: null, headerTextColor: null, footerTextColor: null,
}

function isValidHexColor(value: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(value)
}

// Organisationens branding-farver (accent, header, footer og deres tekst),
// egen underfane under Administration - flyttet ud af OrganisationAdminPanel
// (2026-09-29), så "Organisation" kun rummer navn, medlemstal og sletning.
// Fri farvevælger, da virksomheder skal kunne bruge deres eget brand.
// "Rediger farver" kræver update_organisation (også håndhævet af RLS).
export function OrganisationColorsPanel() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: organisation, isLoading, error: queryError } = useGetMyOrganisationQuery()
    const { hasPrivilege: canEditOrganisation } = useHasPrivilege(UPDATE_ORGANISATION_PRIVILEGE)
    const [updateMyOrganisation, { isLoading: saving, error: mutationError }] = useUpdateMyOrganisationMutation()
    const [addSavedColor] = useAddSavedOrganisationColorMutation()
    const [removeSavedColor] = useRemoveSavedOrganisationColorMutation()

    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<ColorForm>(emptyForm)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [savedMessage, setSavedMessage] = useState(false)

    function startEdit(current: Organisation) {
        setForm({
            color: current.color ?? null,
            headerColor: current.headerColor ?? null,
            footerColor: current.footerColor ?? null,
            headerTextColor: current.headerTextColor ?? null,
            footerTextColor: current.footerTextColor ?? null,
        })
        setValidationError(null)
        setSavedMessage(false)
        setIsEditing(true)
    }

    function cancelEdit() {
        setIsEditing(false)
        setValidationError(null)
    }

    async function handleSubmit(current: Organisation) {
        setSavedMessage(false)

        if (COLOR_FIELDS.some(({ field }) => form[field] && !isValidHexColor(form[field]))) {
            setValidationError(t('admin.colorInvalid'))
            return
        }

        setValidationError(null)

        try {
            // Mutationen skriver alle felter - navnet sendes uændret med.
            await updateMyOrganisation({
                name: current.name,
                color: form.color || null,
                headerColor: form.headerColor || null,
                footerColor: form.footerColor || null,
                headerTextColor: form.headerTextColor || null,
                footerTextColor: form.footerTextColor || null,
            }).unwrap()

            setIsEditing(false)
            setSavedMessage(true)
        } catch {
            // Fejlen vises via mutationError
        }
    }

    if (isLoading) {
        return <p className="text-secondary dark:text-slate-400">{t('admin.loading')}</p>
    }

    if (queryError || !organisation) {
        return (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                {readableError(queryError) ?? t('admin.loadFailed')}
            </div>
        )
    }

    const saveError = readableError(mutationError)

    return (
        <div>
            {savedMessage && !isEditing && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                    {t('admin.saved')}
                </div>
            )}

            {(validationError || saveError) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                    {validationError ?? saveError}
                </div>
            )}

            {isEditing ? (
                <form onSubmit={(event) => {
                    event.preventDefault()
                    void handleSubmit(organisation)
                }}>
                    {COLOR_FIELDS.map(({ field, labelKey, hintKey, fallback }) => (
                        <ColorSlot
                            key={field}
                            label={t(labelKey)}
                            hint={t(hintKey)}
                            value={form[field]}
                            fallback={fallback}
                            onChange={(value) => setForm({ ...form, [field]: value })}
                            savedColors={organisation.savedColors}
                            onSaveCurrent={() => addSavedColor({ color: form[field] ?? fallback })}
                            onRemoveSaved={(c) => removeSavedColor({ color: c })}
                        />
                    ))}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                        >
                            {saving ? t('common:saving') : t('common:save')}
                        </button>
                        <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-md border border-border-gray bg-bg-gray px-4 py-2 font-medium text-secondary hover:bg-bg-gray/70 transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                        >
                            {t('common:cancel')}
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <dl className="divide-y divide-border-gray border-t border-border-gray dark:divide-slate-700 dark:border-slate-700">
                        {COLOR_FIELDS.map(({ field, labelKey, fallback }) => (
                            <div key={field} className="py-3 flex justify-between gap-4 items-center">
                                <dt className="text-sm text-secondary dark:text-slate-400">{t(labelKey)}</dt>
                                <dd className="text-sm text-right flex items-center gap-2 justify-end">
                                    <span
                                        className="w-4 h-4 rounded-full border border-border-gray dark:border-slate-700"
                                        style={{ backgroundColor: organisation[field] ?? fallback }}
                                    />
                                    {organisation[field] ?? t('admin.colorNoneSet')}
                                </dd>
                            </div>
                        ))}
                    </dl>

                    {canEditOrganisation && (
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => startEdit(organisation)}
                                className="bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors"
                            >
                                {t('admin.editColors')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
