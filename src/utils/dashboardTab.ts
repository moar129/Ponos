// src/utils/dashboardTab.ts
import type { DashboardTab } from '../types/dashboard/dashboardType'

const DASHBOARD_TABS: readonly DashboardTab[] = ['oversigt', 'organisation', 'administration']

/**
 * Hvilken dashboard-fane ?tab=... peger på. Uden (gyldig) parameter:
 * Oversigt for en bruger med aktiv organisation, ellers Organisation -
 * der er intet at vise på Oversigt endnu. Delt af Dashboard og
 * PendingRequestBanner (som skjuler sig, mens Organisation-fanen er åben).
 */
export function resolveDashboardTab(tabParam: string | null, hasOrganisation: boolean): DashboardTab {
    const requested = DASHBOARD_TABS.find((tab) => tab === tabParam)
    return requested ?? (hasOrganisation ? 'oversigt' : 'organisation')
}
