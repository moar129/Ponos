// src/pages/public/HelpPage.tsx
import { UserPlus, Building2, Database } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { PageHero } from '../../components/public/PageHero'
import { HelpStep } from '../../components/public/HelpStep'
import { FaqItem } from '../../components/public/FaqItem'
import { LandingCta } from '../../components/landing/LandingCta'
import { CONTACT_EMAIL } from '../../lib/contact'

// Offentlig side på /hjaelp. Svarene her beskriver appens FAKTISKE adfærd
// (aktiv organisation, privilegier, medlemskaber) - de er skrevet ud fra
// koden, ikke ud fra hvordan det burde virke. Retter man adfærden et sted,
// skal svaret her rettes med.
//
// Bemærk: flere svar linker til beskyttede ruter (/dashboard, /bruger). En
// udlogget læser bliver sendt til /login af ProtectedRoute, som ikke husker
// destinationen - login er det rigtige næste skridt for dem alligevel.
//
// Svarene indeholder links midt i sætningen, så de bruger <Trans> med
// navngivne slots i stedet for at blive klippet i stumper - ordstillingen
// er forskellig fra sprog til sprog, og et link skal kunne flytte med.

const linkClass = 'text-primary dark:text-slate-100 font-medium hover:underline'

export default function HelpPage() {
    const { t } = useTranslation('public')

    return (
        <>
            <PageHero
                title={t('help.heroTitle')}
                description={t('help.heroDescription')}
            />

            <section className="bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">
                            {t('help.startTitle')}
                        </h2>
                        <p className="mt-4 text-secondary dark:text-slate-400">
                            {t('help.startIntro')}
                        </p>
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <HelpStep
                            step={1}
                            icon={UserPlus}
                            title={t('help.steps.account.title')}
                            description={t('help.steps.account.description')}
                        />
                        <HelpStep
                            step={2}
                            icon={Building2}
                            title={t('help.steps.organisation.title')}
                            description={t('help.steps.organisation.description')}
                        />
                        <HelpStep
                            step={3}
                            icon={Database}
                            title={t('help.steps.data.title')}
                            description={t('help.steps.data.description')}
                        />
                    </div>

                    <Link
                        to="/signup"
                        className="mt-8 inline-flex items-center justify-center bg-accent text-primary rounded-md px-6 py-3 font-semibold hover:bg-accent-hover transition-colors"
                    >
                        {t('cta.signup')}
                    </Link>
                </div>
            </section>

            <section className="bg-bg-gray/40 dark:bg-slate-800/40 border-y border-border-gray dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-primary dark:text-slate-100">
                            {t('help.faqTitle')}
                        </h2>
                    </div>

                    <div className="mt-8 space-y-3 max-w-3xl">
                        <FaqItem question={t('help.faq.nothingToSee.q')}>
                            <p>{t('help.faq.nothingToSee.a1')}</p>
                            <p>
                                <Trans
                                    ns="public"
                                    i18nKey="help.faq.nothingToSee.a2"
                                    components={{
                                        orgLink: <Link to="/dashboard?tab=organisation" className={linkClass} />,
                                    }}
                                />
                            </p>
                        </FaqItem>

                        <FaqItem question={t('help.faq.becomeMember.q')}>
                            <p>{t('help.faq.becomeMember.a1')}</p>
                            <p>{t('help.faq.becomeMember.a2')}</p>
                        </FaqItem>

                        <FaqItem question={t('help.faq.multipleOrgs.q')}>
                            <p>
                                <Trans
                                    ns="public"
                                    i18nKey="help.faq.multipleOrgs.a1"
                                    components={{ b: <strong className="font-medium" /> }}
                                />
                            </p>
                            <p>{t('help.faq.multipleOrgs.a2')}</p>
                        </FaqItem>

                        <FaqItem question={t('help.faq.cannotEdit.q')}>
                            <p>{t('help.faq.cannotEdit.a1')}</p>
                            <p>{t('help.faq.cannotEdit.a2')}</p>
                        </FaqItem>

                        <FaqItem question={t('help.faq.invite.q')}>
                            <p>{t('help.faq.invite.a1')}</p>
                            <p>{t('help.faq.invite.a2')}</p>
                        </FaqItem>

                        <FaqItem question={t('help.faq.leaveOrDelete.q')}>
                            <p>{t('help.faq.leaveOrDelete.a1')}</p>
                            <p>
                                <Trans
                                    ns="public"
                                    i18nKey="help.faq.leaveOrDelete.a2"
                                    components={{ b: <strong className="font-medium" /> }}
                                />
                            </p>
                        </FaqItem>

                        <FaqItem question={t('help.faq.editProfile.q')}>
                            <p>
                                <Trans
                                    ns="public"
                                    i18nKey="help.faq.editProfile.a1"
                                    components={{ profileLink: <Link to="/bruger" className={linkClass} /> }}
                                />
                            </p>
                        </FaqItem>

                        <FaqItem question={t('help.faq.forgotPassword.q')}>
                            <p>
                                <Trans
                                    ns="public"
                                    i18nKey="help.faq.forgotPassword.a1"
                                    components={{
                                        resetLink: <Link to="/glemt-adgangskode" className={linkClass} />,
                                    }}
                                />
                            </p>
                            <p>
                                <Trans
                                    ns="public"
                                    i18nKey="help.faq.forgotPassword.a2"
                                    values={{ email: CONTACT_EMAIL }}
                                    components={{
                                        mailLink: <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass} />,
                                    }}
                                />
                            </p>
                        </FaqItem>
                    </div>

                    <div className="mt-10 max-w-3xl">
                        <p className="text-secondary dark:text-slate-400">
                            <Trans
                                ns="public"
                                i18nKey="help.noAnswer"
                                components={{ contactLink: <Link to="/kontakt" className={linkClass} /> }}
                            />
                        </p>
                    </div>
                </div>
            </section>

            <LandingCta />
        </>
    )
}
