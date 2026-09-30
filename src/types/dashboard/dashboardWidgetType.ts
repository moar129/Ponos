import type { ReactNode } from 'react'

export interface DashboardWidgetProps {
    icon: ReactNode
    title: string
    link: { to: string; label: string }
    // Right side of the header, e.g. PillTabs.
    actions?: ReactNode
    children: ReactNode
}

export interface PillTabsProps<K extends string> {
    tabs: { key: K; label: string }[]
    active: K
    onSelect: (key: K) => void
}
