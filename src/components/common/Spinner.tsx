// src/components/common/Spinner.tsx
import { Loader2 } from 'lucide-react'
import type { SpinnerProps } from '../../types/common/feedbackType'

export function Spinner({ className = '', block = false }: SpinnerProps) {
  const icon = <Loader2 className={`h-6 w-6 animate-spin text-accent ${className}`} aria-hidden="true" />
  if (!block) return icon

  return (
    <div className="flex items-center justify-center py-8" role="status">
      {icon}
    </div>
  )
}
