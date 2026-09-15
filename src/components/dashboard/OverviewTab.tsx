// src/components/dashboard/OverviewTab.tsx
import { Database, ClipboardList, Building2, BarChart3, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGetMyOrganisationQuery } from '../../store/apis/organisationApi'
import { READ_DATALAYER_PRIVILEGE, READ_NEWS_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import { QuickLinkCard } from './QuickLinkCard'
import { PlaceholderBar } from './PlaceholderBar'
import { NewsSlider } from './NewsSlider'
import { MyTasksWidget } from './MyTasksWidget'

// US-65: genveje til Datalager/Opgaver/Statistik, "Dine opgaver" (US-74)
// og en placeholder-bjælke til "Notifikationer" (afventer US-71/72).
// Nyheder (US-56) har sin egen slider-widget nedenfor (NewsSlider).
export function OverviewTab() {
    const { data: organisation, isLoading: loadingOrganisation } = useGetMyOrganisationQuery()
    const { hasPrivilege: canReadDatalayer } = useHasPrivilege(READ_DATALAYER_PRIVILEGE)
    const { hasPrivilege: canReadNews } = useHasPrivilege(READ_NEWS_PRIVILEGE)

    // En bruger uden aktiv organisation ville ellers se en tom side uden
    // forklaring - vis i stedet én venlig besked med en genvej til
    // Organisation-fanen.
    if (!loadingOrganisation && !organisation) {
        return (
            <div className="rounded-md border border-border-gray p-5 text-center">
                <p className="text-secondary mb-3">
                    Du har ingen aktiv organisation endnu, så der er intet at vise her.
                </p>
                <Link
                    to="/dashboard?tab=organisation"
                    className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                >
                    <Building2 className="w-4 h-4" />
                    Gå til Organisation
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-sm font-medium text-secondary mb-3">Genveje</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {canReadDatalayer && (
                        <QuickLinkCard
                            to="/datalager"
                            label="Datalager"
                            description="Se og administrer items, kategorier og lokationer."
                            icon={Database}
                        />
                    )}
                    <QuickLinkCard
                        to="/tasks"
                        label="Opgaver"
                        description="Se og administrer organisationens opgaver."
                        icon={ClipboardList}
                    />
                    <QuickLinkCard
                        to="/statistik"
                        label="Statistik"
                        description="Se indsigt og statistik for organisationen."
                        icon={BarChart3}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MyTasksWidget />
                <PlaceholderBar
                    label="Notifikationer"
                    description="Notifikationer kommer snart."
                    icon={Bell}
                />
            </div>

            {canReadNews && <NewsSlider />}
        </div>
    )
}
