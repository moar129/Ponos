import { useAppSelector } from '../../store/hooks/hooks'
// Viser en banner under navbaren, hvis den indloggede bruger har en
// ventende (Pending) medlemsanmodning. Læser direkte fra Redux, så den
// virker uanset hvilken side brugeren er på.
export default function PendingRequestBanner() {
    const pendingRequest = useAppSelector((state) => state.membership.pendingRequest)
    const membershipStatus = useAppSelector((state) => state.membership.status)

    if (membershipStatus === 'loading' || !pendingRequest) {
        return null
    }

    return (
        <div className="w-full bg-[#C7975D]/15 border-b border-[#C7975D] text-[#0B132A] text-sm text-center px-4 py-2">
            Din anmodning om medlemskab af <strong>{pendingRequest.organisationName}</strong> afventer godkendelse.
        </div>
    )
}