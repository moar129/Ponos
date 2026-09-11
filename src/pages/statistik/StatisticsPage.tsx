// src/pages/statistik/StatisticsPage.tsx
import { BarChart3, Building2, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import { PlaceholderBar } from '../../components/dashboard/PlaceholderBar'

// Pladsholder-side, der reserverer /statistik-ruten. Selve Statistik-
// domænet bygges af en anden studerende - her står kun skallen, så
// header/footer/dashboardets genvejskort har et rigtigt sted at pege hen
// (de pegede før på "/", som nu er den offentlige forside).
export default function StatisticsPage() {
    // Statistik er organisationens tal, så siden kræver en aktiv
    // organisation - ikke bare login. Samme activeOrganisationId-tjek som
    // headeren bruger til at vise/skjule selve nav-linket.
    const { data: profile, isLoading } = useGetMyProfileQuery()

    if (isLoading) {
        return <p className="text-secondary">Indlæser...</p>
    }

    // Samme venlige tom-tilstand som dashboardets Oversigt-fane, i stedet
    // for en tom side uden forklaring.
    if (!profile?.activeOrganisationId) {
        return (
            <div className="rounded-md border border-border-gray p-5 text-center">
                <p className="text-secondary mb-3">
                    Du har ingen aktiv organisation endnu, så der er ingen statistik at vise.
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
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-secondary" />
                <h1 className="text-xl font-semibold text-primary">Statistik</h1>
            </div>

            <PlaceholderBar
                label="Statistik"
                description="Nøgletal og indsigt beregnet ud fra organisationens items og opgaver."
                icon={TrendingUp}
            />
        </div>
    )
}
