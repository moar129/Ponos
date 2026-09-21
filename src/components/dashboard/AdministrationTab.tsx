// src/components/dashboard/AdministrationTab.tsx
import { useState } from 'react'
import { Building2, CheckCircle2, ClipboardCheck, KeyRound, Send, UserPlus, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
    APPROVE_TASK_PRIVILEGE,
    REJECT_TASK_PRIVILEGE,
    CREATE_INVITATIONS_PRIVILEGE,
    CREATE_ROLES_PRIVILEGE,
    DELETE_INVITATIONS_PRIVILEGE,
    DELETE_MEMBERS_PRIVILEGE,
    DELETE_ROLES_PRIVILEGE,
    READ_INVITATIONS_PRIVILEGE,
    READ_MEMBERSHIP_REQUESTS_PRIVILEGE,
    READ_ROLES_PRIVILEGE,
    DELETE_TASKS_PRIVILEGE,
    UPDATE_MEMBERSHIP_REQUESTS_PRIVILEGE,
    UPDATE_ORGANISATION_PRIVILEGE,
    UPDATE_ROLES_PRIVILEGE,
    UPDATE_TASKS_PRIVILEGE,
    useHasAnyPrivilege,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import { useGetMyMembershipsQuery } from '../../store/apis/organisationApi'
import type { AdminSubTab } from '../../types/dashboard/dashboardType'
import { RolesPrivilegesPanel } from './RolesPrivilegesPanel'
import { MembersPanel } from './MembersPanel'
import { InvitationsPanel } from './InvitationsPanel'
import { MembershipRequestsPanel } from './MembershipRequestsPanel'
import { OrganisationAdminPanel } from './OrganisationAdminPanel'
import { CompletedTasksPanel } from './CompletedTasksPanel'
import { TaskApprovalsPanel } from './TaskApprovalsPanel'

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
//
// Undtagelse: "Organisation"-fanen vises også for organisationens admin
// (medlemskabets isAdmin-flag), selv uden update_organisation-
// privilegiet - "Slet organisation" er bevidst kun styret af admin-
// status, uafhængigt af privilegier (se OrganisationAdminPanel.tsx),
// så admin skal altid kunne nå frem til den, uanset privilegie-opsætning.
export function AdministrationTab() {
    const { hasPrivilege: canSeeRolesDomain } = useHasAnyPrivilege([
        CREATE_ROLES_PRIVILEGE,
        READ_ROLES_PRIVILEGE,
        UPDATE_ROLES_PRIVILEGE,
        DELETE_ROLES_PRIVILEGE,
    ])
    const { hasPrivilege: canAssignRoles } = useHasPrivilege(UPDATE_ROLES_PRIVILEGE)
    const { hasPrivilege: canManageMembers } = useHasPrivilege(DELETE_MEMBERS_PRIVILEGE)
    const { hasPrivilege: canManageInvitations } = useHasAnyPrivilege([
        CREATE_INVITATIONS_PRIVILEGE,
        READ_INVITATIONS_PRIVILEGE,
        DELETE_INVITATIONS_PRIVILEGE,
    ])
    const { hasPrivilege: canManageMembershipRequests } = useHasAnyPrivilege([
        READ_MEMBERSHIP_REQUESTS_PRIVILEGE,
        UPDATE_MEMBERSHIP_REQUESTS_PRIVILEGE,
    ])
    const { hasPrivilege: canManageOrganisation } = useHasPrivilege(UPDATE_ORGANISATION_PRIVILEGE)
    const { data: memberships } = useGetMyMembershipsQuery()
    const isOrgAdmin = memberships?.find((m) => m.isActive)?.isAdmin ?? false
    // Fane kræver rent faktisk manage-ret (update/delete_tasks), ikke bare
    // read_tasks - en ren "Medlem" (kun read_tasks) skal se opgaver via det
    // almindelige /tasks-link, ikke via Administration (rettet 2026-09-17
    // efter bruger-feedback: "se"-privilegiet alene giver ikke adgang til
    // Administration noget sted, kun rettigheder der reelt kan bruges der).
    const { hasPrivilege: canSeeCompletedTasks } = useHasAnyPrivilege([UPDATE_TASKS_PRIVILEGE, DELETE_TASKS_PRIVILEGE])
    const { hasPrivilege: canSeeTaskApprovals } = useHasAnyPrivilege([APPROVE_TASK_PRIVILEGE, REJECT_TASK_PRIVILEGE])

    const tabs: SubTabDef[] = []
    if (canSeeRolesDomain) tabs.push({ key: 'roles', label: 'Roller & privilegier', icon: KeyRound })
    // "Medlemmer & roller" viser rolle-tildeling (update_roles) og/eller
    // "Fjern" (delete_members) - fanen er synlig hvis mindst én af de to
    // er til stede, panelet selv gater hver kontrol uafhængigt (US-66).
    // Navnet er bevidst udvidet (2026-09-17, bruger-feedback): "Medlemmer"
    // alene afslørede ikke at rolletildeling foregår her, ikke under
    // "Roller & privilegier".
    if (canAssignRoles || canManageMembers) tabs.push({ key: 'members', label: 'Medlemmer og tildel rolle', icon: Users })
    if (canManageInvitations) tabs.push({ key: 'invitations', label: 'Invitationer', icon: Send })
    if (canManageMembershipRequests) tabs.push({ key: 'requests', label: 'Medlemsanmodninger', icon: UserPlus })
    if (canManageOrganisation || isOrgAdmin) tabs.push({ key: 'organisation', label: 'Organisation', icon: Building2 })
    if (canSeeTaskApprovals) tabs.push({ key: 'taskApprovals', label: 'Opgavegodkendelser', icon: ClipboardCheck })
    if (canSeeCompletedTasks) tabs.push({ key: 'completedTasks', label: 'Afsluttede opgaver', icon: CheckCircle2 })

    const [selectedSubTab, setSelectedSubTab] = useState<AdminSubTab | null>(null)

    // Falder tilbage til den første synlige underfane, hvis den valgte
    // forsvinder (fx mistet privilegie) eller ingen er valgt endnu - en
    // ren udledning ud fra render-tidspunktets tabs, ingen effect
    // nødvendig.
    const activeSubTab = selectedSubTab && tabs.some((tab) => tab.key === selectedSubTab)
        ? selectedSubTab
        : (tabs[0]?.key ?? null)

    if (tabs.length === 0) {
        return <p className="text-secondary dark:text-slate-400">Du har ikke rettigheder til nogen administrative funktioner.</p>
    }

    // Samme layout-mønster som DataLayerPage.tsx (Kategorier/Items-splittet):
    // en 12-kolonne grid der giver nav'et sin egen boksede panel-kolonne,
    // og indholdet en anden - i stedet for at nav'et bare er en fast
    // 208px-bred stribe. Kolonne-forholdet strammes til (4/12 → 3/12)
    // fra xl, så indholdet får mere plads på brede skærme uden at nav'et
    // bliver unødigt bredt. Mobil (under md) beholder den vandret
    // scrollende fanerække.
    const navItemClass = (tab: AdminSubTab) =>
        `flex shrink-0 md:shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeSubTab === tab
            ? 'bg-accent/15 text-primary dark:text-slate-100'
            : 'text-secondary hover:bg-bg-gray hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
        }`

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
            <nav className="md:col-span-4 lg:col-span-4 xl:col-span-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible no-scrollbar rounded-lg border border-border-gray bg-white p-2 md:p-3 dark:border-slate-700 dark:bg-slate-800">
                {tabs.map((tab) => (
                    <button key={tab.key} type="button" onClick={() => setSelectedSubTab(tab.key)} className={navItemClass(tab.key)}>
                        <tab.icon className="w-4 h-4 shrink-0" />
                        {tab.label}
                    </button>
                ))}
            </nav>

            <div className="md:col-span-8 lg:col-span-8 xl:col-span-9 min-w-0 rounded-lg border border-border-gray bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-800">
                {activeSubTab === 'roles' && <RolesPrivilegesPanel />}
                {activeSubTab === 'members' && <MembersPanel />}
                {activeSubTab === 'invitations' && <InvitationsPanel />}
                {activeSubTab === 'requests' && <MembershipRequestsPanel />}
                {activeSubTab === 'organisation' && <OrganisationAdminPanel />}
                {activeSubTab === 'taskApprovals' && <TaskApprovalsPanel />}
                {activeSubTab === 'completedTasks' && <CompletedTasksPanel />}
            </div>
        </div>
    )
}
