// src/pages/organisation/RequestMembership.tsx
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Organisation } from '../../types/organisation/organisationType'
import { useRequestMembershipMutation } from '../../store/apis/membershipApi'

// Denne komponent giver brugeren mulighed for at anmode om medlemskab i en organisation.
export default function RequestMembership() {
    // RTK Query-mutation erstatter det direkte supabase.insert()-kald og
    // Redux-dispatchet, der lå her før. isLoading/error kommer nu fra
    // mutationens egen status i stedet for lokal useState.
    const [requestMembership, { isLoading: submitting, error: mutationError }] = useRequestMembershipMutation()

    // State til at holde styr på organisationer, loading-status og valgt organisation
    const [organisations, setOrganisations] = useState<Organisation[]>([])
    const [loadingOrganisations, setLoadingOrganisations] = useState(true)

    // State til at holde styr på brugerens valg og om anmodningen er sendt
    const [selectedOrgId, setSelectedOrgId] = useState('')
    const [success, setSuccess] = useState(false)

    // Hent organisationer fra Supabase, når komponenten mountes
    useEffect(() => {
        async function fetchOrganisations() {
            const { data, error } = await supabase
                .from('organisations')
                .select('id, name')
                .order('name')

            if (error) {
                console.error('Kunne ikke hente organisationer:', error.message)
            } else {
                setOrganisations(data)
            }
            setLoadingOrganisations(false)
        }

        fetchOrganisations()
    }, [])

    // Håndterer form submission for at indsende en medlemsanmodning
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        // Kalder mutationen. .unwrap() gør at en fejl kastes som en
        // JavaScript-exception, så vi kan fange den i catch-blokken i
        // stedet for at skulle tjekke et separat felt manuelt her.
        try {
            await requestMembership({ organisationId: selectedOrgId }).unwrap()
            // Ved succes invaliderer mutationen automatisk 'PendingRequest',
            // så banneret opdaterer sig selv - vi behøver ikke dispatche noget.
            setSuccess(true)
        } catch {
            // Fejlen er allerede tilgængelig via mutationError nedenfor,
            // så her behøver vi ikke gøre andet end at undlade at vise
            // succes-beskeden.
        }
    }

    // Hjælpefunktion der udtrækker en læsbar fejlbesked fra mutationens
    // error-objekt, som RTK Query kan returnere i lidt forskellige former.
    function getErrorMessage(): string | null {
        if (!mutationError) return null

        // Ekstra typetjek, så TypeScript er sikker på mutationError er et
        // objekt, før vi bruger 'in'-operatoren på det.
        if (
            typeof mutationError === 'object' &&
            mutationError !== null &&
            'error' in mutationError &&
            typeof mutationError.error === 'string'
        ) {
            return mutationError.error
        }

        return 'Noget gik galt. Prøv igen.'
    }

    const errorMessage = getErrorMessage()

    // Hvis anmodningen er sendt succesfuldt, vis en bekræftelsesbesked i stedet for formen
    if (success) {
        return (
            <div className="max-w-md mx-auto mt-10 bg-white rounded-lg shadow-md p-8 text-center">
                <h1 className="text-xl font-semibold text-primary mb-2">Anmodning sendt</h1>
                <p className="text-secondary">
                    Din medlemsanmodning er sendt og afventer godkendelse fra organisationens administrator.
                </p>
            </div>
        )
    }

    // Render formen til at anmode om medlemskab, inklusiv dropdown til at vælge organisation og submit-knap
    return (
        <div className="flex items-center justify-center px-2 py-15 sm:px-6 lg:px-8">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-slate-900">
                <h1 className="text-xl font-semibold text-primary mb-6">Anmod om medlemskab</h1>

                {errorMessage && (
                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                        {errorMessage}
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-sm text-secondary mb-1" htmlFor="organisation">
                        Vælg organisation
                    </label>
                    <select
                        id="organisation"
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        disabled={loadingOrganisations}
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        <option value="" disabled>
                            {loadingOrganisations ? 'Henter organisationer...' : 'Vælg en organisation'}
                        </option>
                        {organisations.map((org) => (
                            <option key={org.id} value={org.id}>
                                {org.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={submitting || !selectedOrgId}
                    className="w-full bg-primary text-white rounded-md py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                >
                    {submitting ? 'Sender anmodning...' : 'Send anmodning'}
                </button>
            </form>
        </div>
    )
}