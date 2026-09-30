// src/components/common/InlineConfirm.tsx
import { useTranslation } from 'react-i18next'
import type { InlineConfirmProps } from '../../types/common/confirmType'

// "Er du sikker? Ja / Fortryd" direkte i en listerække, i stedet for en
// dialog. Bruges ved fx annuller invitation og fjern medlem.
export function InlineConfirm({
  question,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading = false,
  loadingLabel,
  cancelLabel,
}: InlineConfirmProps) {
  const { t } = useTranslation('common')

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-secondary dark:text-slate-400">{question}</span>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isLoading}
        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
      >
        {isLoading && loadingLabel ? loadingLabel : confirmLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        className="text-sm text-secondary hover:underline disabled:opacity-60 dark:text-slate-400"
      >
        {cancelLabel ?? t('cancel')}
      </button>
    </div>
  )
}
