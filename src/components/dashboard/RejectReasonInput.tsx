// src/components/dashboard/RejectReasonInput.tsx
import { useTranslation } from 'react-i18next'
import type { RejectReasonInputProps } from '../../types/Task/Task'

export const REJECT_REASON_MAX_LENGTH = 500

// Påkrævet begrundelse ved afvisning af en færdigmelding - delt mellem
// rækken i TaskApprovalsPanel og TaskApprovalDetailsModal. Længden
// håndhæves også i reject_task_request.
export function RejectReasonInput({ value, onChange, disabled }: RejectReasonInputProps) {
    const { t } = useTranslation('roles')

    return (
        <label className="block w-full">
            <span className="mb-1 block text-xs font-bold uppercase text-secondary dark:text-slate-400">
                {t('approvals.rejectReasonLabel')}
            </span>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                maxLength={REJECT_REASON_MAX_LENGTH}
                rows={3}
                autoFocus
                placeholder={t('approvals.rejectReasonPlaceholder')}
                className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <span className="block text-right text-xs text-secondary dark:text-slate-400">
                {value.length}/{REJECT_REASON_MAX_LENGTH}
            </span>
        </label>
    )
}
