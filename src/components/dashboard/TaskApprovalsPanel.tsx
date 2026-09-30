// src/components/dashboard/TaskApprovalsPanel.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
    useApproveTaskRequestMutation,
    useGetPendingTaskRequestsQuery,
    useRejectTaskRequestMutation,
} from '../../store/apis/taskApi'
import { formatDateTime, formatNumericDate } from '../../utils/formatDate'
import { PriorityBadge } from '../Task/PriorityBadge'
import { Alert } from '../common/Alert'
import { TaskApprovalActions } from './TaskApprovalActions'
import { useDisplayName } from '../../store/hooks/useDisplayName'
import type { Decision } from '../../types/common/confirmType'
import { compareApprovalRequests } from '../../utils/taskFilters'
import {
    APPROVE_TASK_PRIVILEGE,
    REJECT_TASK_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import type { ApprovalSortOption, TaskApprovalRowProps } from '../../types/Task/Task'
import { TaskApprovalDetailsModal } from './TaskApprovalDetailsModal'

type PendingDecision = { requestId: string; decision: Decision }

// Rum-filter: alle, kun opgaver uden rum, eller et bestemt rum-id.
const ALL_ROOMS = 'all'
const NO_ROOM = 'none'

const inputClass =
    'rounded-md border border-border-gray bg-white px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'


// Godkend/afvis opgaver som brugere har meldt færdige (Administration-
// fanen). Godkend → anmodning Accepted + opgave Completed. Afvis →
// anmodning Rejected, opgaven forbliver InProgress. Hver knap gates
// uafhængigt af sit eget privilegie (approve_task/reject_task); selve
// adgangen håndhæves server-side i RPC'erne.
export function TaskApprovalsPanel() {
    const { t } = useTranslation(['roles', 'common', 'errors'])
    const displayName = useDisplayName()
    const { hasPrivilege: canApprove } = useHasPrivilege(APPROVE_TASK_PRIVILEGE)
    const { hasPrivilege: canReject } = useHasPrivilege(REJECT_TASK_PRIVILEGE)

    const { data: requests, isLoading, error: queryError } = useGetPendingTaskRequestsQuery()
    const [approve, { isLoading: approving, error: approveError }] = useApproveTaskRequestMutation()
    const [reject, { isLoading: rejecting, error: rejectError }] = useRejectTaskRequestMutation()
    const submitting = approving || rejecting

    const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [detailsRequestId, setDetailsRequestId] = useState<string | null>(null)
    // Afledt af listen, så modalen lukker af sig selv når anmodningen er behandlet.
    const detailsRequest = requests?.find((r) => r.id === detailsRequestId) ?? null

    const [searchTerm, setSearchTerm] = useState('')
    const [roomFilter, setRoomFilter] = useState(ALL_ROOMS)
    const [sortBy, setSortBy] = useState<ApprovalSortOption>('oldest')

    // Rum-valg bygges af listen selv - godkenderen behøver ikke read_tasks.
    const rooms = [
        ...new Map(
            (requests ?? []).flatMap((r) => (r.roomId ? [[r.roomId, r.roomName ?? ''] as const] : [])),
        ),
    ].sort((a, b) => a[1].localeCompare(b[1]))
    const hasRequestsWithoutRoom = (requests ?? []).some((r) => r.roomId === null)

    const search = searchTerm.trim().toLowerCase()
    const visibleRequests = (requests ?? [])
        .filter((r) => {
            const matchesSearch =
                search === '' ||
                r.taskTitle.toLowerCase().includes(search) ||
                displayName(r.requesterName).toLowerCase().includes(search)
            const matchesRoom =
                roomFilter === ALL_ROOMS ||
                (roomFilter === NO_ROOM ? r.roomId === null : r.roomId === roomFilter)
            return matchesSearch && matchesRoom
        })
        .sort(compareApprovalRequests(sortBy))

    function resetFilters() {
        setSearchTerm('')
        setRoomFilter(ALL_ROOMS)
        setSortBy('oldest')
    }

    // Ny beslutning/annullering starter altid med en tom begrundelse.
    function selectDecision(decision: PendingDecision | null) {
        setPendingDecision(decision)
        setRejectReason('')
    }

    async function confirmDecision() {
        const request = requests?.find((r) => r.id === pendingDecision?.requestId)
        if (!pendingDecision || !request) {
            selectDecision(null)
            return
        }

        const input = { requestId: request.id, taskId: request.taskId }
        try {
            if (pendingDecision.decision === 'accept') await approve(input).unwrap()
            else await reject({ ...input, reason: rejectReason.trim() }).unwrap()
            setDetailsRequestId(null)
            selectDecision(null)
        } catch {
            // Fejlen vises via mutationens error-state. Beslutningen (og en
            // skrevet begrundelse) bevares, så man kan prøve igen.
        }
    }

    const listError = readableError(queryError)
    const actionError = readableError(approveError) ?? readableError(rejectError)

    // Godkend/afvis-props for én anmodning - ens for rækken og modalen.
    const actionsFor = (requestId: string) => ({
        canApprove,
        canReject,
        pending: pendingDecision?.requestId === requestId ? pendingDecision.decision : null,
        submitting,
        onSelect: (decision: Decision) => selectDecision({ requestId, decision }),
        onCancel: () => selectDecision(null),
        onConfirm: confirmDecision,
        rejectReason,
        onRejectReasonChange: setRejectReason,
    })

    return (
        <div>
            <Alert className="mb-4">{listError ?? actionError}</Alert>

            {isLoading ? (
                <p className="text-secondary dark:text-slate-400">{t('roles:approvals.loading')}</p>
            ) : !requests || requests.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('roles:approvals.empty')}</p>
            ) : (
                <>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('roles:approvals.searchPlaceholder')}
                        className={`flex-1 min-w-[200px] ${inputClass}`}
                    />
                    {(rooms.length > 0 || hasRequestsWithoutRoom) && (
                        <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className={inputClass}>
                            <option value={ALL_ROOMS}>{t('roles:approvals.allRooms')}</option>
                            {rooms.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                            {hasRequestsWithoutRoom && (
                                <option value={NO_ROOM}>{t('roles:approvals.details.noRoom')}</option>
                            )}
                        </select>
                    )}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as ApprovalSortOption)}
                        className={inputClass}
                    >
                        <option value="oldest">{t('roles:approvals.sort.oldest')}</option>
                        <option value="newest">{t('roles:approvals.sort.newest')}</option>
                        <option value="priority">{t('roles:approvals.sort.priority')}</option>
                        <option value="deadline">{t('roles:approvals.sort.deadline')}</option>
                        <option value="rejections">{t('roles:approvals.sort.rejections')}</option>
                    </select>
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="rounded-full border border-border-gray px-3 py-1 text-xs font-medium text-secondary hover:bg-bg-gray hover:text-primary dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    >
                        {t('common:reset')}
                    </button>
                </div>

                <p className="mb-4 text-xs text-secondary dark:text-slate-400">
                    {t('roles:approvals.showing', { count: visibleRequests.length, total: requests.length })}
                </p>

                {visibleRequests.length === 0 ? (
                    <p className="text-secondary dark:text-slate-400">{t('roles:approvals.noMatch')}</p>
                ) : (
                <ul className="divide-y divide-border-gray border-t border-border-gray dark:divide-slate-700 dark:border-slate-700">
                    {visibleRequests.map((request) => (
                        <li key={request.id} className="py-4">
                            <TaskApprovalRow
                                request={request}
                                {...actionsFor(request.id)}
                                onOpenDetails={() => setDetailsRequestId(request.id)}
                            />
                        </li>
                    ))}
                </ul>
                )}
                </>
            )}

            {detailsRequest && (
                <TaskApprovalDetailsModal
                    request={detailsRequest}
                    {...actionsFor(detailsRequest.id)}
                    errorMessage={actionError}
                    onClose={() => {
                        setDetailsRequestId(null)
                        selectDecision(null)
                    }}
                />
            )}
        </div>
    )
}

