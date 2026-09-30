import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  // Key in the nav namespace.
  labelKey: 'links.home' | 'links.login' | 'links.dashboard' | 'links.tasks' | 'links.statistics' | 'links.datalayer' | 'links.news' | 'links.messages'
  icon: LucideIcon
}
