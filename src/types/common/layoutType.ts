import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface SideNavTab<K extends string> {
  key: K
  label: string
  icon: LucideIcon
}

export interface SideNavLayoutProps<K extends string> {
  tabs: SideNavTab<K>[]
  active: K
  onSelect: (key: K) => void
  children: ReactNode
}

export interface DetailListProps {
  children: ReactNode
}

export interface DetailRowProps {
  label: ReactNode
  children: ReactNode
  // For values that are controls or multi-line (e.g. buttons, color swatches).
  className?: string
}
