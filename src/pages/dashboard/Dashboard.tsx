// src/pages/dashboard/Dashboard.tsx
import { useSearchParams } from 'react-router-dom'
import { Building2, LayoutDashboard, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import { useGetMyOrganisationQuery } from '../../store/apis/organisationApi'
import {
    MANAGE_MEMBERSHIP_REQUESTS_PRIVILEGE,
    MANAGE_ORGANISATION_PRIVILEGE,
    MANAGE_ROLES_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import type { DashboardTab } from '../../types/dashboard/dashboardType'
import { OverviewTab } from '../../components/dashboard/OverviewTab'
import { OrganisationTab } from '../../components/dashboard/OrganisationTab'
import { AdministrationTab } from '../../components/dashboard/AdministrationTab'

interface TopTabDef {
    key: DashboardTab
    label: string
    icon: LucideIcon
}

const TOP_TABS: TopTabDef[] = [
    { key: 'oversigt', label: 'Oversigt', icon: LayoutDashboard },
    { key: 'organisation', label: 'Organisation', icon: Building2 },
    { key: 'administration', label: 'Administration', icon: ShieldCheck },
]

// US-45/46/47 + US-65: dashboardet har tre faner - "Oversigt" (alle
// brugere, item-/opgave-antal + genveje), "Organisation" (alle brugere,
// flyttet fra `/organisation` og ud af header-dropdownet) og
// "Administration" (kun for brugere med mindst ét administrativt
// privilegie) - i stedet for spredt over flere separate sider.
//
// Fane-valget ligger i URL'en (?tab=...), så et link (fx
// PendingRequestBanner) kan pege direkte på en bestemt fane, og valget
// overlever et refresh.
export default function Dashboard() {
    const { data: profile } = useGetMyProfileQuery()
    const { data: organisation, isLoading: loadingOrganisation } = useGetMyOrganisationQuery()
    const { hasPrivilege: canManageRoles } = useHasPrivilege(MANAGE_ROLES_PRIVILEGE)
    const { hasPrivilege: canManageMembershipRequests } = useHasPrivilege(MANAGE_MEMBERSHIP_REQUESTS_PRIVILEGE)
    const { hasPrivilege: canManageOrganisation } = useHasPrivilege(MANAGE_ORGANISATION_PRIVILEGE)
    const canSeeAdministration = canManageRoles || canManageMembershipRequests || canManageOrganisation

    const [searchParams, setSearchParams] = useSearchParams()
    const rawTab = searchParams.get('tab')

    // Uden et eksplicit ?tab=... falder vi tilbage til Oversigt for en
    // bruger med aktiv organisation, og til Organisation for en bruger
    // uden - der er intet nyttigt at vise på Oversigt for dem endnu.
    // (Ventes stadig på svar fra organisations-opslaget, antages der en
    // aktiv org, så vi ikke først viser Organisation og så hopper til
    // Oversigt et øjeblik efter.)
    const requestedTab: DashboardTab =
        rawTab === 'organisation' || rawTab === 'administration' || rawTab === 'oversigt'
            ? rawTab
            : (loadingOrganisation || organisation ? 'oversigt' : 'organisation')

    // Falder tilbage til Oversigt, hvis Administration er valgt men lige
    // er blevet usynlig (fx mistet privilegie, eller brugeren netop
    // slettede sin egen aktive organisation) - ren udledning, ingen
    // effect nødvendig.
    const activeTab: DashboardTab = requestedTab === 'administration' && !canSeeAdministration ? 'oversigt' : requestedTab

    const visibleTabs = TOP_TABS.filter((tab) => tab.key !== 'administration' || canSeeAdministration)

    const tabClass = (tab: DashboardTab) =>
        `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
            ? 'border-primary text-primary'
            : 'border-transparent text-secondary hover:text-primary'
        }`

    return (
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
                <p className="text-sm text-secondary">
                    Velkommen{profile ? `, ${profile.firstName}` : ''}.
                </p>
            </div>

            <div className="flex gap-2 border-b border-border-gray mb-6">
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setSearchParams({ tab: tab.key })}
                        className={tabClass(tab.key)}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'oversigt' && <OverviewTab />}
            {activeTab === 'organisation' && <OrganisationTab />}
            {activeTab === 'administration' && <AdministrationTab />}
        </div>
    )
}
