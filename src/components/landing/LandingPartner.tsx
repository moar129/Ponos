// src/components/landing/LandingPartner.tsx
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'

// Hvem platformen laves for. Alt indhold her er faktuelt gengivet fra
// corolab.dk - ingen tal eller påstande der ikke står på deres egen side.
// Testmiljøet nævnes bevidst ikke ved navn, så forsiden ikke binder
// produktet til én case (Project.md §3.3).

// Corolabs egne nøgletal, som de står på corolab.dk. Alle er "mindst"-tal,
// så de ikke bliver forkerte af at siden her ikke opdaterer sig selv.
const KEY_FIGURES = [
    { value: '220+', key: 'events' },
    { value: '21.500+', key: 'participants' },
    { value: '200+', key: 'projects' },
    { value: '125+ mio. kr.', key: 'funding' },
] as const

const FOCUS_AREAS = [
    { name: 'CO-meet', key: 'meet' },
    { name: 'CO-pilots', key: 'pilots' },
    { name: 'CO-fund', key: 'fund' },
    { name: 'CO-creation', key: 'creation' },
    { name: 'CO-lab', key: 'lab' },
    { name: 'CO-branding', key: 'branding' },
] as const

export function LandingPartner() {
    const { t } = useTranslation('public')

    return (
        <section className="bg-white dark:bg-slate-900 border-t border-border-gray dark:border-slate-700">
            <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                <div className="max-w-3xl">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">{t('partner.title')}</h2>

                    <p className="mt-4 text-secondary dark:text-slate-400">
                        <Trans ns="public" i18nKey="partner.intro" components={{ strong: <strong className="font-semibold text-primary dark:text-slate-100" /> }} />
                    </p>
                </div>

                {/* Nøgletal, ikke et diagram: fire selvstændige tal uden
                    sammenligning eller tidsserie. Værdien står i sans som
                    resten af UI'en - serif er forbeholdt PONOS-ordmærket. */}
                <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-6 rounded-lg bg-bg-gray/40 dark:bg-slate-800/40 border border-border-gray dark:border-slate-700 p-6">
                    {KEY_FIGURES.map((figure) => (
                        <div key={figure.key}>
                            <span className="block text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">
                                {figure.value}
                            </span>
                            <span className="block text-sm text-secondary dark:text-slate-400 mt-1">{t(`partner.figures.${figure.key}`)}</span>
                        </div>
                    ))}
                </div>

                <p className="mt-3 text-xs text-secondary dark:text-slate-400">
                    {t('partner.figuresSource')}
                </p>

                <div className="max-w-3xl">
                    <p className="mt-8 text-secondary dark:text-slate-400">
                        {t('partner.areasIntro')}
                    </p>
                </div>

                <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                    {FOCUS_AREAS.map((area) => (
                        <div key={area.name}>
                            <dt className="font-semibold text-primary dark:text-slate-100">{area.name}</dt>
                            <dd className="text-sm text-secondary dark:text-slate-400 mt-0.5">{t(`partner.areas.${area.key}`)}</dd>
                        </div>
                    ))}
                </dl>

                <div className="max-w-3xl">
                    <p className="mt-8 text-secondary dark:text-slate-400">
                        {t('partner.testEnvironment')}
                    </p>

                    {/* Denne sektion er den korte udgave; /om-os er den lange.
                        Nøgletallene og de seks CO-områder bliver liggende her og
                        gentages bevidst ikke derovre. */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-3">
                        <Link to="/om-os" className="text-sm text-accent hover:underline">
                            {t('partner.moreAboutProject')}
                        </Link>

                        <a
                            href="https://corolab.dk/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                        >
                            {t('partner.readMoreCorolab')}
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}
