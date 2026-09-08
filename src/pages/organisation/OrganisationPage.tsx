// src/pages/organisation/OrganisationPage.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Building2 } from 'lucide-react'
import { useGetMyOrganisationQuery, useUpdateMyOrganisationMutation } from '../../store/apis/organisationApi'
import { useIsAdmin } from '../../store/apis/privilegeApi'
import type { Organisation, UpdateOrganisationInput } from '../../types/organisation/organisationType'

// Tom formular-tilstand, indtil admin trykker "Rediger organisation" og
// feltet fyldes med organisationens nuværende værdi.
const emptyForm: UpdateOrganisationInput = { name: '' }

// Se organisation og rediger organisation. Alle medlemmer kan se
// organisationens navn; kun administratorer kan redigere det - adgangen
// håndhæves server-side af RLS, tjekket her er kun for ikke at vise en
// redigeringsknap til brugere uden rettigheder.
export default function OrganisationPage() {
    const { data: organisation, isLoading, error: queryError } = useGetMyOrganisationQuery()
    const [updateMyOrganisation, { isLoading: saving, error: mutationError }] = useUpdateMyOrganisationMutation()
    const { isAdmin } = useIsAdmin()

    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<UpdateOrganisationInput>(emptyForm)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [savedMessage, setSavedMessage] = useState(false)

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

    // Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt, som kan
    // komme i lidt forskellige former afhængigt af hvor fejlen opstod.
    function readableError(err: unknown): string | null {
        if (!err) return null
        if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
            return err.error
        }
        return 'Noget gik galt. Prøv igen.'
    }

    if (isLoading) {
        return <p className="text-secondary">Indlæser organisation...</p>
    }

    if (queryError) {
        return (
            <div className="max-w-2xl mx-auto rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {readableError(queryError)}
            </div>
        )
    }

    if (!organisation) {
        return (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
                <h1 className="text-xl font-semibold text-primary mb-2">Ingen organisation</h1>
                <p className="text-sm text-secondary">Du er ikke medlem af en organisation endnu.</p>
            </div>
        )
    }

    const saveError = readableError(mutationError)

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
            {/* Overskrift med ikon og navn */}
            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-bg-gray flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-secondary" />
                </div>
                <h1 className="text-xl font-semibold text-primary">{organisation.name}</h1>
            </div>

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
                        <label className="block text-sm text-secondary mb-1" htmlFor="name">Navn</label>
                        <input
                            id="name"
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
                    <dl className="divide-y divide-border-gray border-t border-border-gray">
                        <div className="py-3 flex justify-between gap-4">
                            <dt className="text-sm text-secondary">Navn</dt>
                            <dd className="text-sm text-right">{organisation.name}</dd>
                        </div>
                    </dl>

                    {isAdmin && (
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => startEdit(organisation)}
                                className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors"
                            >
                                Rediger organisation
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
