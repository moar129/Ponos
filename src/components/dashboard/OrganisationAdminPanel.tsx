// src/components/dashboard/OrganisationAdminPanel.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
    useActiveMembership,
    useDeleteOrganisationMutation,
    useGetMyOrganisationQuery,
    useUpdateMyOrganisationMutation,
} from '../../store/apis/organisationApi'
import { UPDATE_ORGANISATION_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import type { DeleteOrganisationControlProps, Organisation } from '../../types/organisation/organisationType'
import { organisationColorsOf } from '../../utils/orgPalette'
import { organisationExitMessage } from '../../utils/organisationExitMessage'
import { Alert } from '../common/Alert'
import { DetailList, DetailRow } from '../common/DetailList'
import { OrganisationHeader } from './OrganisationHeader'

// Rediger organisation (navn) + slet organisation, samlet i ét panel
// under dashboardets Administration-fane (US-65) - flyttet fra
// OrganisationPage.tsx. Panelet kan mountes af AdministrationTab enten
// via update_organisation-privilegiet eller admin-status alene, så begge
// kontroller er selvstændigt gatet HERINDE, uafhængigt af hinanden:
// "Rediger organisation" kræver update_organisation-privilegiet
// (canEditOrganisation), "Slet organisation" kræver udelukkende
// aktivt medlemskabs isAdmin-flag. Begge håndhæves også server-side
// (RLS/RPC) - UI-gaten er kun for at vise de rigtige knapper.
//
// Farverne ligger i deres egen underfane (OrganisationColorsPanel.tsx,
// flyttet 2026-09-29).
export function OrganisationAdminPanel() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: organisation, isLoading, error: queryError } = useGetMyOrganisationQuery()
    // Egen aktive medlemskab - afgør om "Slet organisation" vises,
    // uafhængigt af update_organisation-privilegiet.
    const activeMembership = useActiveMembership()
    const { hasPrivilege: canEditOrganisation } = useHasPrivilege(UPDATE_ORGANISATION_PRIVILEGE)
    const [updateMyOrganisation, { isLoading: saving, error: mutationError }] = useUpdateMyOrganisationMutation()

    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)
    const [savedMessage, setSavedMessage] = useState(false)
    const [deletedMessage, setDeletedMessage] = useState<string | null>(null)

    function startEdit(current: Organisation) {
        setName(current.name)
        setValidationError(null)
        setSavedMessage(false)
        setIsEditing(true)
    }

    function cancelEdit() {
        setIsEditing(false)
        setValidationError(null)
    }


    const handleSubmit = async (current: Organisation) => {
        setSavedMessage(false)

        const trimmedName = name.trim()

        if (!trimmedName) {
            setValidationError(t('errors:required.organisationName'))
            return
        }

        setValidationError(null)

        try {
            // Mutationen skriver alle felter - farverne sendes uændret med.
            await updateMyOrganisation({ name: trimmedName, ...organisationColorsOf(current) }).unwrap()

            setIsEditing(false)
            setSavedMessage(true)
        } catch {
            // Fejlen vises via mutationError
        }
    }

    function handleDeleted(organisationName: string, wasActive: boolean, newActiveOrganisation: Organisation | null) {
        setDeletedMessage(organisationExitMessage(t, 'organisation:admin.deleted', organisationName, wasActive, newActiveOrganisation))
    }

    if (isLoading) {
        return <p className="text-secondary dark:text-slate-400">{t('admin.loading')}</p>
    }

    if (queryError || !organisation) {
        return <Alert>{readableError(queryError) ?? t('admin.loadFailed')}</Alert>
    }

    const saveError = readableError(mutationError)

    return (
        <div>
            <Alert tone="success" className="mb-4">{deletedMessage}</Alert>
            {savedMessage && !isEditing && <Alert tone="success" className="mb-4">{t('admin.saved')}</Alert>}
            <Alert className="mb-4">{validationError ?? saveError}</Alert>

            {isEditing ? (
                <form onSubmit={(event) => {
                    event.preventDefault()
                    void handleSubmit(organisation)
                }}>
                    <div className="mb-6">
                        <label className="block text-sm text-secondary mb-1 dark:text-slate-400" htmlFor="org-name">{t('admin.nameLabel')}</label>
                        <input
                            id="org-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-accent text-accent-text rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
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
                    <OrganisationHeader name={organisation.name} />

                    <DetailList>
                        <DetailRow label={t('admin.memberCount')}>{activeMembership?.memberCount ?? '—'}</DetailRow>
                    </DetailList>

                    {canEditOrganisation && (
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => startEdit(organisation)}
                                className="bg-accent text-accent-text rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors"
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
                    {deleting ? t('common:deleting') : t('admin.deletePermanently')}
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
