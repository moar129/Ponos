import type { ReactNode } from 'react'

export interface ConfirmDialogProps {
  onConfirm: () => void
  onCancel: () => void
  title: ReactNode
  message?: ReactNode
  // Extra content under the message, e.g. the list of what gets deleted.
  children?: ReactNode
  isOpen?: boolean
  // Default: common:delete.
  confirmLabel?: string
  // 'danger' (default) = red confirm button + warning icon.
  tone?: 'danger' | 'default'
  isLoading?: boolean
  // Shown inside the dialog, so it stays visible next to the buttons.
  error?: string | null
  confirmDisabled?: boolean
}

// "Er du sikker? [Ja] [Fortryd]" in place of a button, e.g. in a list row.
export interface InlineConfirmProps {
  question: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  loadingLabel?: string
  // Default: common:cancel.
  cancelLabel?: string
}

export type Decision = 'accept' | 'reject'

// Accept/reject buttons that turn into a confirm step once one is chosen.
export interface DecisionActionsProps {
  // null = show the two buttons; otherwise the confirm step for that choice.
  pending: Decision | null
  onSelect: (decision: Decision) => void
  onConfirm: () => void
  onCancel: () => void
  submitting: boolean
  acceptLabel: string
  rejectLabel: string
  // The confirm question for the pending decision.
  confirmText: ReactNode
  canAccept?: boolean
  canReject?: boolean
  confirmDisabled?: boolean
  // Shown in the confirm step, e.g. a required rejection reason.
  children?: ReactNode
  // Extra buttons next to accept/reject (e.g. "Luk" in a modal footer).
  extraActions?: ReactNode
  className?: string
}
