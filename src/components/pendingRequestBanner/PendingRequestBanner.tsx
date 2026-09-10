// src/components/pendingRequestBanner/PendingRequestBanner.tsx
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useGetMyPendingRequestQuery } from '../../store/apis/membershipApi'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'

// Viser en banner under navbaren med brugerens medlemskabs-tilstand:
// enten "din anmodning afventer" eller - for en bruger uden organisation
// og uden anmodning - en genvej til at anmode. Henter data via RTK Query
// i stedet for Redux-slice, så komponenten virker uanset hvilken side
// brugeren er på.
export default function PendingRequestBanner() {
    const { pathname } = useLocation()
    const [searchParams] = useSearchParams()
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

    // Ingen profil = ikke logget ind (fx på /login og /signup). Organisation
    // (US-65) er en fane på dashboardet i stedet for en selvstændig side -
    // på dette tidspunkt ved vi allerede (via activeOrganisationId ovenfor)
    // at brugeren ingen aktiv organisation har, så dashboardets Organisation-
    // fane er den, der reelt vises, når intet ?tab= peger på en anden fane
    // (se Dashboard.tsx's default-fane-logik - hold de to i sync).
    const tabParam = searchParams.get('tab')
    const onDashboardOrganisationTab = pathname === '/dashboard' && tabParam !== 'oversigt' && tabParam !== 'administration'
    if (!profile || profile.activeOrganisationId || onDashboardOrganisationTab) {
        return null
    }

    return (
        <div className="w-full bg-accent/15 border-b border-accent text-primary text-sm text-center px-4 py-2">
            Du er ikke medlem af en organisation endnu.{' '}
            <Link to="/dashboard?tab=organisation" className="font-semibold underline hover:no-underline">
                Opret eller anmod om medlemskab
            </Link>
        </div>
    )
}
