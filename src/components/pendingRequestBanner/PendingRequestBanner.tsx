// src/components/pendingRequestBanner/PendingRequestBanner.tsx
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useGetMyPendingRequestQuery } from '../../store/apis/membershipApi'
import { useGetMyPendingInvitationsQuery } from '../../store/apis/invitationApi'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'

// Viser en banner under navbaren med brugerens medlemskabs-tilstand:
// egen ventende anmodning, ellers en ventende invitation (US-67), ellers
// - for en bruger uden organisation og uden nogen af delene - en genvej
// til at anmode. Henter data via RTK Query i stedet for Redux-slice, så
// komponenten virker uanset hvilken side brugeren er på.
export default function PendingRequestBanner() {
    const { pathname } = useLocation()
    const [searchParams] = useSearchParams()
    const { data: pendingRequest, isLoading: loadingRequest } = useGetMyPendingRequestQuery()
    const { data: pendingInvitations, isLoading: loadingInvitations } = useGetMyPendingInvitationsQuery()
    const { data: profile, isLoading: loadingProfile } = useGetMyProfileQuery()

    if (loadingRequest || loadingInvitations || loadingProfile) {
        return null
    }

    if (pendingRequest) {
        return (
            <div className="w-full bg-accent/15 border-b border-accent text-primary text-sm text-center px-4 py-2">
                Din anmodning om medlemskab af <strong>{pendingRequest.organisationName}</strong> afventer godkendelse.
            </div>
        )
    }

    // Organisation (US-65) er en fane på dashboardet i stedet for en
    // selvstændig side - dette tjek dækker BÅDE "no org"-opfordringen og
    // invitations-banneret nedenfor, så ingen af dem vises mens brugeren
    // allerede kigger på Organisation-fanen (hvor invitationen/opfordringen
    // i forvejen er synlig). En bruger uden ?tab= og uden aktiv organisation
    // lander som udgangspunkt netop på Organisation-fanen (se Dashboard.tsx's
    // default-fane-logik - hold de to i sync).
    const tabParam = searchParams.get('tab')
    const onDashboardOrganisationTab = pathname === '/dashboard' && tabParam !== 'oversigt' && tabParam !== 'administration'
    if (!profile) {
        return null
    }

    if ((pendingInvitations?.length ?? 0) > 0 && !onDashboardOrganisationTab) {
        const [firstInvitation] = pendingInvitations!
        return (
            <div className="w-full bg-accent/15 border-b border-accent text-primary text-sm text-center px-4 py-2">
                Du er blevet inviteret til at blive medlem af <strong>{firstInvitation.organisationName}</strong>.{' '}
                <Link to="/dashboard?tab=organisation" className="font-semibold underline hover:no-underline">
                    Se invitation
                </Link>
            </div>
        )
    }

    if (profile.activeOrganisationId || onDashboardOrganisationTab) {
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
