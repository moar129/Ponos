// src/pages/organisation/MembershipRequestsPage.tsx
import { useState } from 'react'
import { Check, UserPlus, X } from 'lucide-react'
import {
    useGetPendingMembershipRequestsQuery,
    useReviewMembershipRequestMutation,
} from '../../store/apis/membershipApi'
import { useIsAdmin } from '../../store/apis/privilegeApi'
import type { MembershipRequest, ReviewMembershipRequestInput } from '../../types/membership/membershipType'

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

// US-06 (se), US-07 (accepter) og US-08 (afvis) i ét sammenhængende
// admin-view. Adgangen håndhæves server-side af RLS - tjekket her er
// kun for at undgå at vise en tom side til brugere uden rettigheder.
export default function MembershipRequestsPage() {
    const { isAdmin, isLoading: loadingPrivileges } = useIsAdmin()
    const { data: requests, isLoading, error: queryError } = useGetPendingMembershipRequestsQuery(undefined, {
        skip: !isAdmin,
    })
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

    if (loadingPrivileges) {
        return <p className="text-secondary">Indlæser...</p>
    }

    if (!isAdmin) {
        return (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
                <h1 className="text-xl font-semibold text-primary mb-2">Ingen adgang</h1>
                <p className="text-sm text-secondary">
                    Kun administratorer kan behandle medlemsanmodninger.
                </p>
            </div>
        )
    }

    const listError = readableError(queryError)
    const actionError = readableError(mutationError)

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-bg-gray flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-secondary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-primary">Medlemsanmodninger</h1>
                    <p className="text-sm text-secondary">
                        Brugere, der har anmodet om adgang til din organisation.
                    </p>
                </div>
            </div>

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

interface RequestRowProps {
    request: MembershipRequest
    pendingDecision: PendingDecision | null
    submitting: boolean
    onSelect: (decision: PendingDecision) => void
    onCancel: () => void
    onConfirm: (decision: PendingDecision) => void
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
