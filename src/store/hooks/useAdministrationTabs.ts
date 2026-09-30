// src/store/hooks/useAdministrationTabs.ts
import { useTranslation } from 'react-i18next'
import { Building2, CheckCircle2, ClipboardCheck, KeyRound, Palette, Send, UserPlus, Users } from 'lucide-react'
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
    UPDATE_MEMBERSHIP_REQUESTS_PRIVILEGE,
    UPDATE_ORGANISATION_PRIVILEGE,
    UPDATE_ROLES_PRIVILEGE,
    VIEW_COMPLETED_TASKS_PRIVILEGE,
    useHasAnyPrivilege,
    useHasPrivilege,
} from '../apis/privilegeApi'
import { useActiveMembership } from '../apis/organisationApi'
import type { AdminSubTab } from '../../types/dashboard/dashboardType'
import type { SideNavTab } from '../../types/common/layoutType'

// De administrative underfaner brugeren kan se (US-65), hver gated af sit
// eget privilegie. Ét sted, så dashboardet ("vis Administration-fanen?")
// og selve fanen ("hvilke underfaner?") ikke kan drive fra hinanden -
// det gjorde de: dashboardet manglede admin-undtagelsen for Organisation.
//
// Undtagelse: "Organisation" vises også for organisationens admin
// (medlemskabets isAdmin-flag) uden update_organisation - "Slet
// organisation" styres kun af admin-status (se OrganisationAdminPanel).
export function useAdministrationTabs(): SideNavTab<AdminSubTab>[] {
    const { t } = useTranslation('dashboard')
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
    const isOrgAdmin = useActiveMembership()?.isAdmin ?? false
    // read_tasks alene giver bevidst IKKE adgang til Administration - kun
    // rettigheder der reelt kan bruges her (view_completed_tasks,
    // approve/reject_task).
    const { hasPrivilege: canSeeCompletedTasks } = useHasPrivilege(VIEW_COMPLETED_TASKS_PRIVILEGE)
    const { hasPrivilege: canSeeTaskApprovals } = useHasAnyPrivilege([APPROVE_TASK_PRIVILEGE, REJECT_TASK_PRIVILEGE])

    const tabs: SideNavTab<AdminSubTab>[] = []
    if (canSeeRolesDomain) tabs.push({ key: 'roles', label: t('administration.panels.roles'), icon: KeyRound })
    // Rolle-tildeling (update_roles) og/eller "Fjern" (delete_members) -
    // panelet gater hver kontrol selv (US-66).
    if (canAssignRoles || canManageMembers) tabs.push({ key: 'members', label: t('administration.panels.members'), icon: Users })
    if (canManageInvitations) tabs.push({ key: 'invitations', label: t('administration.panels.invitations'), icon: Send })
    if (canManageMembershipRequests) tabs.push({ key: 'requests', label: t('administration.panels.membershipRequests'), icon: UserPlus })
    if (canManageOrganisation || isOrgAdmin) tabs.push({ key: 'organisation', label: t('administration.panels.organisation'), icon: Building2 })
    // Farver kræver update_organisation - admin-undtagelsen gælder kun sletning.
    if (canManageOrganisation) tabs.push({ key: 'colors', label: t('administration.panels.colors'), icon: Palette })
    if (canSeeTaskApprovals) tabs.push({ key: 'taskApprovals', label: t('administration.panels.taskApprovals'), icon: ClipboardCheck })
    if (canSeeCompletedTasks) tabs.push({ key: 'completedTasks', label: t('administration.panels.completedTasks'), icon: CheckCircle2 })

    return tabs
}
