// src/components/dashboard/OverviewTab.tsx
import { Database, ClipboardList, ListChecks, Building2, BarChart3, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGetMyOrganisationQuery } from '../../store/apis/organisationApi'
import { QuickLinkCard } from './QuickLinkCard'
import { PlaceholderBar } from './PlaceholderBar'
import { NewsSlider } from './NewsSlider'

// US-65: genveje til Datalager/Opgaver/Statistik, samt placeholder-
// bjælker til funktioner uden data/backend endnu - "Dine opgaver" (afventer
// at Opgave-siden/task-modellen bliver færdig) og "Notifikationer" (intet
// datamodel/user story endnu). Nyheder (US-56/US-57) har fået sin egen
// slider-widget nedenfor (NewsSlider) i stedet for en placeholder.
export function OverviewTab() {
    const { data: organisation, isLoading: loadingOrganisation } = useGetMyOrganisationQuery()

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
                    <QuickLinkCard
                        to="/datalager"
                        label="Datalager"
                        description="Se og administrer items, kategorier og lokationer."
                        icon={Database}
                    />
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
                <PlaceholderBar
                    label="Dine opgaver"
                    description="Overblik over dine tildelte opgaver kommer snart."
                    icon={ListChecks}
                />
                <PlaceholderBar
                    label="Notifikationer"
                    description="Notifikationer kommer snart."
                    icon={Bell}
                />
            </div>

            <NewsSlider />
        </div>
    )
}
