import type { LucideIcon } from 'lucide-react'

export interface StatCardProps {
    label: string
    value: number | null
    isLoading: boolean
    error: string | null
    icon: LucideIcon
}

// De administrative underfaner, hver gated af sit eget privilegie (US-65).
// 'roles' (roller & privilegier) og 'members' (medlemmers rolle-
// tildeling) er sideordnede faner i stedet for at 'members' er nestet
// INDE i 'roles' - undgår tre niveauer af faner oven i hinanden.
export type AdminSubTab = 'roles' | 'members' | 'requests' | 'organisation'

// Dashboardets tre topfaner (US-65): 'oversigt' og 'organisation' er
// tilgængelige for alle, 'administration' kun med mindst ét
// administrativt privilegie.
export type DashboardTab = 'oversigt' | 'organisation' | 'administration'

export interface QuickLinkCardProps {
    to: string
    label: string
    description: string
    icon: LucideIcon
}
