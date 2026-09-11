// src/pages/public/AboutPage.tsx
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHero } from '../../components/public/PageHero'
import { LandingCta } from '../../components/landing/LandingCta'

// Offentlig side på /om-os. Modsat forsiden, der forklarer HVAD Ponos er,
// handler denne om HVORFOR den findes og hvordan der er tænkt undervejs.
// Ligger uden for <main>'ens max-w-7xl-wrapper (se FULL_WIDTH_ROUTES i
// App.tsx), så hver sektion selv går kant-til-kant.
//
// Bevidst INGEN redirect for indloggede: siden er offentlig for alle. Det
// er LandingCta der selv gemmer sig, når man er logget ind.

// Principperne bag produktet (Project.md §3 og §5). Samme <dl>-mønster som
// LandingPartners fokusområder, så de to lister ser ud af samme familie.
const PRINCIPLES = [
    {
        name: 'Bygget til flere end én',
        description:
            'Ponos er lavet til organisationer i flertal. Den første, der bruger den, er et eksempel - ikke facitlisten. Intet er skruet sammen om én bestemt måde at gøre tingene på.',
    },
    {
        name: 'Skriv det én gang',
        description:
            'Det I skriver ind ét sted, bliver brugt videre. En ting i Datalageret er den samme ting, en opgave trækker på - ikke en kopi, I skal huske at rette to steder.',
    },
    {
        name: 'Tallene passer sig selv',
        description:
            'Statistikken regnes ud fra det, I allerede har skrevet ind. Der er ingen felter til at taste nøgletal i, og derfor heller ingen tal, der er forældede, før de er skrevet færdig.',
    },
    {
        name: 'Jeres data er jeres',
        description:
            'Hver organisation ser kun sit eget, og det bliver afgjort i databasen - ikke ved at gemme en knap væk. Hvem der må ændre hvad, bestemmer I selv med roller.',
    },
]

export default function AboutPage() {
    return (
        <>
            <PageHero
                title="Om os"
                description="Vi bygger Ponos, så en organisation kan svare på tre ret enkle spørgsmål uden først at skulle spørge sig frem."
            />

            <section className="bg-white">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-primary">
                            Hvorfor vi går op i det
                        </h2>

                        <p className="mt-4 text-secondary">
                            De fleste organisationer ved godt, hvad de har. Det står bare i et regneark
                            hos én, i en mailtråd hos en anden og i hovedet på en tredje. Så længe alle
                            er på arbejde, går det fint. Det er når nogen holder ferie, skifter job,
                            eller alting skal stables på benene i en fart, at det begynder at gøre ondt.
                        </p>

                        <p className="mt-4 text-secondary">
                            Og det gør ondt på helt konkrete måder. Der bliver købt ting ind, som I
                            allerede ejer, fordi ingen nåede at finde ud af, hvor de stod. Opgaver
                            bliver liggende, fordi det aldrig blev sagt højt, hvem der havde dem. Og når
                            nogen spørger, hvordan det går, bliver svaret et gæt.
                        </p>

                        <p className="mt-4 text-secondary">
                            Ponos samler de tre ting ét sted: hvad I har, hvem der gør hvad, og hvad
                            tallene siger. Ikke tre systemer ved siden af hinanden - de samme data set
                            fra tre sider.
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-bg-gray/40 border-y border-border-gray">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-primary">
                            Sådan tænker vi
                        </h2>
                        <p className="mt-4 text-secondary">
                            Fire ting har afgjort de fleste valg undervejs.
                        </p>
                    </div>

                    <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        {PRINCIPLES.map((principle) => (
                            <div key={principle.name}>
                                <dt className="font-semibold text-primary">{principle.name}</dt>
                                <dd className="text-sm text-secondary mt-1">{principle.description}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            <section className="bg-white">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-primary">
                            Hvem der står bag
                        </h2>

                        <p className="mt-4 text-secondary">
                            Ponos bliver til som et studieprojekt sammen med{' '}
                            <strong className="font-semibold text-primary">Corolab</strong>, en
                            medlemsdrevet non-profit i Roskilde, der siden 2016 har samlet
                            virksomheder, uddannelser og offentlige organisationer om projekter, ingen
                            af dem kunne løfte alene.
                        </p>

                        <p className="mt-4 text-secondary">
                            Det betyder, at platformen bliver prøvet af på en rigtig organisations ting
                            og opgaver i stedet for på eksempler, vi selv har fundet på. Det er den
                            slags brug, der afslører, om noget holder: de tilfælde ingen havde regnet
                            med, og de steder hvor virkeligheden ikke lige passer ned i felterne.
                        </p>

                        <p className="mt-4 text-secondary">
                            Har du spørgsmål til projektet, eller kunne du tænke dig at prøve Ponos af
                            hos jer, hører vi gerne fra dig.
                        </p>

                        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-3">
                            <a
                                href="https://corolab.dk/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                            >
                                Læs mere på corolab.dk
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            </a>

                            <Link to="/kontakt" className="text-sm text-accent hover:underline">
                                Skriv til os
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <LandingCta />
        </>
    )
}
