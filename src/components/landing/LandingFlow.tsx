// src/components/landing/LandingFlow.tsx
import { ArrowRight } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

// Sammenhængen (Project.md §1 + §3.1): det der adskiller Ponos fra et rent
// registreringssystem er, at data registreret ét sted bliver brugt videre i
// de næste led i stedet for at blive tastet ind igen.
//
// Trinnene holdes som stabile nøgler, ikke som oversat tekst - arrayet ligger
// på modulniveau, hvor t() ikke findes, og rækkefølgen er den samme på alle
// sprog.
const STEP_KEYS = ['data', 'people', 'tasks', 'insight'] as const

export function LandingFlow() {
    const { t } = useTranslation('public')

    return (
        <section className="bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                <div className="max-w-3xl">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">
                        {t('flow.title')}
                    </h2>
                    <p className="mt-4 text-secondary dark:text-slate-400">
                        {t('flow.body')}
                    </p>
                </div>

                {/* Kæden stables lodret på mobil; pilene roterer med, så de
                    stadig peger i læseretningen. */}
                <ol className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
                    {STEP_KEYS.map((stepKey, index) => (
                        <li key={stepKey} className="flex items-center gap-3">
                            <span className="rounded-lg border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 font-medium text-primary dark:text-slate-100">
                                {t(`flow.steps.${stepKey}`)}
                            </span>
                            {index < STEP_KEYS.length - 1 && (
                                <ArrowRight
                                    aria-hidden="true"
                                    className="w-5 h-5 text-secondary dark:text-slate-400 shrink-0 rotate-90 sm:rotate-0"
                                />
                            )}
                        </li>
                    ))}
                </ol>

                <blockquote className="mt-10 border-l-4 border-accent bg-accent/10 rounded-r-md px-5 py-4 max-w-3xl">
                    <p className="text-primary dark:text-slate-100">
                        <Trans
                            ns="public"
                            i18nKey="flow.quote"
                            components={{ em: <em /> }}
                        />
                    </p>
                </blockquote>
            </div>
        </section>
    )
}
