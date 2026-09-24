// src/components/dashboard/TaskApprovalsPanel.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import {
    useApproveTaskRequestMutation,
    useGetPendingTaskRequestsQuery,
    useRejectTaskRequestMutation,
} from '../../store/apis/taskApi'
import { formatDateTime } from '../../utils/formatDate'
import {
    APPROVE_TASK_PRIVILEGE,
    REJECT_TASK_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import type { TaskApprovalRowProps } from '../../types/Task/Task'
import { TaskApprovalDetailsModal } from './TaskApprovalDetailsModal'

type PendingDecision = NonNullable<TaskApprovalRowProps['pendingDecision']>



// Godkend/afvis opgaver som brugere har meldt færdige (Administration-
// fanen). Godkend → anmodning Accepted + opgave Completed. Afvis →
// anmodning Rejected, opgaven forbliver InProgress. Hver knap gates
// uafhængigt af sit eget privilegie (approve_task/reject_task); selve
// adgangen håndhæves server-side i RPC'erne.
export function TaskApprovalsPanel() {
    const { t } = useTranslation(['roles', 'common', 'errors'])
    const { hasPrivilege: canApprove } = useHasPrivilege(APPROVE_TASK_PRIVILEGE)
    const { hasPrivilege: canReject } = useHasPrivilege(REJECT_TASK_PRIVILEGE)

    const { data: requests, isLoading, error: queryError } = useGetPendingTaskRequestsQuery()
    const [approve, { isLoading: approving, error: approveError }] = useApproveTaskRequestMutation()
    const [reject, { isLoading: rejecting, error: rejectError }] = useRejectTaskRequestMutation()
    const submitting = approving || rejecting

    const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null)
    const [detailsRequestId, setDetailsRequestId] = useState<string | null>(null)
    // Afledt af listen, så modalen lukker af sig selv når anmodningen er behandlet.
    const detailsRequest = requests?.find((r) => r.id === detailsRequestId) ?? null

    async function confirmDecision(decision: PendingDecision) {
        const request = requests?.find((r) => r.id === decision.requestId)
        if (!request) {
            setPendingDecision(null)
            return
        }

        const input = { requestId: request.id, taskId: request.taskId }
        try {
            if (decision.decision === 'approve') await approve(input).unwrap()
            else await reject(input).unwrap()
            setDetailsRequestId(null)
        } catch {
            // Fejlen vises via mutationens error-state.
        }
        setPendingDecision(null)
    }

    const listError = readableError(queryError)
    const actionError = readableError(approveError) ?? readableError(rejectError)

    return (
        <div>
            {(listError || actionError) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                    {listError ?? actionError}
                </div>
            )}

            {isLoading ? (
                <p className="text-secondary dark:text-slate-400">{t('roles:approvals.loading')}</p>
            ) : !requests || requests.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('roles:approvals.empty')}</p>
            ) : (
                <ul className="divide-y divide-border-gray border-t border-border-gray dark:divide-slate-700 dark:border-slate-700">
                    {requests.map((request) => (
                        <li key={request.id} className="py-4">
                            <TaskApprovalRow
                                request={request}
                                canApprove={canApprove}
                                canReject={canReject}
                                pendingDecision={pendingDecision}
                                submitting={submitting}
                                onSelect={setPendingDecision}
                                onCancel={() => setPendingDecision(null)}
                                onConfirm={confirmDecision}
                                onOpenDetails={() => setDetailsRequestId(request.id)}
                            />
                        </li>
                    ))}
                </ul>
            )}

            {detailsRequest && (
                <TaskApprovalDetailsModal
                    request={detailsRequest}
                    canApprove={canApprove}
                    canReject={canReject}
                    pendingDecision={pendingDecision}
                    submitting={submitting}
                    errorMessage={actionError}
                    onSelect={setPendingDecision}
                    onCancel={() => setPendingDecision(null)}
                    onConfirm={confirmDecision}
                    onClose={() => {
                        setDetailsRequestId(null)
                        setPendingDecision(null)
                    }}
                />
            )}
        </div>
    )
}

function TaskApprovalRow({
    request,
    canApprove,
    canReject,
    pendingDecision,
    submitting,
    onSelect,
    onCancel,
    onConfirm,
    onOpenDetails,
}: TaskApprovalRowProps) {
    const { t } = useTranslation(['roles', 'common', 'errors'])
    const decision = pendingDecision?.requestId === request.id ? pendingDecision : null

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <button
                type="button"
                onClick={onOpenDetails}
                title={t('roles:approvals.details.open')}
                className="group text-left"
            >
                <p className="font-medium group-hover:text-accent group-hover:underline">{request.taskTitle}</p>
                <p className="text-sm text-secondary dark:text-slate-400">{t('roles:approvals.reportedDoneBy', { name: request.requesterName })}</p>
                <p className="text-xs text-secondary mt-1 dark:text-slate-400">{formatDateTime(request.requestedAt)}</p>
                <p className="text-xs font-semibold text-accent mt-1">{t('roles:approvals.details.open')}</p>
            </button>

            {decision ? (
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-secondary max-w-xs dark:text-slate-400">
                        {decision.decision === 'approve'
                            ? t('roles:approvals.confirmApprove')
                            : t('roles:approvals.confirmReject')}
                    </p>
                    <button
                        type="button"
                        onClick={() => onConfirm(decision)}
                        disabled={submitting}
                        className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                        {submitting ? t('common:processing') : t('common:yes')}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="rounded-md border border-border-gray bg-bg-gray px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray/70 transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                    >
                        {t('common:cancel')}
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    {canApprove && (
                        <button
                            type="button"
                            onClick={() => onSelect({ requestId: request.id, decision: 'approve' })}
                            disabled={submitting}
                            className="flex items-center gap-2 bg-accent text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                        >
                            <Check className="w-4 h-4" />
                            {t('roles:approvals.approve')}
                        </button>
                    )}
                    {canReject && (
                        <button
                            type="button"
                            onClick={() => onSelect({ requestId: request.id, decision: 'reject' })}
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-md border border-border-gray bg-bg-gray px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray/70 transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                        >
                            <X className="w-4 h-4" />
                            {t('roles:approvals.reject')}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
