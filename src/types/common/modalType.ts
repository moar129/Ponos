import type { LucideIcon } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

export interface ModalProps {
  onClose: () => void
  children: ReactNode
  // Default true, so a modal can also just be rendered conditionally.
  isOpen?: boolean
  // Without a title the modal has no header - the content brings its own.
  title?: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  // 'danger' = red warning badge (delete confirmations).
  tone?: 'accent' | 'danger'
  // Extra icon buttons in the header, left of the close button.
  headerActions?: ReactNode
  footer?: ReactNode
  size?: ModalSize
  // Forms with unsaved input set this to false, so a stray click on the
  // backdrop does not throw the input away. Escape still closes.
  closeOnBackdrop?: boolean
  // While saving/deleting: no close via backdrop, Escape or the X.
  disableClose?: boolean
  // Default true. False for content that sets its own padding (e.g. lists
  // running edge to edge).
  padded?: boolean
  // Makes the panel a <form>, so buttons in the footer can submit it.
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}

export interface ModalFooterProps {
  children: ReactNode
  className?: string
}
