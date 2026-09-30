// src/components/landing/LandingHero.tsx
import { useTranslation } from 'react-i18next'
import compass from '../../assets/logo/ponos_compass.svg'
import { LandingAuthButtons } from './LandingAuthButtons'

// Forsidens hero. Går kant-til-kant i samme bg-primary som headeren, så de
// to flyder sammen til ét navy bånd. Kompasset ligger som svagt vandmærke
// bag teksten - guld på transparent, tegnet til netop denne baggrund.
export function LandingHero() {
    const { t } = useTranslation('public')

    return (
        <section className="relative bg-primary overflow-hidden">
            <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28">
                {/* Rent dekorativt: skjult for skærmlæsere, og pointer-events-none
                    så det aldrig stjæler klik fra knapperne. Placeret i
                    indholds-containeren, så det følger teksten på ultrawide
                    i stedet for at klæbe til skærmkanten. */}
                <img
                    src={compass}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none select-none absolute -right-20 -bottom-24 w-[28rem] opacity-10 hidden md:block"
                />

                <div className="relative max-w-3xl">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold tracking-wide text-slate-100 leading-tight">
                        {t('hero.line1')} <br className="hidden sm:block" />{' '}
                        {t('hero.line2')}<br className="hidden sm:block" />{' '}
                        {t('hero.line3')}
                    </h1>

                    <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl">
                        {t('hero.intro')}
                    </p>

                    <LandingAuthButtons className="mt-9" />
                </div>
            </div>
        </section>
    )
}
