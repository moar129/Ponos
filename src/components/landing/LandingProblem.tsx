// src/components/landing/LandingProblem.tsx
import { useTranslation } from 'react-i18next'

// "Hvorfor" - problemet Ponos løser (Project.md §2). Holdt kort: det er
// rammen om hovedområde-afsnittet, ikke omvendt.
export function LandingProblem() {
    const { t } = useTranslation('public')

    return (
        <section className="bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                <div className="max-w-3xl">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">
                        {t('problem.title')}
                    </h2>
                    <p className="mt-4 text-secondary dark:text-slate-400">
                        {t('problem.body')}
                    </p>
                </div>
            </div>
        </section>
    )
}
