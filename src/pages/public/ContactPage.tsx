// src/pages/public/ContactPage.tsx
import { Mail, MapPin, Send, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHero } from '../../components/public/PageHero'
import { LandingCta } from '../../components/landing/LandingCta'
import { CONTACT_EMAIL, CONTACT_LOCATION } from '../../lib/contact'

// Offentlig side på /kontakt. Bevidst uden formular: der findes ingen
// modtager-tabel og ingen mail-backend, og en formular der lover et svar,
// den ikke kan levere, er værre end en adresse man kan skrive til.
// Oplysningerne kommer fra lib/contact.ts, som footeren også bruger.

const TOPIC_KEYS = ['fit', 'bug', 'collaboration'] as const

export default function ContactPage() {
    const { t } = useTranslation('public')

    return (
        <>
            <PageHero
                title={t('contact.heroTitle')}
                description={t('contact.heroDescription')}
            />

            <section className="bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 max-w-4xl">
                        <div>
                            <h2 className="text-xl font-semibold text-primary dark:text-slate-100">{t('contact.howToReach')}</h2>

                            {/* Samme to ikoner som footerens kontaktkolonne, så det
                                er tydeligt at det er de samme oplysninger. */}
                            <ul className="mt-5 space-y-4">
                                <li className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-secondary dark:text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-secondary dark:text-slate-400">{t('contact.emailLabel')}</p>
                                        <a
                                            href={`mailto:${CONTACT_EMAIL}`}
                                            className="font-medium text-primary dark:text-slate-100 hover:underline"
                                        >
                                            {CONTACT_EMAIL}
                                        </a>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-secondary dark:text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-secondary dark:text-slate-400">{t('contact.locationLabel')}</p>
                                        <p className="font-medium text-primary dark:text-slate-100">{CONTACT_LOCATION}</p>
                                    </div>
                                </li>
                            </ul>

                            {/* Samme guld-knap som forsidens hero-CTA, så den primære
                                handling ser ens ud på tværs af de offentlige sider. */}
                            <a
                                href={`mailto:${CONTACT_EMAIL}`}
                                className="mt-7 inline-flex items-center justify-center gap-2 bg-accent text-primary rounded-md px-6 py-3 font-semibold hover:bg-accent-hover transition-colors"
                            >
                                <Send className="w-4 h-4 shrink-0" />
                                {t('contact.sendMail')}
                            </a>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-primary dark:text-slate-100">{t('contact.topicsTitle')}</h2>

                            <ul className="mt-5 space-y-3">
                                {TOPIC_KEYS.map((topic) => (
                                    <li key={topic} className="flex items-start gap-3 text-secondary dark:text-slate-400">
                                        <span
                                            aria-hidden="true"
                                            className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2"
                                        />
                                        <span>{t(`contact.topics.${topic}`)}</span>
                                    </li>
                                ))}
                            </ul>

                            <p className="mt-5 text-secondary dark:text-slate-400">
                                {t('contact.responseNote')}
                            </p>
                        </div>
                    </div>

                    {/* De fleste henvendelser om "hvordan gør jeg X" er allerede
                        besvaret - send dem derhen først. Samme accent-boks som
                        forsidens LandingFlow bruger til sin pointe. */}
                    <div className="mt-12 border-l-4 border-accent bg-accent/10 rounded-r-md px-5 py-4 max-w-3xl">
                        <p className="text-primary dark:text-slate-100 flex items-start gap-3">
                            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-accent" />
                            <span>
                                {t('contact.helpHintBefore')}{' '}
                                <Link to="/hjaelp" className="font-medium underline">
                                    {t('contact.helpHintLink')}
                                </Link>
                                .
                            </span>
                        </p>
                    </div>
                </div>
            </section>

            <LandingCta />
        </>
    )
}
