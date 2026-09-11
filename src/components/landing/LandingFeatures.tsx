// src/components/landing/LandingFeatures.tsx
import { Database, ClipboardList, BarChart3 } from 'lucide-react'
import { LandingFeatureCard } from './LandingFeatureCard'

// Platformens tre hovedområder (Project.md §4-6). Det bærende afsnit på
// forsiden - det er her læseren faktisk forstår hvad Ponos er. Samme tre
// områder og ikoner som dashboardets genvejskort, så siderne genkendes igen
// når brugeren er logget ind.
export function LandingFeatures() {
    return (
        <section className="bg-bg-gray/40 border-y border-border-gray">
            <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                <div className="max-w-3xl">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-primary">
                        Tre spørgsmål, ét sted
                    </h2>
                    <p className="mt-4 text-secondary">
                        Ponos er bygget op om de tre spørgsmål, enhver organisation skal kunne svare
                        på om sig selv.
                    </p>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <LandingFeatureCard
                        icon={Database}
                        label="Datalager"
                        question="Hvad har vi?"
                        description="Registrér jeres ressourcer med antal, kategori, status og lokation. Så kan I altid se hvad I har, og hvor det står."
                    />
                    <LandingFeatureCard
                        icon={ClipboardList}
                        label="Opgaver"
                        question="Hvem gør hvad?"
                        description="Hver opgave har en ansvarlig, deltagere, status og de ting den bruger. Arbejdet hænger sammen med de ressourcer, det faktisk trækker på."
                    />
                    <LandingFeatureCard
                        icon={BarChart3}
                        label="Statistik"
                        question="Hvad fortæller vores data?"
                        description="Tallene regnes ud fra det, I allerede har registreret. Ingen manuel indtastning, og ingen tal der er forældede i samme øjeblik de er skrevet ned."
                    />
                </div>
            </div>
        </section>
    )
}
