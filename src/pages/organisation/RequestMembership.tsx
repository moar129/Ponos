import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Organisation } from '../../types/organisation/organisationType'
import { useAppDispatch, useAppSelector } from '../../store/hooks/hooks'
import { pendingRequestSet } from '../../store/slices/membershipSlice' 

// Denne komponent giver brugeren mulighed for at anmode om medlemskab i en organisation.
export default function RequestMembership() {
    // Hent session fra Redux, så vi kan få brugerens ID til at indsætte i membership_requests-tabellen
    const session = useAppSelector((state) => state.auth.session)
    const dispatch = useAppDispatch()

    // State til at holde styr på organisationer, loading-status, valgt organisation, form submission status, fejl og succes
    const [organisations, setOrganisations] = useState<Organisation[]>([])
    const [loadingOrganisations, setLoadingOrganisations] = useState(true)

    // State til at holde styr på brugerens valg og form status
    const [selectedOrgId, setSelectedOrgId] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
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
        setError(null)

        // Tjek om brugeren er logget ind, før vi forsøger at indsende anmodningen
        if (!session) {
            setError('Du skal være logget ind for at anmode om medlemskab.')
            return
        }
        setSubmitting(true)

        // Indsæt en ny række i membership_requests-tabellen med brugerens ID og den valgte organisations ID
        const { error: insertError } = await supabase
            .from('membership_requests')
            .insert({
                user_id: session.user.id,
                organisation_id: selectedOrgId,
            })

        setSubmitting(false)
        
        // Håndter fejl ved indsættelse, f.eks. hvis brugeren allerede har en ventende anmodning
        if (insertError) {
            if (insertError.code === '23505') {
                setError('Du har allerede en ventende anmodning til denne organisation.')
            } else {
                setError('Noget gik galt: ' + insertError.message)
            }
            return
        }

        // find det valgte org-navn og opdater Redux med det samme
        const selectedOrg = organisations.find((org) => org.id === selectedOrgId)

        // Hvis organisationen findes, opdater Redux state med den valgte organisations ID og navn, så vi kan vise det i UI'et senere
        if (selectedOrg) {
            dispatch(
                pendingRequestSet({
                    organisationId: selectedOrg.id,
                    organisationName: selectedOrg.name,
                })
            )
        }

        setSuccess(true)
    }

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

                {error && (
                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                        {error}
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