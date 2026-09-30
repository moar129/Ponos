// src/components/common/Alert.tsx
import type { AlertProps, AlertTone } from '../../types/common/feedbackType'

// Fejl-/succes-/info-boksen. Lå før som ~70 kopier i 4 varianter (bl.a.
// login-sidernes lav-kontrast røde) - nu én, med samme farver overalt.
const TONE: Record<AlertTone, string> = {
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400',
  success: 'border-green-200 bg-green-50 text-green-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  info: 'border-accent/30 bg-accent/10 text-primary dark:text-slate-100',
}

export function Alert({ children, tone = 'error', className = '' }: AlertProps) {
  if (!children) return null

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-md border px-3 py-2 text-sm ${TONE[tone]} ${className}`}
    >
      {children}
    </div>
  )
}
