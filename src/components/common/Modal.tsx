// src/components/common/Modal.tsx
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ModalFooterProps, ModalProps, ModalSize } from '../../types/common/modalType'

// Den ene modal-ramme i appen (backdrop, panel, header med luk-knap,
// Escape, aria-modal). Før byggede ~28 dialoger den selv, med z-index fra
// 50 til 110, backdrop fra /30 til /60 - og kun én lukkede på Escape.

const SIZE: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
}

const ICON_TONE = {
  accent: 'rounded-lg bg-accent/10 text-accent',
  danger: 'rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

// Åbne modaler, inderste sidst - kun den øverste reagerer på Escape, så en
// bekræftelse oven på en detalje-modal ikke lukker begge.
const openStack: symbol[] = []

export function Modal({
  onClose,
  children,
  isOpen = true,
  title,
  subtitle,
  icon: Icon,
  tone = 'accent',
  headerActions,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  disableClose = false,
  padded = true,
  onSubmit,
}: ModalProps) {
  const { t } = useTranslation('common')
  const titleId = useId()
  const closeRef = useRef({ onClose, disableClose })
  useEffect(() => {
    closeRef.current = { onClose, disableClose }
  })

  useEffect(() => {
    if (!isOpen) return
    const key = Symbol('modal')
    openStack.push(key)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || openStack[openStack.length - 1] !== key) return
      if (!closeRef.current.disableClose) closeRef.current.onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openStack.splice(openStack.indexOf(key), 1)
    }
  }, [isOpen])

  if (!isOpen) return null

  const panelProps = {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': title ? titleId : undefined,
    className: `flex max-h-full w-full ${SIZE[size]} flex-col overflow-hidden rounded-xl border border-border-gray bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800`,
  } as const

  const content = (
    <>
      {title && (
        <div className="flex items-start gap-3 border-b border-border-gray p-4 dark:border-slate-700">
          {Icon && (
            <div className={`shrink-0 p-2 ${ICON_TONE[tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-primary dark:text-slate-100">
              {title}
            </h2>
            {subtitle && <div className="mt-0.5 text-sm text-secondary dark:text-slate-400">{subtitle}</div>}
          </div>
          {headerActions}
          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            aria-label={t('closeDialog')}
            className="shrink-0 rounded-lg p-1 text-secondary transition-colors hover:bg-bg-gray hover:text-primary disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto ${padded ? 'p-4' : ''}`}>{children}</div>

      {footer && <ModalFooter>{footer}</ModalFooter>}
    </>
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      // mousedown, not click: selecting text in an input and releasing
      // over the backdrop must not close the modal.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closeOnBackdrop && !disableClose) onClose()
      }}
    >
      {onSubmit ? <form {...panelProps} onSubmit={onSubmit}>{content}</form> : <div {...panelProps}>{content}</div>}
    </div>,
    document.body,
  )
}

// Knap-rækken nederst. Eksporteret, så en modal der pakker sit indhold i en
// <form> kan lægge knapperne inde i formularen med samme udseende.
export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`flex flex-wrap items-center justify-end gap-3 border-t border-border-gray p-4 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  )
}
