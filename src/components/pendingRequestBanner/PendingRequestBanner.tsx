// src/components/pendingRequestBanner/PendingRequestBanner.tsx
import { Link, useLocation } from 'react-router-dom'
import { useGetMyPendingRequestQuery } from '../../store/apis/membershipApi'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'

// Viser en banner under navbaren med brugerens medlemskabs-tilstand:
// enten "din anmodning afventer" eller - for en bruger uden organisation
// og uden anmodning - en genvej til at anmode. Henter data via RTK Query
// i stedet for Redux-slice, så komponenten virker uanset hvilken side
// brugeren er på.
export default function PendingRequestBanner() {
    const { pathname } = useLocation()
    const { data: pendingRequest, isLoading: loadingRequest } = useGetMyPendingRequestQuery()
    const { data: profile, isLoading: loadingProfile } = useGetMyProfileQuery()

    if (loadingRequest || loadingProfile) {
        return null
    }

    if (pendingRequest) {
        return (
            <div className="w-full bg-accent/15 border-b border-accent text-primary text-sm text-center px-4 py-2">
                Din anmodning om medlemskab af <strong>{pendingRequest.organisationName}</strong> afventer godkendelse.
            </div>
        )
    }

    // Ingen profil = ikke logget ind (fx på /login og /signup), og på
    // selve anmodningssiden ville opfordringen være overflødig.
    if (!profile || profile.organisationId || pathname === '/request-membership') {
        return null
    }

    return (
        <div className="w-full bg-accent/15 border-b border-accent text-primary text-sm text-center px-4 py-2">
            Du er ikke medlem af en organisation endnu.{' '}
            <Link to="/request-membership" className="font-semibold underline hover:no-underline">
                Anmod om medlemskab
            </Link>
        </div>
    )
}
