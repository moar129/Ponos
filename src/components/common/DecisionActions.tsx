// src/components/common/DecisionActions.tsx
import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DecisionActionsProps } from '../../types/common/confirmType'

const PRIMARY =
  'flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-60'
const SECONDARY =
  'flex items-center gap-2 rounded-md border border-border-gray bg-bg-gray px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-bg-gray/70 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'

// Godkend/afvis-knapperne med et bekræft-trin. Delt af medlemsanmodninger,
// egne invitationer og opgave-godkendelser (liste + detalje-modal).
export function DecisionActions({
  pending,
  onSelect,
  onConfirm,
  onCancel,
  submitting,
  acceptLabel,
  rejectLabel,
  confirmText,
  canAccept = true,
  canReject = true,
  confirmDisabled = false,
  children,
  extraActions,
  className = '',
}: DecisionActionsProps) {
  const { t } = useTranslation('common')

  if (pending) {
    return (
      <div className={`flex flex-wrap items-center gap-3 ${className}`}>
        <p className="max-w-xs text-sm text-secondary dark:text-slate-400">{confirmText}</p>
        {children}
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={onConfirm} disabled={submitting || confirmDisabled} className={PRIMARY}>
            {submitting ? t('processing') : t('yes')}
          </button>
          <button type="button" onClick={onCancel} disabled={submitting} className={SECONDARY}>
            {t('cancel')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {canAccept && (
        <button type="button" onClick={() => onSelect('accept')} disabled={submitting} className={PRIMARY}>
          <Check className="h-4 w-4" />
          {acceptLabel}
        </button>
      )}
      {canReject && (
        <button type="button" onClick={() => onSelect('reject')} disabled={submitting} className={SECONDARY}>
          <X className="h-4 w-4" />
          {rejectLabel}
        </button>
      )}
      {extraActions}
    </div>
  )
}
