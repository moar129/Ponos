// src/components/dashboard/TaskApprovalsPanel.tsx
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import {
    useApproveTaskRequestMutation,
    useGetPendingTaskRequestsQuery,
    useRejectTaskRequestMutation,
} from '../../store/apis/taskApi'
import {
    APPROVE_TASK_PRIVILEGE,
    REJECT_TASK_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import type { TaskApprovalRowProps } from '../../types/Task/Task'

type PendingDecision = NonNullable<TaskApprovalRowProps['pendingDecision']>

// Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt.
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

// Godkend/afvis opgaver som brugere har meldt færdige (Administration-
// fanen). Godkend → anmodning Accepted + opgave Completed. Afvis →
// anmodning Rejected, opgaven forbliver InProgress. Hver knap gates
// uafhængigt af sit eget privilegie (approve_task/reject_task); selve
// adgangen håndhæves server-side i RPC'erne.
export function TaskApprovalsPanel() {
    const { hasPrivilege: canApprove } = useHasPrivilege(APPROVE_TASK_PRIVILEGE)
    const { hasPrivilege: canReject } = useHasPrivilege(REJECT_TASK_PRIVILEGE)

    const { data: requests, isLoading, error: queryError } = useGetPendingTaskRequestsQuery()
    const [approve, { isLoading: approving, error: approveError }] = useApproveTaskRequestMutation()
    const [reject, { isLoading: rejecting, error: rejectError }] = useRejectTaskRequestMutation()
    const submitting = approving || rejecting

    const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null)

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
                <p className="text-secondary dark:text-slate-400">Indlæser opgavegodkendelser...</p>
            ) : !requests || requests.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">Der er ingen opgaver, der afventer godkendelse.</p>
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
                            />
                        </li>
                    ))}
                </ul>
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
}: TaskApprovalRowProps) {
    const decision = pendingDecision?.requestId === request.id ? pendingDecision : null

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <p className="font-medium">{request.taskTitle}</p>
                <p className="text-sm text-secondary dark:text-slate-400">Meldt færdig af {request.requesterName}</p>
                <p className="text-xs text-secondary mt-1 dark:text-slate-400">{formatDate(request.requestedAt)}</p>
            </div>

            {decision ? (
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-secondary max-w-xs dark:text-slate-400">
                        {decision.decision === 'approve'
                            ? 'Godkend og markér opgaven som afsluttet?'
                            : 'Afvis anmodningen? Opgaven forbliver i gang.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => onConfirm(decision)}
                        disabled={submitting}
                        className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                        {submitting ? 'Behandler...' : 'Ja'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="rounded-md border border-border-gray bg-bg-gray px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray/70 transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                    >
                        Annuller
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
                            Godkend
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
                            Afvis
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
