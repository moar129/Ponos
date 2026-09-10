// src/components/dashboard/MembershipRequestsPanel.tsx
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import {
    useGetPendingMembershipRequestsQuery,
    useReviewMembershipRequestMutation,
} from '../../store/apis/membershipApi'
import type { RequestRowProps, ReviewMembershipRequestInput } from '../../types/membership/membershipType'

// Hvilken række der afventer bekræftelse, og hvad der blev trykket på.
type PendingDecision = ReviewMembershipRequestInput

// Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt, som kan
// komme i lidt forskellige former afhængigt af hvor fejlen opstod.
function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

// Se, accepter og afvis medlemsanmodninger, i ét panel under
// dashboardets Administration-fane (US-65). Panelet mountes kun når
// AdministrationTab allerede har bekræftet manage_membership_requests-
// privilegiet - selve adgangen håndhæves stadig server-side af RLS.
export function MembershipRequestsPanel() {
    const { data: requests, isLoading, error: queryError } = useGetPendingMembershipRequestsQuery()
    const [reviewRequest, { isLoading: submitting, error: mutationError }] = useReviewMembershipRequestMutation()

    // Både accept og afvisning skal bekræftes, så et fejlklik ikke rammer
    // en ansøger. Rækken skifter til en bekræftelses-boks i stedet for at
    // bruge browserens confirm().
    const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null)

    async function confirmDecision(decision: PendingDecision) {
        try {
            await reviewRequest(decision).unwrap()
            // Mutationen invaliderer 'MembershipRequest', så listen henter
            // sig selv igen og den behandlede række forsvinder.
            setPendingDecision(null)
        } catch {
            // Fejlen vises via mutationError; bekræftelses-boksen lukkes,
            // så listen ikke står fast i en halv-tilstand.
            setPendingDecision(null)
        }
    }

    const listError = readableError(queryError)
    const actionError = readableError(mutationError)

    return (
        <div>
            {(listError || actionError) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {listError ?? actionError}
                </div>
            )}

            {isLoading ? (
                <p className="text-secondary">Indlæser anmodninger...</p>
            ) : !requests || requests.length === 0 ? (
                <p className="text-secondary">Der er ingen ventende anmodninger.</p>
            ) : (
                <ul className="divide-y divide-border-gray border-t border-border-gray">
                    {requests.map((request) => (
                        <li key={request.id} className="py-4">
                            <RequestRow
                                request={request}
                                pendingDecision={pendingDecision}
                                submitting={submitting}
                                onSelect={setPendingDecision}
                                onCancel={() => setPendingDecision(null)}
                                onConfirm={confirmDecision}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

// Én anmodning: enten navn/email + de to knapper, eller - hvis netop
// denne række afventer bekræftelse - en "er du sikker?"-boks.
function RequestRow({ request, pendingDecision, submitting, onSelect, onCancel, onConfirm }: RequestRowProps) {
    const decision = pendingDecision?.requestId === request.id ? pendingDecision : null

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <p className="font-medium">
                    {request.firstName} {request.lastName}
                </p>
                <p className="text-sm text-secondary">{request.email}</p>
                <p className="text-xs text-secondary mt-1">
                    Anmodet {formatDate(request.requestedAt)}
                </p>
            </div>

            {decision ? (
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-secondary max-w-xs">
                        {decision.decision === 'Accepted'
                            ? `Er du sikker på, at ${request.firstName} skal optages i organisationen?`
                            : `Er du sikker på, at anmodningen skal afvises? ${request.firstName} kan anmode igen senere.`}
                    </p>
                    <button
                        type="button"
                        onClick={() => onConfirm(decision)}
                        disabled={submitting}
                        className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                    >
                        {submitting ? 'Behandler...' : 'Ja'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="rounded-md border border-border-gray px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                    >
                        Annuller
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onSelect({ requestId: request.id, decision: 'Accepted' })}
                        disabled={submitting}
                        className="flex items-center gap-2 bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                    >
                        <Check className="w-4 h-4" />
                        Accepter
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelect({ requestId: request.id, decision: 'Rejected' })}
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-md border border-border-gray px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                    >
                        <X className="w-4 h-4" />
                        Afvis
                    </button>
                </div>
            )}
        </div>
    )
}
