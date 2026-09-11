// src/components/landing/LandingHero.tsx
import { Link } from 'react-router-dom'
import compass from '../../assets/logo/ponos_compass.svg'

// Forsidens hero. Går kant-til-kant i samme bg-primary som headeren, så de
// to flyder sammen til ét navy bånd. Kompasset ligger som svagt vandmærke
// bag teksten - guld på transparent, tegnet til netop denne baggrund.
export function LandingHero() {
    return (
        <section className="relative bg-primary overflow-hidden">
            {/* Rent dekorativt: skjult for skærmlæsere, og pointer-events-none
                så det aldrig stjæler klik fra knapperne. */}
            <img
                src={compass}
                alt=""
                aria-hidden="true"
                className="pointer-events-none select-none absolute -right-20 -bottom-24 w-[28rem] opacity-10 hidden md:block"
            />

            <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28">
                <div className="max-w-3xl">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold tracking-wide text-slate-100 leading-tight">
                        Se hvad I har. <br className="hidden sm:block" />{' '} 
                        Se hvem der gør hvad.<br className="hidden sm:block" />{' '}
                        Se hvad jeres data fortæller.
                    </h1>

                    <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl">
                        Ponos samler organisationens ressourcer, opgaver og indsigt ét sted. Så ved I
                        altid hvad I har, hvem der er ansvarlig, og hvad tallene fortæller jer.
                    </p>

                    <div className="mt-9 flex flex-col sm:flex-row gap-3">
                        <Link
                            to="/signup"
                            className="inline-flex items-center justify-center bg-accent text-primary rounded-md px-6 py-3 font-semibold hover:bg-accent-hover transition-colors"
                        >
                            Opret konto
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center rounded-md border border-slate-600 px-6 py-3 font-medium text-slate-200 hover:bg-slate-800/50 hover:text-white transition-colors"
                        >
                            Log ind
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
