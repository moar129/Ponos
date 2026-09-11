// src/components/landing/LandingPartner.tsx
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

// Hvem platformen laves for. Alt indhold her er faktuelt gengivet fra
// corolab.dk - ingen tal eller påstande der ikke står på deres egen side.
// Testmiljøet nævnes bevidst ikke ved navn, så forsiden ikke binder
// produktet til én case (Project.md §3.3).

// Corolabs egne nøgletal, som de står på corolab.dk. Alle er "mindst"-tal,
// så de ikke bliver forkerte af at siden her ikke opdaterer sig selv.
const KEY_FIGURES = [
    { value: '220+', label: 'Arrangementer' },
    { value: '21.500+', label: 'Deltagere' },
    { value: '200+', label: 'Projekter' },
    { value: '125+ mio. kr.', label: 'Rejst i finansiering' },
]

const FOCUS_AREAS = [
    { name: 'CO-meet', description: 'Faglige arrangementer og netværk.' },
    { name: 'CO-pilots', description: 'Fælles initiativer sat i gang sammen med medlemmerne.' },
    { name: 'CO-fund', description: 'Finansiering gennem medlemmer, fonde og offentlige puljer.' },
    { name: 'CO-creation', description: 'Projekter udviklet på tværs af sektorer.' },
    { name: 'CO-lab', description: 'Adgang til testmiljøer, faciliteter og delte ressourcer.' },
    { name: 'CO-branding', description: 'Synlighed om medlemmernes samfundsansvar.' },
]

export function LandingPartner() {
    return (
        <section className="bg-white border-t border-border-gray">
            <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                <div className="max-w-3xl">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-primary">Om projektet</h2>

                    <p className="mt-4 text-secondary">
                        Ponos udvikles for{' '}
                        <strong className="font-semibold text-primary">Corolab</strong>, en
                        medlemsdrevet non-profit i Roskilde. Siden 2016 har de samlet virksomheder,
                        uddannelser og offentlige organisationer om projekter, som ingen af dem kunne
                        løfte alene. Som de selv formulerer det: "I partnerskaber gør vi en forskel for
                        samfundet og din organisation."
                    </p>
                </div>

                {/* Nøgletal, ikke et diagram: fire selvstændige tal uden
                    sammenligning eller tidsserie. Værdien står i sans som
                    resten af UI'en - serif er forbeholdt PONOS-ordmærket. */}
                <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-6 rounded-lg bg-bg-gray/40 border border-border-gray p-6">
                    {KEY_FIGURES.map((figure) => (
                        <div key={figure.label}>
                            <span className="block text-2xl sm:text-3xl font-semibold text-primary">
                                {figure.value}
                            </span>
                            <span className="block text-sm text-secondary mt-1">{figure.label}</span>
                        </div>
                    ))}
                </div>

                <p className="mt-3 text-xs text-secondary">
                    Corolabs egne tal, hentet fra corolab.dk i september 2026.
                </p>

                <div className="max-w-3xl">
                    <p className="mt-8 text-secondary">
                        Arbejdet er delt op i seks områder, der spænder fra at skabe kontakterne til at
                        skaffe finansieringen og stille faciliteterne til rådighed.
                    </p>
                </div>

                <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                    {FOCUS_AREAS.map((area) => (
                        <div key={area.name}>
                            <dt className="font-semibold text-primary">{area.name}</dt>
                            <dd className="text-sm text-secondary mt-0.5">{area.description}</dd>
                        </div>
                    ))}
                </dl>

                <div className="max-w-3xl">
                    <p className="mt-8 text-secondary">
                        Det er testmiljøerne under CO-lab, Ponos bliver afprøvet i. Her skal platformen
                        håndtere en rigtig organisations ressourcer og opgaver frem for konstruerede
                        eksempler.
                    </p>

                    {/* Denne sektion er den korte udgave; /om-os er den lange.
                        Nøgletallene og de seks CO-områder bliver liggende her og
                        gentages bevidst ikke derovre. */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-3">
                        <Link to="/om-os" className="text-sm text-accent hover:underline">
                            Mere om projektet
                        </Link>

                        <a
                            href="https://corolab.dk/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                        >
                            Læs mere på corolab.dk
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}
