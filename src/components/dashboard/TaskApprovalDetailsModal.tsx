// src/components/dashboard/TaskApprovalDetailsModal.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import { useGetTaskRequestDetailsQuery } from '../../store/apis/taskApi'
import { formatDateTime, formatShortDateRange } from '../../utils/formatDate'
import { formatStatusGroups, materialLocationLabels } from '../../utils/taskMaterials'
import { useDisplayName } from '../../store/hooks/useDisplayName'
import type { TaskApprovalDetailsModalProps } from '../../types/Task/Task'
import { PriorityBadge } from '../Task/PriorityBadge'
import { Alert } from '../common/Alert'
import { Modal } from '../common/Modal'
import { TaskApprovalActions } from './TaskApprovalActions'

// Detaljer for en færdigmelding, så godkenderen ved hvad der godkendes/
// afvises: opgave, tilmeldte og materialer - inkl. den tildeltes
// foreslåede udfald (task_requests.material_outcomes), som FØRST anvendes
// ved godkendelse. Godkend/Afvis følger samme bekræft-trin som rækken i
// TaskApprovalsPanel, og hver knap gates uafhængigt af sit eget privilegie.
export function TaskApprovalDetailsModal({ request, errorMessage, onClose, ...actions }: TaskApprovalDetailsModalProps) {
    const { t } = useTranslation(['roles', 'tasks', 'datalayer', 'common'])
    const td = asDynamic(t)
    const displayName = useDisplayName()
    const { data: details, isLoading, error } = useGetTaskRequestDetailsQuery(request.id)
    const loadError = readableError(error)


    const labelClass = 'mb-2 block text-xs font-bold uppercase text-secondary dark:text-slate-400'

    return (
        <Modal
            onClose={onClose}
            size="2xl"
            title={request.taskTitle}
            subtitle={<>{t('roles:approvals.reportedDoneBy', { name: displayName(request.requesterName) })} · {formatDateTime(request.requestedAt)}</>}
            footer={
                <TaskApprovalActions
                    {...actions}
                    className="w-full justify-end"
                    extraActions={
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg bg-bg-gray px-5 py-2 text-sm font-semibold text-primary hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                        >
                            {t('common:close')}
                        </button>
                    }
                />
            }
        >
                    {isLoading ? (
                        <p className="text-secondary dark:text-slate-400">{t('roles:approvals.details.loading')}</p>
                    ) : loadError || !details ? (
                        <Alert>{loadError ?? t('roles:approvals.details.loadFailed')}</Alert>
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
                                                        name: displayName(rejection.rejectedByName),
                                                        date: rejection.rejectedAt ? formatDateTime(rejection.rejectedAt) : '—',
                                                    })}{' '}
                                                    — {t('roles:approvals.details.reportedBy', { name: displayName(rejection.requesterName) })}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* BADGES */}
                            <div className="mb-5 flex flex-wrap gap-2">
                                {details.task.priority && <PriorityBadge priority={details.task.priority} size="md" />}
                                <span className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary dark:bg-slate-700 dark:text-slate-400">
                                    {t('roles:approvals.details.room')}: {details.roomName ?? t('roles:approvals.details.noRoom')}
                                </span>
                                <span className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary dark:bg-slate-700 dark:text-slate-400">
                                    {t('roles:approvals.details.period')}:{' '}
                                    {formatShortDateRange(details.task.start_date, details.task.end_date)}
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
                                        ? details.assignees.map(displayName).join(', ')
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
                                            const locations = materialLocationLabels(material, t('roles:approvals.details.noLocation'))

                                            return (
                                                <div key={material.id} className="rounded-lg border border-border-gray px-4 py-3 text-xs text-secondary dark:border-slate-700 dark:text-slate-400">
                                                    <p className="text-sm font-medium text-primary dark:text-slate-100">{material.itemName}</p>
                                                    <p>{t('roles:approvals.details.reserved')}: {material.quantity} {material.unitOfMeasurement}</p>
                                                    {resolved ? (
                                                        <p>{t('roles:approvals.details.alreadyResolved')}</p>
                                                    ) : (
                                                        <>
                                                            <p>{t('roles:approvals.details.currentStatus')}: {formatStatusGroups(material.linkedGroups, material.unitOfMeasurement, td)}</p>
                                                            {locations.length > 0 && (
                                                                <p>{t('roles:approvals.details.location')}: {locations.join(', ')}</p>
                                                            )}
                                                            {material.proposedOutcomes ? (
                                                                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                                    {t('roles:approvals.details.proposedOutcome')}: {formatStatusGroups(material.proposedOutcomes, material.unitOfMeasurement, td)}
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

            <Alert className="mt-5">{errorMessage}</Alert>
        </Modal>
    )
}
