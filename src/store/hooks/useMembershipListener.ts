import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppDispatch, useAppSelector } from './hooks'
import { pendingRequestLoaded } from '../slices/membershipSlice'

// Henter brugerens evt. ventende (Pending) medlemsanmodning, så en banner
// kan vises et vilkårligt sted i appen - uden at brugeren selv skal have
// besøgt RequestMembership-siden i den aktuelle session.
export function useMembershipListener() {
    const dispatch = useAppDispatch()
    const session = useAppSelector((state) => state.auth.session)
    const authStatus = useAppSelector((state) => state.auth.status)

    useEffect(() => {
        // Vent med at spørge databasen, til vi rent faktisk ved om der er
        // en indlogget bruger (authStatus starter som 'loading').
        if (authStatus === 'loading') {
            return
        }

        // Ingen bruger logget ind -> ingen anmodning at vise.
        if (!session) {
            dispatch(pendingRequestLoaded(null))
            return
        }

        async function fetchPendingRequest() {
            // Henter evt. Pending-anmodning for den indloggede bruger,
            // inkl. organisationens navn via join
            const { data, error } = await supabase
                .from('membership_requests')
                .select('organisation_id, organisations(name)')
                .eq('user_id', session!.user.id)
                .eq('status', 'Pending')
                .maybeSingle()

            // Hvis der er en fejl, logger vi den og sætter Redux state til null (ingen anmodning).
            if (error) {
                console.error('Kunne ikke hente medlemskabsstatus:', error.message)
                dispatch(pendingRequestLoaded(null))
                return
            }

            // Hvis der ikke er nogen anmodning, sætter vi Redux state til null.
            if (!data) {
                dispatch(pendingRequestLoaded(null))
                return
            }

            // Hvis der ER en anmodning, opdaterer vi Redux state med organisationens ID og navn.
            dispatch(
                pendingRequestLoaded({
                    organisationId: data.organisation_id,
                    organisationName: (data.organisations as unknown as { name: string }).name,
                })
            )
        }

        // Kald funktionen for at hente evt. Pending-anmodning
        fetchPendingRequest()
    }, [session, authStatus, dispatch])
}