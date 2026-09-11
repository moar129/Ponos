// src/components/dashboard/OrganisationAdminPanel.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Building2 } from 'lucide-react'
import {
    useDeleteOrganisationMutation,
    useGetMyMembershipsQuery,
    useGetMyOrganisationQuery,
    useUpdateMyOrganisationMutation,
} from '../../store/apis/organisationApi'
import type { DeleteOrganisationControlProps, Organisation, UpdateOrganisationInput } from '../../types/organisation/organisationType'

// Tom formular-tilstand, indtil admin trykker "Rediger organisation" og
// feltet fyldes med organisationens nuværende værdi.
const emptyForm: UpdateOrganisationInput = { name: '' }

// Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt, som kan
// komme i lidt forskellige former afhængigt af hvor fejlen opstod.
function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

// Rediger organisation (navn) + slet organisation, samlet i ét panel
// under dashboardets Administration-fane (US-65) - flyttet fra
// OrganisationPage.tsx. Panelet mountes kun når AdministrationTab
// allerede har bekræftet manage_organisation-privilegiet - selve
// rediger-adgangen håndhæves stadig server-side af RLS, og slet-knappen
// nedenfor har sit eget uafhængige isAdmin-tjek.
export function OrganisationAdminPanel() {
    const { data: organisation, isLoading, error: queryError } = useGetMyOrganisationQuery()
    const { data: memberships } = useGetMyMembershipsQuery()
    const [updateMyOrganisation, { isLoading: saving, error: mutationError }] = useUpdateMyOrganisationMutation()

    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<UpdateOrganisationInput>(emptyForm)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [savedMessage, setSavedMessage] = useState(false)
    const [deletedMessage, setDeletedMessage] = useState<string | null>(null)

    function startEdit(current: Organisation) {
        setForm({ name: current.name })
        setValidationError(null)
        setSavedMessage(false)
        setIsEditing(true)
    }

    function cancelEdit() {
        setIsEditing(false)
        setValidationError(null)
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavedMessage(false)

        if (!form.name.trim()) {
            setValidationError('Organisationens navn skal udfyldes.')
            return
        }
        setValidationError(null)

        try {
            await updateMyOrganisation({ name: form.name.trim() }).unwrap()

            // Mutationen invaliderer 'Organisation', så visningen nedenfor
            // henter og viser det nye navn automatisk.
            setIsEditing(false)
            setSavedMessage(true)
        } catch {
            // Fejlen vises via mutationError - vi bliver i redigerings-
            // tilstand, så administratorens indtastning ikke går tabt.
        }
    }

    function handleDeleted(organisationName: string, wasActive: boolean, newActiveOrganisation: Organisation | null) {
        if (!wasActive) {
            setDeletedMessage(`"${organisationName}" er slettet.`)
        } else if (newActiveOrganisation) {
            setDeletedMessage(`"${organisationName}" er slettet. Din aktive organisation er nu "${newActiveOrganisation.name}".`)
        } else {
            setDeletedMessage(`"${organisationName}" er slettet. Du har ingen aktiv organisation længere.`)
        }
    }

    if (isLoading) {
        return <p className="text-secondary">Indlæser organisation...</p>
    }

    if (queryError || !organisation) {
        return (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {readableError(queryError) ?? 'Kunne ikke hente organisationen.'}
            </div>
        )
    }

    // Egen aktive medlemskab - bruges til at afgøre om "Slet organisation"
    // skal vises, uafhængigt af manage_organisation-privilegiet.
    const activeMembership = memberships?.find((m) => m.isActive) ?? null
    const saveError = readableError(mutationError)

    return (
        <div>
            {deletedMessage && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                    {deletedMessage}
                </div>
            )}

            {savedMessage && !isEditing && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                    Organisationens oplysninger er gemt.
                </div>
            )}

            {(validationError || saveError) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {validationError ?? saveError}
                </div>
            )}

            {isEditing ? (
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm text-secondary mb-1" htmlFor="org-name">Navn</label>
                        <input
                            id="org-name"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ name: e.target.value })}
                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                        >
                            {saving ? 'Gemmer...' : 'Gem ændringer'}
                        </button>
                        <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-md border border-border-gray px-4 py-2 font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                        >
                            Annuller
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-full bg-bg-gray flex items-center justify-center shrink-0">
                            <Building2 className="w-7 h-7 text-secondary" />
                        </div>
                        <h3 className="text-lg font-semibold text-primary">{organisation.name}</h3>
                    </div>

                    <dl className="divide-y divide-border-gray border-t border-border-gray">
                        <div className="py-3 flex justify-between gap-4">
                            <dt className="text-sm text-secondary">Antal medlemmer</dt>
                            <dd className="text-sm text-right">{activeMembership?.memberCount ?? '—'}</dd>
                        </div>
                    </dl>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => startEdit(organisation)}
                            className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors"
                        >
                            Rediger organisation
                        </button>
                    </div>
                </>
            )}

            {activeMembership?.isAdmin && (
                <div className="mt-6 pt-6 border-t border-border-gray">
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
                    className="text-xs font-medium text-red-700 hover:underline"
                >
                    Slet organisation
                </button>
            </div>
        )
    }

    return (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-3">
            <p className="text-sm text-red-700 font-medium">
                Dette sletter "{membership.organisationName}" permanent og kan ikke fortrydes.
            </p>

            <div>
                <label className="block text-xs text-secondary mb-1" htmlFor={`confirm-delete-${membership.organisationId}`}>
                    Skriv organisationens navn ({membership.organisationName}) for at bekræfte
                </label>
                <input
                    id={`confirm-delete-${membership.organisationId}`}
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="w-full rounded-md border border-border-gray px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
            </div>

            <label className="flex items-start gap-2 text-xs text-secondary">
                <input
                    type="checkbox"
                    checked={dataLossAcked}
                    onChange={(e) => setDataLossAcked(e.target.checked)}
                    className="mt-0.5 rounded border-border-gray"
                />
                Jeg forstår at al organisationens data (opgaver, items, kategorier, lokationer og statistik) slettes permanent og ikke kan gendannes.
            </label>

            {otherMemberCount > 0 && (
                <label className="flex items-start gap-2 text-xs text-secondary">
                    <input
                        type="checkbox"
                        checked={memberImpactAcked}
                        onChange={(e) => setMemberImpactAcked(e.target.checked)}
                        className="mt-0.5 rounded border-border-gray"
                    />
                    Jeg forstår at de {otherMemberCount} andre medlemmer mister deres adgang med det samme.
                </label>
            )}

            {deleteErrorMessage && <p className="text-red-700 text-xs">{deleteErrorMessage}</p>}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!canDelete || deleting}
                    className="rounded-md bg-red-700 text-white px-3 py-1.5 text-sm font-medium hover:bg-red-800 transition-colors disabled:opacity-50"
                >
                    {deleting ? 'Sletter...' : 'Slet permanent'}
                </button>
                <button
                    type="button"
                    onClick={cancelConfirm}
                    disabled={deleting}
                    className="rounded-md border border-border-gray px-3 py-1.5 text-sm font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                >
                    Annuller
                </button>
            </div>
        </div>
    )
}
