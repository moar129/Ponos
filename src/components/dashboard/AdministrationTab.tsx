// src/components/dashboard/AdministrationTab.tsx
import { useState } from 'react'
import { Building2, KeyRound, UserPlus, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
    MANAGE_MEMBERSHIP_REQUESTS_PRIVILEGE,
    MANAGE_ORGANISATION_PRIVILEGE,
    MANAGE_ROLES_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import type { AdminSubTab } from '../../types/dashboard/dashboardType'
import { RolesPrivilegesPanel } from './RolesPrivilegesPanel'
import { MembersPanel } from './MembersPanel'
import { MembershipRequestsPanel } from './MembershipRequestsPanel'
import { OrganisationAdminPanel } from './OrganisationAdminPanel'

interface SubTabDef {
    key: AdminSubTab
    label: string
    icon: LucideIcon
}

// US-65: samler roller/privilegier, medlemmer, medlemsanmodninger og
// organisations-administration i én fane, hver stadig gated af sit eget
// specifikke privilegie - en bruger med kun ét privilegie ser kun de(n)
// tilhørende underfane(r). "Roller & privilegier" og "Medlemmer" er
// bevidst to sideordnede faner (ikke én fane med en fane indeni) - det
// gav tre niveauer af faner oven i hinanden og virkede forvirrende.
export function AdministrationTab() {
    const { hasPrivilege: canManageRoles } = useHasPrivilege(MANAGE_ROLES_PRIVILEGE)
    const { hasPrivilege: canManageMembershipRequests } = useHasPrivilege(MANAGE_MEMBERSHIP_REQUESTS_PRIVILEGE)
    const { hasPrivilege: canManageOrganisation } = useHasPrivilege(MANAGE_ORGANISATION_PRIVILEGE)

    const tabs: SubTabDef[] = []
    if (canManageRoles) tabs.push({ key: 'roles', label: 'Roller & privilegier', icon: KeyRound })
    // Medlemmers rolle-tildeling kræver samme privilegie som selve
    // rolle-administrationen.
    if (canManageRoles) tabs.push({ key: 'members', label: 'Medlemmer', icon: Users })
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

    const tabClass = (tab: AdminSubTab) =>
        `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeSubTab === tab
            ? 'border-primary text-primary'
            : 'border-transparent text-secondary hover:text-primary'
        }`

    return (
        <div>
            <div className="flex gap-2 border-b border-border-gray mb-6">
                {tabs.map((tab) => (
                    <button key={tab.key} type="button" onClick={() => setSelectedSubTab(tab.key)} className={tabClass(tab.key)}>
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeSubTab === 'roles' && <RolesPrivilegesPanel />}
            {activeSubTab === 'members' && <MembersPanel />}
            {activeSubTab === 'requests' && <MembershipRequestsPanel />}
            {activeSubTab === 'organisation' && <OrganisationAdminPanel />}
        </div>
    )
}
