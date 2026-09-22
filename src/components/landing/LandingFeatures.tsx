// src/components/landing/LandingFeatures.tsx
import { Database, ClipboardList, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LandingFeatureCard } from './LandingFeatureCard'

// Platformens tre hovedområder (Project.md §4-6). Det bærende afsnit på
// forsiden - det er her læseren faktisk forstår hvad Ponos er. Samme tre
// områder og ikoner som dashboardets genvejskort, så siderne genkendes igen
// når brugeren er logget ind.
export function LandingFeatures() {
    const { t } = useTranslation('public')

    return (
        <section className="bg-bg-gray/40 dark:bg-slate-800/40 border-y border-border-gray dark:border-slate-700">
            <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                <div className="max-w-3xl">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">
                        {t('features.title')}
                    </h2>
                    <p className="mt-4 text-secondary dark:text-slate-400">
                        {t('features.intro')}
                    </p>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <LandingFeatureCard
                        icon={Database}
                        label={t('features.datalayer.label')}
                        question={t('features.datalayer.question')}
                        description={t('features.datalayer.description')}
                    />
                    <LandingFeatureCard
                        icon={ClipboardList}
                        label={t('features.tasks.label')}
                        question={t('features.tasks.question')}
                        description={t('features.tasks.description')}
                    />
                    <LandingFeatureCard
                        icon={BarChart3}
                        label={t('features.statistics.label')}
                        question={t('features.statistics.question')}
                        description={t('features.statistics.description')}
                    />
                </div>
            </div>
        </section>
    )
}
