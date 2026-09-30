// src/components/dashboard/MembershipRequestsPanel.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
    useGetPendingMembershipRequestsQuery,
    useReviewMembershipRequestMutation,
} from '../../store/apis/membershipApi'
import { formatDate } from '../../utils/formatDate'
import { formatFullName } from '../../utils/personName'
import { Alert } from '../common/Alert'
import { DecisionActions } from '../common/DecisionActions'
import type { Decision } from '../../types/common/confirmType'
import type { RequestRowProps } from '../../types/membership/membershipType'

// Se, accepter og afvis medlemsanmodninger, i ét panel under
// dashboardets Administration-fane (US-65). Panelet mountes kun når
// AdministrationTab allerede har bekræftet privilegiet - selve adgangen
// håndhæves stadig server-side af RLS.
export function MembershipRequestsPanel() {
    const { t } = useTranslation(['organisation', 'common'])
    const { data: requests, isLoading, error: queryError } = useGetPendingMembershipRequestsQuery()
    const [reviewRequest, { isLoading: submitting, error: mutationError }] = useReviewMembershipRequestMutation()

    // Både accept og afvisning skal bekræftes, så et fejlklik ikke rammer
    // en ansøger.
    const [pending, setPending] = useState<{ requestId: string; decision: Decision } | null>(null)

    async function confirmDecision() {
        if (!pending) return
        try {
            // Mutationen invaliderer 'MembershipRequest', så den behandlede
            // række forsvinder af sig selv.
            await reviewRequest({
                requestId: pending.requestId,
                decision: pending.decision === 'accept' ? 'Accepted' : 'Rejected',
            }).unwrap()
        } catch {
            // Fejlen vises via mutationError.
        } finally {
            setPending(null)
        }
    }

    return (
        <div>
            <Alert className="mb-4">{readableError(queryError) ?? readableError(mutationError)}</Alert>

            {isLoading ? (
                <p className="text-secondary dark:text-slate-400">{t('requests.loading')}</p>
            ) : !requests || requests.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('requests.empty')}</p>
            ) : (
                <ul className="divide-y divide-border-gray border-t border-border-gray dark:divide-slate-700 dark:border-slate-700">
                    {requests.map((request) => (
                        <li key={request.id} className="py-4">
                            <RequestRow
                                request={request}
                                pending={pending?.requestId === request.id ? pending.decision : null}
                                submitting={submitting}
                                onSelect={(decision) => setPending({ requestId: request.id, decision })}
                                onCancel={() => setPending(null)}
                                onConfirm={confirmDecision}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

function RequestRow({ request, pending, submitting, onSelect, onCancel, onConfirm }: RequestRowProps) {
    const { t } = useTranslation('organisation')

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <p className="font-medium">{formatFullName(request.firstName, request.lastName)}</p>
                <p className="text-sm text-secondary dark:text-slate-400">{request.email}</p>
                <p className="text-xs text-secondary mt-1 dark:text-slate-400">
                    {t('requests.requestedOn', { date: formatDate(request.requestedAt) })}
                </p>
            </div>

            <DecisionActions
                pending={pending}
                onSelect={onSelect}
                onConfirm={onConfirm}
                onCancel={onCancel}
                submitting={submitting}
                acceptLabel={t('requests.accept')}
                rejectLabel={t('requests.reject')}
                confirmText={pending === 'accept'
                    ? t('requests.confirmAccept', { name: request.firstName })
                    : t('requests.confirmReject', { name: request.firstName })}
            />
        </div>
    )
}
