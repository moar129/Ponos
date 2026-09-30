// src/components/common/ConfirmDialog.tsx
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Modal } from './Modal'
import { Alert } from './Alert'
import type { ConfirmDialogProps } from '../../types/common/confirmType'

// "Er du sikker?"-dialogen. Afløser en datalager-specifik udgave (som
// også blev lånt af beskeder og statistik) og 6 håndbyggede kopier.
export function ConfirmDialog({
  onConfirm,
  onCancel,
  title,
  message,
  children,
  isOpen = true,
  confirmLabel,
  tone = 'danger',
  isLoading = false,
  error,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common')
  const confirmClass =
    tone === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-accent text-accent-text hover:bg-accent-hover'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      subtitle={message}
      icon={tone === 'danger' ? AlertTriangle : undefined}
      tone="danger"
      size="sm"
      disableClose={isLoading}
      padded={Boolean(children || error)}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-sm text-secondary hover:bg-bg-gray disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${confirmClass}`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel ?? t('delete')}
          </button>
        </>
      }
    >
      {children}
      <Alert className={children ? 'mt-3' : ''}>{error}</Alert>
    </Modal>
  )
}
