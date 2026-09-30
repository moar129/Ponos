// src/components/dashboard/TaskApprovalActions.tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DecisionActions } from '../common/DecisionActions'
import { RejectReasonInput } from './RejectReasonInput'
import type { TaskApprovalActionsProps } from '../../types/Task/Task'

// Godkend/afvis en færdigmelding. En afvisning kræver en begrundelse
// (håndhæves også i reject_task_request-RPC'en).
export function TaskApprovalActions({
    canApprove,
    canReject,
    pending,
    submitting,
    onSelect,
    onCancel,
    onConfirm,
    rejectReason,
    onRejectReasonChange,
    extraActions,
    className,
}: TaskApprovalActionsProps & { extraActions?: ReactNode; className?: string }) {
    const { t } = useTranslation('roles')

    return (
        <DecisionActions
            pending={pending}
            onSelect={onSelect}
            onConfirm={onConfirm}
            onCancel={onCancel}
            submitting={submitting}
            canAccept={canApprove}
            canReject={canReject}
            acceptLabel={t('approvals.approve')}
            rejectLabel={t('approvals.reject')}
            confirmText={pending === 'accept' ? t('approvals.confirmApprove') : t('approvals.confirmReject')}
            confirmDisabled={pending === 'reject' && rejectReason.trim() === ''}
            extraActions={extraActions}
            className={className}
        >
            {pending === 'reject' && (
                <RejectReasonInput value={rejectReason} onChange={onRejectReasonChange} disabled={submitting} />
            )}
        </DecisionActions>
    )
}
