// src/components/common/EmptyState.tsx
import type { EmptyStateProps } from '../../types/common/feedbackType'

// Stort ikon + tekst når en liste er tom ("Ingen beskeder endnu").
export function EmptyState({ icon: Icon, title, hint, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-10 text-center ${className}`}>
      <Icon className="mb-3 h-10 w-10 text-secondary/40 dark:text-slate-600" aria-hidden="true" />
      <p className="text-sm font-medium text-secondary dark:text-slate-400">{title}</p>
      {hint && <p className="mt-1 text-xs text-secondary dark:text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
