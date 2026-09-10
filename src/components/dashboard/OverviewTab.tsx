// src/components/dashboard/OverviewTab.tsx
import { useMemo } from 'react'
import { Database, ClipboardList, ListChecks, Building2, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGetCategoryTreeQuery } from '../../store/apis/categoryApi'
import { useGetMyTaskIdsQuery, useGetTasksQuery } from '../../store/apis/taskApi'
import { useGetMyOrganisationQuery } from '../../store/apis/organisationApi'
import type { DataLayerCat } from '../../types/dataLayer/datalayerTypes'
import { StatCard } from './StatCard'
import { QuickLinkCard } from './QuickLinkCard'

// Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt, som kan
// komme i lidt forskellige former afhængigt af hvor fejlen opstod.
function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

function countItems(categories: DataLayerCat[]): number {
    return categories.reduce((sum, cat) => sum + cat.items.length + countItems(cat.subCategories), 0)
}

// US-46 + US-47 + US-65: antal items/opgaver for den AKTIVE organisation,
// plus antal opgaver tildelt den indloggede bruger selv, samt genveje til
// Datalager/Opgaver. Genbruger de samme queries som Datalager/Opgaver-
// siderne i stedet for nye count-endpoints - RTK Query cacher/deduper
// allerede, og invaliderer automatisk ved org-skift (USER_SCOPED_TAGS).
export function OverviewTab() {
    const { data: organisation, isLoading: loadingOrganisation } = useGetMyOrganisationQuery()
    const { data: categoryTree, isLoading: loadingItems, error: itemsError } = useGetCategoryTreeQuery()
    const { data: tasks, isLoading: loadingTasks, error: tasksError } = useGetTasksQuery()
    const { data: myTaskIds, isLoading: loadingMyTasks, error: myTasksError } = useGetMyTaskIdsQuery()

    const itemCount = useMemo(() => (categoryTree ? countItems(categoryTree) : null), [categoryTree])

    // En bruger uden aktiv organisation ville ellers se tre ens
    // fejlbeskeder ("Kunne ikke hente din organisationstilknytning.") -
    // vis i stedet én venlig besked med en genvej til Organisation-fanen.
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    label="Antal items"
                    value={itemCount}
                    isLoading={loadingItems}
                    error={readableError(itemsError)}
                    icon={Database}
                />
                <StatCard
                    label="Antal opgaver"
                    value={tasks?.length ?? null}
                    isLoading={loadingTasks}
                    error={readableError(tasksError)}
                    icon={ClipboardList}
                />
                <StatCard
                    label="Dine opgaver"
                    value={myTaskIds?.length ?? null}
                    isLoading={loadingMyTasks}
                    error={readableError(myTasksError)}
                    icon={ListChecks}
                />
            </div>

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
                        to="/"
                        label="Statistik"
                        description="Se indsigt og statistik for organisationen."
                        icon={BarChart3}
                    />
                </div>
            </div>
        </div>
    )
}
