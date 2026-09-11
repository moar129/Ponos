// src/components/landing/LandingFlow.tsx
import { ArrowRight } from 'lucide-react'

// Sammenhængen (Project.md §1 + §3.1): det der adskiller Ponos fra et rent
// registreringssystem er, at data registreret ét sted bliver brugt videre i
// de næste led i stedet for at blive tastet ind igen.
const STEPS = ['Data', 'Mennesker', 'Opgaver', 'Indsigt']

export function LandingFlow() {
    return (
        <section className="bg-white">
            <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                <div className="max-w-3xl">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-primary">
                        Data der bliver brugt videre
                    </h2>
                    <p className="mt-4 text-secondary">
                        Ponos er ikke et arkiv. Det I registrerer ét sted, bliver brugt videre i næste
                        led. Et item i Datalageret er det samme item, som en opgave trækker på, og som
                        tæller med i statistikken.
                    </p>
                </div>

                {/* Kæden stables lodret på mobil; pilene roterer med, så de
                    stadig peger i læseretningen. */}
                <ol className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
                    {STEPS.map((step, index) => (
                        <li key={step} className="flex items-center gap-3">
                            <span className="rounded-lg border border-border-gray bg-white px-5 py-3 font-medium text-primary">
                                {step}
                            </span>
                            {index < STEPS.length - 1 && (
                                <ArrowRight
                                    aria-hidden="true"
                                    className="w-5 h-5 text-secondary shrink-0 rotate-90 sm:rotate-0"
                                />
                            )}
                        </li>
                    ))}
                </ol>

                <blockquote className="mt-10 border-l-4 border-accent bg-accent/10 rounded-r-md px-5 py-4 max-w-3xl">
                    <p className="text-primary">
                        I stedet for <em>"vi mangler noget, så køb nyt"</em> lægger Ponos op til{' '}
                        <em>"vi mangler noget, så lad os se hvad vi allerede har"</em>.
                    </p>
                </blockquote>
            </div>
        </section>
    )
}
