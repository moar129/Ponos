// src/components/dashboard/OrganisationAdminPanel.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Building2 } from 'lucide-react'
import {
    useAddSavedOrganisationColorMutation,
    useDeleteOrganisationMutation,
    useGetMyMembershipsQuery,
    useGetMyOrganisationQuery,
    useRemoveSavedOrganisationColorMutation,
    useUpdateMyOrganisationMutation,
} from '../../store/apis/organisationApi'
import { UPDATE_ORGANISATION_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import type { DeleteOrganisationControlProps, Organisation, UpdateOrganisationInput } from '../../types/organisation/organisationType'
import { ColorSlot } from './colorSlot'

// Standardfarven er husets egen accent (index.css: --color-accent) - bruges
// som forudfyldt værdi i farvevælgeren og som fallback, når organisationen
// ikke selv har valgt en farve (color === null).
const DEFAULT_ORG_COLOR = '#C7975D'
const DEFAULT_BAR_COLOR = '#071B33'
const DEFAULT_BAR_TEXT_COLOR = '#F1F5F9'


function isValidHexColor(value: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(value)
}

// Tom formular-tilstand, indtil admin trykker "Rediger organisation" og
// feltet fyldes med organisationens nuværende værdi.
const emptyForm: UpdateOrganisationInput = {
    name: '', color: null, headerColor: null, footerColor: null,
    headerTextColor: null, footerTextColor: null,
}

// Rediger organisation (navn + farve) + slet organisation, samlet i ét
// panel under dashboardets Administration-fane (US-65) - flyttet fra
// OrganisationPage.tsx. Panelet kan mountes af AdministrationTab enten
// via update_organisation-privilegiet eller admin-status alene, så begge
// kontroller er selvstændigt gatet HERINDE, uafhængigt af hinanden:
// "Rediger organisation" kræver update_organisation-privilegiet
// (canEditOrganisation), "Slet organisation" kræver udelukkende
// aktivt medlemskabs isAdmin-flag. Begge håndhæves også server-side
// (RLS/RPC) - UI-gaten er kun for at vise de rigtige knapper.
//
// Farven er organisationens egen, valgfri branding-farve (US-??):
// helt fri farvevælger (native <input type="color"> + hex-felt), da
// virksomheder skal kunne bruge deres eget brand, med husets egne farver
// som hurtige forslag og standardværdi.
export function OrganisationAdminPanel() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: organisation, isLoading, error: queryError } = useGetMyOrganisationQuery()
    const { data: memberships } = useGetMyMembershipsQuery()
    const { hasPrivilege: canEditOrganisation } = useHasPrivilege(UPDATE_ORGANISATION_PRIVILEGE)
    const [updateMyOrganisation, { isLoading: saving, error: mutationError }] = useUpdateMyOrganisationMutation()
    const [addSavedColor] = useAddSavedOrganisationColorMutation()
    const [removeSavedColor] = useRemoveSavedOrganisationColorMutation()

    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<UpdateOrganisationInput>(emptyForm)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [savedMessage, setSavedMessage] = useState(false)
    const [deletedMessage, setDeletedMessage] = useState<string | null>(null)

    function startEdit(current: Organisation) {
        setForm({
            name: current.name,
            color: current.color,
            headerColor: current.headerColor,
            footerColor: current.footerColor,
            headerTextColor: current.headerTextColor,
            footerTextColor: current.footerTextColor,
        })
        setValidationError(null)
        setSavedMessage(false)
        setIsEditing(true)
    }

    function cancelEdit() {
        setIsEditing(false)
        setValidationError(null)
    }


    const handleSubmit = async () => {
        setSavedMessage(false)

        const name = form.name.trim()
        const color = form.color ?? ''
        const headerColor = form.headerColor ?? ''
        const footerColor = form.footerColor ?? ''
        const headerTextColor = form.headerTextColor ?? ''
        const footerTextColor = form.footerTextColor ?? ''

        if (!name) {
            setValidationError(t('errors:required.organisationName'))
            return
        }

        for (const c of [color, headerColor, footerColor, headerTextColor, footerTextColor]) {
            if (c && !isValidHexColor(c)) {
                setValidationError(t('admin.colorInvalid'))
                return
            }
        }

        setValidationError(null)

        try {
            await updateMyOrganisation({
                name,
                color: color || null,
                headerColor: headerColor || null,
                footerColor: footerColor || null,
                headerTextColor: headerTextColor || null,
                footerTextColor: footerTextColor || null,
            }).unwrap()

            setIsEditing(false)
            setSavedMessage(true)
        } catch {
            // Fejlen vises via mutationError
        }
    }

    function handleDeleted(organisationName: string, wasActive: boolean, newActiveOrganisation: Organisation | null) {
        if (!wasActive) {
            setDeletedMessage(t('admin.deleted', { name: organisationName }))
        } else if (newActiveOrganisation) {
            setDeletedMessage(t('admin.deletedNewActive', { name: organisationName, newActive: newActiveOrganisation.name }))
        } else {
            setDeletedMessage(t('admin.deletedNoActive', { name: organisationName }))
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

    // Egen aktive medlemskab - bruges til at afgøre om "Slet organisation"
    // skal vises, uafhængigt af manage_organisation-privilegiet.
    const activeMembership = memberships?.find((m) => m.isActive) ?? null
    const saveError = readableError(mutationError)
    const displayColor = organisation.color ?? DEFAULT_ORG_COLOR

    return (
        <div>
            {deletedMessage && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                    {deletedMessage}
                </div>
            )}

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
                    void handleSubmit()
                }}>
                    <div className="mb-6">
                        <label className="block text-sm text-secondary mb-1 dark:text-slate-400" htmlFor="org-name">{t('admin.nameLabel')}</label>
                        <input
                            id="org-name"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>

                    <ColorSlot
                        label={t('admin.colorLabel')}
                        hint={t('admin.colorHint')}
                        value={form.color ?? null}
                        fallback={DEFAULT_ORG_COLOR}
                        onChange={(color) => setForm({ ...form, color })}
                        savedColors={organisation.savedColors}
                        onSaveCurrent={() => addSavedColor({ color: form.color ?? DEFAULT_ORG_COLOR })}
                        onRemoveSaved={(c) => removeSavedColor({ color: c })}
                    />
                    <ColorSlot
                        label={t('admin.headerColorLabel')}
                        hint={t('admin.headerColorHint')}
                        value={form.headerColor ?? null}
                        fallback={DEFAULT_BAR_COLOR}
                        onChange={(headerColor) => setForm({ ...form, headerColor })}
                        savedColors={organisation.savedColors}
                        onSaveCurrent={() => addSavedColor({ color: form.headerColor ?? DEFAULT_BAR_COLOR })}
                        onRemoveSaved={(c) => removeSavedColor({ color: c })}
                    />
                    <ColorSlot
                        label={t('admin.footerColorLabel')}
                        hint={t('admin.footerColorHint')}
                        value={form.footerColor ?? null}
                        fallback={DEFAULT_BAR_COLOR}
                        onChange={(footerColor) => setForm({ ...form, footerColor })}
                        savedColors={organisation.savedColors}
                        onSaveCurrent={() => addSavedColor({ color: form.footerColor ?? DEFAULT_BAR_COLOR })}
                        onRemoveSaved={(c) => removeSavedColor({ color: c })}
                    />
                    <ColorSlot
                        label={t('admin.headerTextColorLabel')}
                        hint={t('admin.headerTextColorHint')}
                        value={form.headerTextColor ?? null}
                        fallback={DEFAULT_BAR_TEXT_COLOR}
                        onChange={(headerTextColor) => setForm({ ...form, headerTextColor })}
                        savedColors={organisation.savedColors}
                        onSaveCurrent={() => addSavedColor({ color: form.headerTextColor ?? DEFAULT_BAR_TEXT_COLOR })}
                        onRemoveSaved={(c) => removeSavedColor({ color: c })}
                    />
                    <ColorSlot
                        label={t('admin.footerTextColorLabel')}
                        hint={t('admin.footerTextColorHint')}
                        value={form.footerTextColor ?? null}
                        fallback={DEFAULT_BAR_TEXT_COLOR}
                        onChange={(footerTextColor) => setForm({ ...form, footerTextColor })}
                        savedColors={organisation.savedColors}
                        onSaveCurrent={() => addSavedColor({ color: form.footerTextColor ?? DEFAULT_BAR_TEXT_COLOR })}
                        onRemoveSaved={(c) => removeSavedColor({ color: c })}
                    />

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
                    <div className="flex items-center gap-4 mb-6">
                        <div
                            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${displayColor}1A` }}
                        >
                            <Building2 className="w-7 h-7" style={{ color: displayColor }} />
                        </div>
                        <h3 className="text-lg font-semibold text-primary dark:text-slate-100">{organisation.name}</h3>
                    </div>

                    <dl className="divide-y divide-border-gray border-t border-border-gray dark:divide-slate-700 dark:border-slate-700">
                        <div className="py-3 flex justify-between gap-4">
                            <dt className="text-sm text-secondary dark:text-slate-400">{t('admin.memberCount')}</dt>
                            <dd className="text-sm text-right">{activeMembership?.memberCount ?? '—'}</dd>
                        </div>
                        <div className="py-3 flex justify-between gap-4 items-center">
                            <dt className="text-sm text-secondary dark:text-slate-400">{t('admin.colorLabel')}</dt>
                            <dd className="text-sm text-right flex items-center gap-2 justify-end">
                                <span
                                    className="w-4 h-4 rounded-full border border-border-gray dark:border-slate-700"
                                    style={{ backgroundColor: displayColor }}
                                />
                                {organisation.color ? organisation.color : t('admin.colorNoneSet')}
                            </dd>
                        </div>
                        <div className="py-3 flex justify-between gap-4 items-center">
                            <dt className="text-sm text-secondary dark:text-slate-400">{t('admin.headerColorLabel')}</dt>
                            <dd className="text-sm text-right flex items-center gap-2 justify-end">
                                <span
                                    className="w-4 h-4 rounded-full border border-border-gray dark:border-slate-700"
                                    style={{ backgroundColor: organisation.headerColor ?? DEFAULT_BAR_COLOR }}
                                />
                                {organisation.headerColor ? organisation.headerColor : t('admin.colorNoneSet')}
                            </dd>
                        </div>
                        <div className="py-3 flex justify-between gap-4 items-center">
                            <dt className="text-sm text-secondary dark:text-slate-400">{t('admin.footerColorLabel')}</dt>
                            <dd className="text-sm text-right flex items-center gap-2 justify-end">
                                <span
                                    className="w-4 h-4 rounded-full border border-border-gray dark:border-slate-700"
                                    style={{ backgroundColor: organisation.footerColor ?? DEFAULT_BAR_COLOR }}
                                />
                                {organisation.footerColor ? organisation.footerColor : t('admin.colorNoneSet')}
                            </dd>
                        </div>
                        <div className="py-3 flex justify-between gap-4 items-center">
                            <dt className="text-sm text-secondary dark:text-slate-400">{t('admin.headerTextColorLabel')}</dt>
                            <dd className="text-sm text-right flex items-center gap-2 justify-end">
                                <span
                                    className="w-4 h-4 rounded-full border border-border-gray dark:border-slate-700"
                                    style={{ backgroundColor: organisation.headerTextColor ?? DEFAULT_BAR_TEXT_COLOR }}
                                />
                                {organisation.headerTextColor ? organisation.headerTextColor : t('admin.colorNoneSet')}
                            </dd>
                        </div>
                        <div className="py-3 flex justify-between gap-4 items-center">
                            <dt className="text-sm text-secondary dark:text-slate-400">{t('admin.footerTextColorLabel')}</dt>
                            <dd className="text-sm text-right flex items-center gap-2 justify-end">
                                <span
                                    className="w-4 h-4 rounded-full border border-border-gray dark:border-slate-700"
                                    style={{ backgroundColor: organisation.footerTextColor ?? DEFAULT_BAR_TEXT_COLOR }}
                                />
                                {organisation.footerTextColor ? organisation.footerTextColor : t('admin.colorNoneSet')}
                            </dd>
                        </div>
                    </dl>

                    {canEditOrganisation && (
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => startEdit(organisation)}
                                className="bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors"
                            >
                                {t('admin.edit')}
                            </button>
                        </div>
                    )}
                </>
            )}

            {activeMembership?.isAdmin && (
                <div className="mt-6 pt-6 border-t border-border-gray dark:border-slate-700">
                    <DeleteOrganisationControl membership={activeMembership} onDeleted={handleDeleted} />
                </div>
            )}
        </div>
    )
}

// ... resten af filen (DeleteOrganisationControl) forbliver uændret

// US-64: vises kun for administratorer af den AKTIVE organisation.
// Sletning er permanent og fjerner ALT organisationens data samt alle
// andre medlemmers adgang med det samme - bekræft-flowet er derfor
// bevidst tungere end "Forlad": brugeren skal skrive organisationens
// navn præcist OG afkrydse at have forstået konsekvenserne, før knappen
// låses op.
function DeleteOrganisationControl({ membership, onDeleted }: DeleteOrganisationControlProps) {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const [deleteOrganisation, { isLoading: deleting, error: deleteError }] = useDeleteOrganisationMutation()

    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [typedName, setTypedName] = useState('')
    const [dataLossAcked, setDataLossAcked] = useState(false)
    const [memberImpactAcked, setMemberImpactAcked] = useState(false)

    const otherMemberCount = membership.memberCount - 1
    const nameMatches = typedName.trim() === membership.organisationName
    const canDelete = nameMatches && dataLossAcked && (otherMemberCount <= 0 || memberImpactAcked)

    function startConfirm() {
        setTypedName('')
        setDataLossAcked(false)
        setMemberImpactAcked(false)
        setConfirmingDelete(true)
    }

    function cancelConfirm() {
        setConfirmingDelete(false)
    }

    async function handleDelete() {
        if (!canDelete) return
        try {
            const newActiveOrganisation = await deleteOrganisation({ organisationId: membership.organisationId }).unwrap()
            onDeleted(membership.organisationName, membership.isActive, newActiveOrganisation)
        } catch {
            // Fejlen vises via deleteError - forbliver i bekræft-tilstand.
        }
    }

    const deleteErrorMessage = readableError(deleteError)

    if (!confirmingDelete) {
        return (
            <div>
                <button
                    type="button"
                    onClick={startConfirm}
                    className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                    {t('admin.delete')}
                </button>
            </div>
        )
    }

    return (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-3 dark:border-red-800 dark:bg-red-900/30">
            <p className="text-sm text-red-700 font-medium dark:text-red-400">
                {t('admin.deleteWarning', { name: membership.organisationName })}
            </p>

            <div>
                <label className="block text-xs text-secondary mb-1 dark:text-slate-400" htmlFor={`confirm-delete-${membership.organisationId}`}>
                    {t('admin.typeNameToConfirm', { name: membership.organisationName })}
                </label>
                <input
                    id={`confirm-delete-${membership.organisationId}`}
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="w-full rounded-md border border-border-gray bg-white px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
            </div>

            <label className="flex items-start gap-2 text-xs text-secondary dark:text-slate-400">
                <input
                    type="checkbox"
                    checked={dataLossAcked}
                    onChange={(e) => setDataLossAcked(e.target.checked)}
                    className="mt-0.5 rounded border-border-gray bg-white text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-800"
                />
                {t('admin.ackDataLoss')}
            </label>

            {otherMemberCount > 0 && (
                <label className="flex items-start gap-2 text-xs text-secondary dark:text-slate-400">
                    <input
                        type="checkbox"
                        checked={memberImpactAcked}
                        onChange={(e) => setMemberImpactAcked(e.target.checked)}
                        className="mt-0.5 rounded border-border-gray bg-white text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-800"
                    />
                    {t('admin.ackMemberImpact', { count: otherMemberCount })}
                </label>
            )}

            {deleteErrorMessage && <p className="text-red-600 text-xs dark:text-red-400">{deleteErrorMessage}</p>}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!canDelete || deleting}
                    className="rounded-md bg-red-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
                >
                    {deleting ? t('admin.deleting') : t('admin.deletePermanently')}
                </button>
                <button
                    type="button"
                    onClick={cancelConfirm}
                    disabled={deleting}
                    className="rounded-md border border-border-gray bg-bg-gray px-3 py-1.5 text-sm font-medium text-secondary hover:bg-bg-gray/70 transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                >
                    {t('common:cancel')}
                </button>
            </div>
        </div>
    )
}
