// src/components/dashboard/TaskApprovalDetailsModal.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { asDynamic } from '../../i18n/config'
import { useGetTaskRequestDetailsQuery } from '../../store/apis/taskApi'
import { formatDateTime } from '../../utils/formatDate'
import { PRIORITY_COLORS, formatDate } from '../../utils/taskDisplay'
import type { TaskApprovalDetailsModalProps, TaskMaterialStatusGroup } from '../../types/Task/Task'
import { RejectReasonInput } from './RejectReasonInput'

// Detaljer for en færdigmelding, så godkenderen ved hvad der godkendes/
// afvises: opgave, tilmeldte og materialer - inkl. den tildeltes
// foreslåede udfald (task_requests.material_outcomes), som FØRST anvendes
// ved godkendelse. Godkend/Afvis følger samme bekræft-trin som rækken i
// TaskApprovalsPanel, og hver knap gates uafhængigt af sit eget privilegie.
export function TaskApprovalDetailsModal({
    request,
    canApprove,
    canReject,
    pendingDecision,
    submitting,
    errorMessage,
    onSelect,
    onCancel,
    onConfirm,
    rejectReason,
    onRejectReasonChange,
    onClose,
}: TaskApprovalDetailsModalProps) {
    const { t } = useTranslation(['roles', 'tasks', 'datalayer', 'common'])
    const td = asDynamic(t)
    const { data: details, isLoading, error } = useGetTaskRequestDetailsQuery(request.id)
    const decision = pendingDecision?.requestId === request.id ? pendingDecision : null
    const missingReason = decision?.decision === 'reject' && rejectReason.trim() === ''
    const loadError = readableError(error)

    const formatGroups = (groups: TaskMaterialStatusGroup[], unit: string) =>
        groups.map((g) => `${g.quantity} ${unit} ${td(`datalayer:status.${g.status}`)}`.replace(/\s+/g, ' ')).join(', ')

    const labelClass = 'mb-2 block text-xs font-bold uppercase text-secondary dark:text-slate-400'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border-gray bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="overflow-y-auto p-6">
                    {/* HEADER */}
                    <div className="mb-6 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-primary dark:text-slate-100">{request.taskTitle}</h2>
                            <p className="mt-1 text-sm text-secondary dark:text-slate-400">
                                {t('roles:approvals.reportedDoneBy', { name: request.requesterName })} · {formatDateTime(request.requestedAt)}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t('common:close')}
                            className="text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {isLoading ? (
                        <p className="text-secondary dark:text-slate-400">{t('roles:approvals.details.loading')}</p>
                    ) : loadError || !details ? (
                        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                            {loadError ?? t('roles:approvals.details.loadFailed')}
                        </div>
                    ) : (
                        <>
                            {/* TIDLIGERE AFVISNINGER */}
                            {details.previousRejections.length > 0 && (
                                <div className="mb-5">
                                    <span className={labelClass}>
                                        {t('roles:approvals.details.previousRejections', { count: details.previousRejections.length })}
                                    </span>
                                    <div className="space-y-2">
                                        {details.previousRejections.map((rejection, index) => (
                                            <div
                                                key={`${rejection.requestedAt}-${index}`}
                                                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                                            >
                                                <p className="break-words">{rejection.reason ?? t('roles:approvals.details.noReason')}</p>
                                                <p className="mt-1 text-xs opacity-80">
                                                    {t('roles:approvals.details.rejectedBy', {
                                                        name: rejection.rejectedByName,
                                                        date: rejection.rejectedAt ? formatDateTime(rejection.rejectedAt) : '—',
                                                    })}{' '}
                                                    — {t('roles:approvals.details.reportedBy', { name: rejection.requesterName })}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* BADGES */}
                            <div className="mb-5 flex flex-wrap gap-2">
                                {details.task.priority && (
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_COLORS[details.task.priority]}`}>
                                        {t(`tasks:priority.${details.task.priority}`)}
                                    </span>
                                )}
                                <span className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary dark:bg-slate-700 dark:text-slate-400">
                                    {t('roles:approvals.details.room')}: {details.roomName ?? t('roles:approvals.details.noRoom')}
                                </span>
                                <span className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary dark:bg-slate-700 dark:text-slate-400">
                                    {t('roles:approvals.details.period')}:{' '}
                                    {details.task.start_date ? formatDate(details.task.start_date) : '—'} – {details.task.end_date ? formatDate(details.task.end_date) : '—'}
                                </span>
                            </div>

                            {/* BESKRIVELSE */}
                            <div className="mb-5 rounded-lg border border-border-gray bg-bg-gray/40 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                                <span className={labelClass}>{t('common:description')}</span>
                                <p className="break-words text-sm text-secondary dark:text-slate-400">
                                    {details.task.description || t('roles:approvals.details.noDescription')}
                                </p>
                            </div>

                            {/* TILMELDTE */}
                            <div className="mb-5">
                                <span className={labelClass}>{t('roles:approvals.details.assignees')}</span>
                                <p className="text-sm text-secondary dark:text-slate-400">
                                    {details.assignees.length > 0
                                        ? details.assignees.map((name) => name || t('tasks:assignees.unknownUser')).join(', ')
                                        : t('roles:approvals.details.noAssignees')}
                                </p>
                            </div>

                            {/* MATERIALER */}
                            <div>
                                <span className={labelClass}>{t('roles:approvals.details.materials')}</span>
                                {details.materials.length === 0 ? (
                                    <p className="text-sm text-secondary dark:text-slate-400">{t('roles:approvals.details.noMaterials')}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {details.materials.map((material) => {
                                            const resolved = material.linkedGroups.length === 0
                                            const locations = [
                                                ...material.locationLabels,
                                                ...(material.hasUnitsWithoutLocation ? [t('roles:approvals.details.noLocation')] : []),
                                            ]

                                            return (
                                                <div key={material.id} className="rounded-lg border border-border-gray px-4 py-3 text-xs text-secondary dark:border-slate-700 dark:text-slate-400">
                                                    <p className="text-sm font-medium text-primary dark:text-slate-100">{material.itemName}</p>
                                                    <p>{t('roles:approvals.details.reserved')}: {material.quantity} {material.unitOfMeasurement}</p>
                                                    {resolved ? (
                                                        <p>{t('roles:approvals.details.alreadyResolved')}</p>
                                                    ) : (
                                                        <>
                                                            <p>{t('roles:approvals.details.currentStatus')}: {formatGroups(material.linkedGroups, material.unitOfMeasurement)}</p>
                                                            {locations.length > 0 && (
                                                                <p>{t('roles:approvals.details.location')}: {locations.join(', ')}</p>
                                                            )}
                                                            {material.proposedOutcomes ? (
                                                                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                                    {t('roles:approvals.details.proposedOutcome')}: {formatGroups(material.proposedOutcomes, material.unitOfMeasurement)}
                                                                </p>
                                                            ) : (
                                                                <p className="mt-2 rounded-md bg-red-50 px-2 py-1 font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                                    {t('roles:approvals.details.missingOutcome')}
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {errorMessage && (
                        <div className="mt-5 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                            {errorMessage}
                        </div>
                    )}
                </div>

                {/* HANDLINGER */}
                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border-gray p-4 dark:border-slate-700">
                    {decision ? (
                        <>
                            {decision.decision === 'reject' && (
                                <RejectReasonInput value={rejectReason} onChange={onRejectReasonChange} disabled={submitting} />
                            )}
                            <p className="text-sm text-secondary mr-auto dark:text-slate-400">
                                {decision.decision === 'approve' ? t('roles:approvals.confirmApprove') : t('roles:approvals.confirmReject')}
                            </p>
                            <button
                                type="button"
                                onClick={() => onConfirm(decision)}
                                disabled={submitting || missingReason}
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
                        </>
                    ) : (
                        <>
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
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg bg-bg-gray px-5 py-2 text-sm font-semibold text-primary hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                            >
                                {t('common:close')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
