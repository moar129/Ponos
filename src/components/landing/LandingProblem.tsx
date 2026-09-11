// src/components/landing/LandingProblem.tsx

// "Hvorfor" - problemet Ponos løser (Project.md §2). Holdt kort: det er
// rammen om hovedområde-afsnittet, ikke omvendt.
export function LandingProblem() {
    return (
        <section className="bg-white">
            <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                <div className="max-w-3xl">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-primary">
                        Overblikket ligger spredt
                    </h2>
                    <p className="mt-4 text-secondary">
                        Organisationer håndterer data og arbejdsopgaver på tværs af separate systemer.
                        Det gør det svært at svare på selv simple spørgsmål: Hvilke ressourcer har vi
                        allerede? Hvor befinder de sig? Hvem er ansvarlig for opgaven?
                    </p>
                </div>
            </div>
        </section>
    )
}
