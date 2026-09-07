// src/components/pendingRequestBanner/PendingRequestBanner.tsx
import { useGetMyPendingRequestQuery } from '../../store/apis/membershipApi'

// Viser en banner under navbaren, hvis den indloggede bruger har en
// ventende (Pending) medlemsanmodning. Henter data via RTK Query i
// stedet for Redux-slice, så komponenten virker uanset hvilken side
// brugeren er på.
export default function PendingRequestBanner() {
    const { data: pendingRequest, isLoading } = useGetMyPendingRequestQuery()

    if (isLoading || !pendingRequest) {
        return null
    }

    return (
        <div className="w-full bg-accent/15 border-b border-accent text-primary text-sm text-center px-4 py-2">
            Din anmodning om medlemskab af <strong>{pendingRequest.organisationName}</strong> afventer godkendelse.
        </div>
    )
}