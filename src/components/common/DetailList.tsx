// src/components/common/DetailList.tsx
import type { DetailListProps, DetailRowProps } from '../../types/common/layoutType'

// "Etiket ....... værdi"-listen på profil-, organisations- og
// farvevisningerne.
export function DetailList({ children }: DetailListProps) {
  return (
    <dl className="divide-y divide-border-gray border-t border-border-gray dark:divide-slate-700 dark:border-slate-700">
      {children}
    </dl>
  )
}

export function DetailRow({ label, children, className = '' }: DetailRowProps) {
  return (
    <div className="py-3 flex flex-wrap items-center justify-between gap-4">
      <dt className="text-sm text-secondary dark:text-slate-400">{label}</dt>
      <dd className={`text-sm text-right min-w-0 break-words ${className}`}>{children}</dd>
    </div>
  )
}
