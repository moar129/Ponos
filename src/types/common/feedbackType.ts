import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type AlertTone = 'error' | 'success' | 'info'

export interface AlertProps {
  // Nothing is rendered without content, so `<Alert>{error}</Alert>` is enough.
  children?: ReactNode
  tone?: AlertTone
  className?: string
}

export interface SpinnerProps {
  className?: string
  // Centered in a padded block (list/panel loading) instead of inline.
  block?: boolean
}

export interface EmptyStateProps {
  icon: LucideIcon
  title: ReactNode
  hint?: ReactNode
  action?: ReactNode
  className?: string
}
