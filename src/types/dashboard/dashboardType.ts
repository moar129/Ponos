import type { LucideIcon } from 'lucide-react'

export interface PlaceholderBarProps {
    label: string
    description: string
    icon: LucideIcon
}

// De administrative underfaner, hver gated af sit eget privilegie (US-65).
// 'roles' (roller & privilegier) og 'members' (medlemmers rolle-
// tildeling) er sideordnede faner i stedet for at 'members' er nestet
// INDE i 'roles' - undgår tre niveauer af faner oven i hinanden.
// 'invitations' (US-67) er gated af sin egen manage_invitations-privilegie.
// 'completedTasks' (US-70) er gated af read_tasks (eller admin).
export type AdminSubTab = 'roles' | 'members' | 'invitations' | 'requests' | 'organisation' | 'completedTasks' | 'taskApprovals'

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
