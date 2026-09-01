// src/pages/organisation/RequestMembership.tsx
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Organisation } from '../../types/organisation/organisationType'
import { useAppSelector } from '../../store/hooks/hooks'

export default function RequestMembership() {
    // Henter den indloggede brugers session fra Redux 
    const session = useAppSelector((state) => state.auth.session)

    // Liste af organisationer til dropdownen
    const [organisations, setOrganisations] = useState<Organisation[]>([])
    const [loadingOrganisations, setLoadingOrganisations] = useState(true)

    // Formens egen state 
    const [selectedOrgId, setSelectedOrgId] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Henter organisationer én gang ved mount og sætter dem i state, så dropdownen kan vise dem
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

    // Indsætter medlemsanmodningen i databasen ved form submission
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)

        if (!session) {
            setError('Du skal være logget ind for at anmode om medlemskab.')
            return
        }

        setSubmitting(true)

        const { error: insertError } = await supabase
            .from('membership_requests')
            .insert({
                user_id: session.user.id,
                organisation_id: selectedOrgId,
            })

        setSubmitting(false)

        if (insertError) {
            if (insertError.code === '23505') {
                setError('Du har allerede en ventende anmodning til denne organisation.')
            } else {
                setError('Noget gik galt: ' + insertError.message)
            }
            return
        }

        setSuccess(true)
    }

    // Bekræftelsesvisning efter succesfuld indsendelse
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

    // Selve formen
    return (
        <div className="flex items-center justify-center px-2 py-15 sm:px-6 lg:px-8">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
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