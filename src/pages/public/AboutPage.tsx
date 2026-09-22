// src/pages/public/AboutPage.tsx
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { PageHero } from '../../components/public/PageHero'
import { LandingCta } from '../../components/landing/LandingCta'

// Offentlig side på /om-os. Modsat forsiden, der forklarer HVAD Ponos er,
// handler denne om HVORFOR den findes og hvordan der er tænkt undervejs.
// Ligger uden for <main>'ens max-w-7xl-wrapper (se FULL_WIDTH_ROUTES i
// App.tsx), så hver sektion selv går kant-til-kant.
//
// Bevidst INGEN redirect for indloggede: siden er offentlig for alle. Det
// er LandingCta der selv gemmer sig, når man er logget ind.

// Principperne bag produktet (Project.md §3 og §5). Samme <dl>-mønster som
// LandingPartners fokusområder, så de to lister ser ud af samme familie.
const PRINCIPLE_KEYS = ['multiTenant', 'writeOnce', 'autoNumbers', 'yourData'] as const

export default function AboutPage() {
    const { t } = useTranslation('public')

    return (
        <>
            <PageHero
                title={t('about.heroTitle')}
                description={t('about.heroDescription')}
            />

            <section className="bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">
                            {t('about.whyTitle')}
                        </h2>

                        <p className="mt-4 text-secondary dark:text-slate-400">
                            {t('about.why1')}
                        </p>

                        <p className="mt-4 text-secondary dark:text-slate-400">
                            {t('about.why2')}
                        </p>

                        <p className="mt-4 text-secondary dark:text-slate-400">
                            {t('about.why3')}
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-bg-gray/40 dark:bg-slate-800/40 border-y border-border-gray dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">
                            {t('about.principlesTitle')}
                        </h2>
                        <p className="mt-4 text-secondary dark:text-slate-400">
                            {t('about.principlesIntro')}
                        </p>
                    </div>

                    <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        {PRINCIPLE_KEYS.map((key) => (
                            <div key={key}>
                                <dt className="font-semibold text-primary dark:text-slate-100">{t(`about.principles.${key}.name`)}</dt>
                                <dd className="text-sm text-secondary dark:text-slate-400 mt-1">{t(`about.principles.${key}.description`)}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            <section className="bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">
                            {t('about.behindTitle')}
                        </h2>

                        <p className="mt-4 text-secondary dark:text-slate-400">
                            <Trans ns="public" i18nKey="about.behind1" components={{ strong: <strong className="font-semibold text-primary dark:text-slate-100" /> }} />
                        </p>

                        <p className="mt-4 text-secondary dark:text-slate-400">
                            {t('about.behind2')}
                        </p>

                        <p className="mt-4 text-secondary dark:text-slate-400">
                            {t('about.behind3')}
                        </p>

                        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-3">
                            <a
                                href="https://corolab.dk/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                            >
                                {t('partner.readMoreCorolab')}
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            </a>

                            <Link to="/kontakt" className="text-sm text-accent hover:underline">
                                {t('about.writeToUs')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <LandingCta />
        </>
    )
}
