// src/components/dashboard/AdministrationTab.tsx
import { useState } from 'react'
import { Building2, KeyRound, Send, UserPlus, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
    MANAGE_INVITATIONS_PRIVILEGE,
    MANAGE_MEMBERS_PRIVILEGE,
    MANAGE_MEMBERSHIP_REQUESTS_PRIVILEGE,
    MANAGE_ORGANISATION_PRIVILEGE,
    MANAGE_ROLES_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import type { AdminSubTab } from '../../types/dashboard/dashboardType'
import { RolesPrivilegesPanel } from './RolesPrivilegesPanel'
import { MembersPanel } from './MembersPanel'
import { InvitationsPanel } from './InvitationsPanel'
import { MembershipRequestsPanel } from './MembershipRequestsPanel'
import { OrganisationAdminPanel } from './OrganisationAdminPanel'

interface SubTabDef {
    key: AdminSubTab
    label: string
    icon: LucideIcon
}

// US-65: samler roller/privilegier, medlemmer, invitationer,
// medlemsanmodninger og organisations-administration i én fane, hver
// stadig gated af sit eget specifikke privilegie - en bruger med kun ét
// privilegie ser kun de(n) tilhørende underfane(r). "Roller &
// privilegier" og "Medlemmer" er bevidst to sideordnede faner (ikke én
// fane med en fane indeni) - det gav tre niveauer af faner oven i
// hinanden og virkede forvirrende.
export function AdministrationTab() {
    const { hasPrivilege: canManageRoles } = useHasPrivilege(MANAGE_ROLES_PRIVILEGE)
    const { hasPrivilege: canManageMembers } = useHasPrivilege(MANAGE_MEMBERS_PRIVILEGE)
    const { hasPrivilege: canManageInvitations } = useHasPrivilege(MANAGE_INVITATIONS_PRIVILEGE)
    const { hasPrivilege: canManageMembershipRequests } = useHasPrivilege(MANAGE_MEMBERSHIP_REQUESTS_PRIVILEGE)
    const { hasPrivilege: canManageOrganisation } = useHasPrivilege(MANAGE_ORGANISATION_PRIVILEGE)

    const tabs: SubTabDef[] = []
    if (canManageRoles) tabs.push({ key: 'roles', label: 'Roller & privilegier', icon: KeyRound })
    // "Medlemmer" viser rolle-tildeling (manage_roles) og/eller "Fjern"
    // (manage_members) - fanen er synlig hvis mindst én af de to er til
    // stede, panelet selv gater hver kontrol uafhængigt (US-66).
    if (canManageRoles || canManageMembers) tabs.push({ key: 'members', label: 'Medlemmer', icon: Users })
    if (canManageInvitations) tabs.push({ key: 'invitations', label: 'Invitationer', icon: Send })
    if (canManageMembershipRequests) tabs.push({ key: 'requests', label: 'Medlemsanmodninger', icon: UserPlus })
    if (canManageOrganisation) tabs.push({ key: 'organisation', label: 'Organisation', icon: Building2 })

    const [selectedSubTab, setSelectedSubTab] = useState<AdminSubTab | null>(null)

    // Falder tilbage til den første synlige underfane, hvis den valgte
    // forsvinder (fx mistet privilegie) eller ingen er valgt endnu - en
    // ren udledning ud fra render-tidspunktets tabs, ingen effect
    // nødvendig.
    const activeSubTab = selectedSubTab && tabs.some((tab) => tab.key === selectedSubTab)
        ? selectedSubTab
        : (tabs[0]?.key ?? null)

    if (tabs.length === 0) {
        return <p className="text-secondary">Du har ikke rettigheder til nogen administrative funktioner.</p>
    }

    // Samme regler som dashboardets top-faner (se Dashboard.tsx): fanen
    // beholder sin bredde, rækken scroller. Her er der op til fem faner, så
    // det slår igennem allerede på en tablet.
    const tabClass = (tab: AdminSubTab) =>
        `flex shrink-0 whitespace-nowrap items-center gap-2 px-3 sm:px-4 py-2.5 -mb-px text-sm font-medium border-b-2 transition-colors ${activeSubTab === tab
            ? 'border-primary text-primary'
            : 'border-transparent text-secondary hover:text-primary'
        }`

    return (
        <div>
            <div className="flex gap-1 sm:gap-2 border-b border-border-gray mb-6 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button key={tab.key} type="button" onClick={() => setSelectedSubTab(tab.key)} className={tabClass(tab.key)}>
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeSubTab === 'roles' && <RolesPrivilegesPanel />}
            {activeSubTab === 'members' && <MembersPanel />}
            {activeSubTab === 'invitations' && <InvitationsPanel />}
            {activeSubTab === 'requests' && <MembershipRequestsPanel />}
            {activeSubTab === 'organisation' && <OrganisationAdminPanel />}
        </div>
    )
}
