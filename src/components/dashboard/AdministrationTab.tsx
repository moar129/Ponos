// src/components/dashboard/AdministrationTab.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdministrationTabs } from '../../store/hooks/useAdministrationTabs'
import type { AdminSubTab } from '../../types/dashboard/dashboardType'
import { SideNavLayout } from '../common/SideNavLayout'
import { RolesPrivilegesPanel } from './RolesPrivilegesPanel'
import { MembersPanel } from './MembersPanel'
import { InvitationsPanel } from './InvitationsPanel'
import { MembershipRequestsPanel } from './MembershipRequestsPanel'
import { OrganisationAdminPanel } from './OrganisationAdminPanel'
import { OrganisationColorsPanel } from './OrganisationColorsPanel'
import { CompletedTasksPanel } from './CompletedTasksPanel'
import { TaskApprovalsPanel } from './TaskApprovalsPanel'

// US-65: samler roller/privilegier, medlemmer, invitationer,
// medlemsanmodninger og organisations-administration i én fane, hver
// stadig gated af sit eget specifikke privilegie (useAdministrationTabs)
// - en bruger med kun ét privilegie ser kun de(n) tilhørende underfane(r).
// "Roller & privilegier" og "Medlemmer" er bevidst to sideordnede faner
// (ikke én fane med en fane indeni) - det gav tre niveauer af faner oven
// i hinanden og virkede forvirrende.
export function AdministrationTab() {
    const { t } = useTranslation('dashboard')
    const tabs = useAdministrationTabs()
    const [selectedSubTab, setSelectedSubTab] = useState<AdminSubTab | null>(null)

    // Falder tilbage til den første synlige underfane, hvis den valgte
    // forsvinder (fx mistet privilegie) eller ingen er valgt endnu - en
    // ren udledning ud fra render-tidspunktets tabs, ingen effect
    // nødvendig.
    const activeSubTab = selectedSubTab && tabs.some((tab) => tab.key === selectedSubTab)
        ? selectedSubTab
        : (tabs[0]?.key ?? null)

    if (!activeSubTab) {
        return <p className="text-secondary dark:text-slate-400">{t('administration.noPrivileges')}</p>
    }

    return (
        <SideNavLayout tabs={tabs} active={activeSubTab} onSelect={setSelectedSubTab}>
            {activeSubTab === 'roles' && <RolesPrivilegesPanel />}
            {activeSubTab === 'members' && <MembersPanel />}
            {activeSubTab === 'invitations' && <InvitationsPanel />}
            {activeSubTab === 'requests' && <MembershipRequestsPanel />}
            {activeSubTab === 'organisation' && <OrganisationAdminPanel />}
            {activeSubTab === 'colors' && <OrganisationColorsPanel />}
            {activeSubTab === 'taskApprovals' && <TaskApprovalsPanel />}
            {activeSubTab === 'completedTasks' && <CompletedTasksPanel />}
        </SideNavLayout>
    )
}