function TaskApprovalRow({ request, onOpenDetails, ...actions }: TaskApprovalRowProps) {
    const { t } = useTranslation(['roles', 'tasks', 'common', 'errors'])
    const displayName = useDisplayName()
    const overdue = request.endDate !== null && new Date(request.endDate) < new Date()

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <button
                type="button"
                onClick={onOpenDetails}
                title={t('roles:approvals.details.open')}
                className="group text-left"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium group-hover:text-accent group-hover:underline">{request.taskTitle}</p>
                    {request.rejectionCount > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {t('roles:approvals.rejectedCount', { count: request.rejectionCount })}
                        </span>
                    )}
                </div>
                {(request.roomName || request.priority || request.endDate) && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {request.roomName && (
                            <span className="rounded-full bg-bg-gray px-2 py-0.5 font-medium text-secondary dark:bg-slate-700 dark:text-slate-300">
                                {request.roomName}
                            </span>
                        )}
                        {request.priority && <PriorityBadge priority={request.priority} />}
                        {request.endDate && (
                            <span className={overdue ? 'font-semibold text-red-700 dark:text-red-400' : 'text-secondary dark:text-slate-400'}>
                                {t(overdue ? 'roles:approvals.deadlineOverdue' : 'roles:approvals.deadline', { date: formatNumericDate(request.endDate) })}
                            </span>
                        )}
                    </div>
                )}
                <p className="text-sm text-secondary dark:text-slate-400">{t('roles:approvals.reportedDoneBy', { name: displayName(request.requesterName) })}</p>
                <p className="text-xs text-secondary mt-1 dark:text-slate-400">{formatDateTime(request.requestedAt)}</p>
                <p className="text-xs font-semibold text-accent mt-1">{t('roles:approvals.details.open')}</p>
            </button>

            <TaskApprovalActions {...actions} className="w-full sm:w-auto sm:max-w-xl" />
        </div>
    )
}
