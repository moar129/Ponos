// src/pages/organisation/RequestMembership.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Organisation } from '../../types/organisation/organisationType'

// Denne side er kun til at hente organisations-data fra Supabase, så vi kan bygge en dropdown/vælger i UI'en.
export default function RequestMembership() {
    // Vi gemmer organisations-data i state, så vi kan bruge dem i UI'en.
    const [organisations, setOrganisations] = useState<Organisation[]>([])
    const [loadingOrganisations, setLoadingOrganisations] = useState(true)
    
    // useEffect kører kun én gang, når komponenten mountes, og henter organisations-data fra Supabase.
    useEffect(() => {
        async function fetchOrganisations() {
            const { data, error } = await supabase
                .from('organisations')
                .select('id, name')
                .order('name')

            // Hvis der er en fejl, logger vi den til konsollen. Ellers gemmer vi data i state.
            if (error) {
                console.error('Kunne ikke hente organisationer:', error.message)
            } else {
                setOrganisations(data)
            }
            setLoadingOrganisations(false)
        }

        // Kald funktionen til at hente organisations-data
        fetchOrganisations()
    }, [])

    return (
        <div>
            {/* Formen bygger lidt senere */}
        </div>
    )
}