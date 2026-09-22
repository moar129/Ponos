// src/pages/public/NotFoundPage.tsx
import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGetSessionQuery } from '../../store/apis/authApi'

// Catch-all for ukendte URL'er (<Route path="*"> i App.tsx). Før denne
// side stod der bare en tom side mellem header og footer, hvis man skrev
// forkert eller fulgte et forældet link.
//
// Ligger bevidst i <main>'ens almindelige max-w-7xl-wrapper og ikke i
// FULL_WIDTH_ROUTES: en fejlside skal ikke ligne en marketingside.
export default function NotFoundPage() {
    // Samme session-kilde som resten af appen. Bestemmer kun hvor "tilbage"
    // peger hen - siden vises ens for alle.
    const { t } = useTranslation('public')
    const { data: session } = useGetSessionQuery()

    return (
        <div className="max-w-xl mx-auto text-center py-16">
            <div className="w-16 h-16 rounded-full bg-bg-gray dark:bg-slate-800 flex items-center justify-center mx-auto">
                <Compass className="w-8 h-8 text-secondary dark:text-slate-400" />
            </div>

            <h1 className="mt-6 text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">
                {t('notFound.title')}
            </h1>

            <p className="mt-4 text-secondary dark:text-slate-400">
                {t('notFound.body')}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                    to={session ? '/dashboard' : '/'}
                    className="inline-flex items-center justify-center bg-accent text-white rounded-md px-6 py-3 font-semibold hover:bg-accent-hover transition-colors"
                >
                    {session ? t('notFound.toDashboard') : t('notFound.toHome')}
                </Link>
                <Link
                    to="/hjaelp"
                    className="inline-flex items-center justify-center rounded-md border border-border-gray dark:border-slate-700 px-6 py-3 font-medium text-primary dark:text-slate-100 hover:bg-bg-gray dark:hover:bg-slate-700 transition-colors"
                >
                    {t('notFound.toHelp')}
                </Link>
            </div>
        </div>
    )
}
