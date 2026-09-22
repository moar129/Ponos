// src/pages/statistik/StatisticsPage.tsx
import { BarChart3, Building2, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import { PlaceholderBar } from '../../components/dashboard/PlaceholderBar'

// Pladsholder-side, der reserverer /statistik-ruten. Selve Statistik-
// domænet bygges af en anden studerende - her står kun skallen, så
// header/footer/dashboardets genvejskort har et rigtigt sted at pege hen
// (de pegede før på "/", som nu er den offentlige forside).
export default function StatisticsPage() {
  const { t } = useTranslation('dashboard')
    // Statistik er organisationens tal, så siden kræver en aktiv
    // organisation - ikke bare login. Samme activeOrganisationId-tjek som
    // headeren bruger til at vise/skjule selve nav-linket.
    const { data: profile, isLoading } = useGetMyProfileQuery()

    if (isLoading) {
        return <p className="text-secondary dark:text-slate-400">{t('statistics.loading')}</p>
    }

    // Samme venlige tom-tilstand som dashboardets Oversigt-fane, i stedet
    // for en tom side uden forklaring.
    if (!profile?.activeOrganisationId) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-primary dark:text-slate-100">
                <div className="rounded-md border border-border-gray dark:border-slate-700 p-5 text-center">
                    <p className="text-secondary dark:text-slate-400 mb-3">
                        {t('statistics.noOrganisation')}
                    </p>
                    <Link
                        to="/dashboard?tab=organisation"
                        className="inline-flex items-center gap-2 text-accent font-medium hover:underline"
                    >
                        <Building2 className="w-4 h-4" />
                        {t('statistics.goToOrganisation')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-primary dark:text-slate-100 space-y-6">
            <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-secondary dark:text-slate-400" />
                <h1 className="text-xl font-semibold text-primary dark:text-slate-100">{t('statistics.title')}</h1>
            </div>

            <PlaceholderBar
                label={t('statistics.title')}
                description={t('statistics.description')}
                icon={TrendingUp}
            />
        </div>
    )
}
