// src/pages/public/HelpPage.tsx
import { UserPlus, Building2, Database } from 'lucide-react'
import { Link } from 'react-router-dom'
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

export default function HelpPage() {
    return (
        <>
            <PageHero
                title="Hjælp & support"
                description="Er du lige kommet i gang, eller er du kørt fast? Så er det her, du skal kigge først."
            />

            <section className="bg-white">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-primary">
                            Kom godt i gang
                        </h2>
                        <p className="mt-4 text-secondary">
                            Tre trin fra ny konto til noget, der rent faktisk står i systemet.
                        </p>
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <HelpStep
                            step={1}
                            icon={UserPlus}
                            title="Opret en konto"
                            description="Du skal bruge en email og en adgangskode. Kontoen er din egen og følger dig, uanset hvor mange organisationer du ender med at være med i."
                        />
                        <HelpStep
                            step={2}
                            icon={Building2}
                            title="Kom med i en organisation"
                            description="Opret din egen, eller bed om at komme med i en, der findes i forvejen. Næsten alt i Ponos hører til en organisation, så det her trin kan ikke springes over."
                        />
                        <HelpStep
                            step={3}
                            icon={Database}
                            title="Læg jeres ting ind"
                            description="Skriv jeres ressourcer ind i Datalageret, og opret de første opgaver. Statistikken begynder at regne af sig selv, så snart der er noget at regne på."
                        />
                    </div>

                    <Link
                        to="/signup"
                        className="mt-8 inline-flex items-center justify-center bg-accent text-primary rounded-md px-6 py-3 font-semibold hover:bg-accent-hover transition-colors"
                    >
                        Opret konto
                    </Link>
                </div>
            </section>

            <section className="bg-bg-gray/40 border-y border-border-gray">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-primary">
                            Det bliver vi oftest spurgt om
                        </h2>
                    </div>

                    <div className="mt-8 space-y-3 max-w-3xl">
                        <FaqItem question="Jeg er logget ind, men der er ingenting at se">
                            <p>
                                Det er dét, de fleste undrer sig over først - og der er ikke noget galt.
                                Opgaver, Statistik, Datalager og Nyheder hører til en organisation, så
                                indtil du har en aktiv organisation, er der ikke noget at vise. Derfor er
                                linkene heller ikke i menuen endnu.
                            </p>
                            <p>
                                Du kommer videre under{' '}
                                <Link
                                    to="/dashboard?tab=organisation"
                                    className="text-primary font-medium hover:underline"
                                >
                                    Dashboard → Organisation
                                </Link>
                                , hvor du enten opretter din egen eller beder om at komme med i en, der
                                findes.
                            </p>
                        </FaqItem>

                        <FaqItem question="Hvordan bliver jeg medlem af en organisation?">
                            <p>
                                Gå til Dashboard → Organisation, vælg "Anmod om medlemskab" og find
                                organisationen på listen. En administrator dér skal sige ja, før du er
                                inde.
                            </p>
                            <p>
                                Mens du venter, står der et banner øverst på siden. Bliver du i stedet
                                inviteret af en administrator, dukker invitationen op samme sted - så
                                skal du bare trykke acceptér.
                            </p>
                        </FaqItem>

                        <FaqItem question="Kan jeg være med i flere organisationer?">
                            <p>
                                Ja. Du har bare én <strong className="font-medium">aktiv</strong> ad
                                gangen, og alt hvad du ser - opgaver, ting, statistik, roller - hører til
                                netop den.
                            </p>
                            <p>
                                Du skifter under "Mine organisationer". Husk at dine rettigheder kan være
                                forskellige fra sted til sted: du kan sagtens være administrator det ene
                                sted og helt almindeligt medlem det andet.
                            </p>
                        </FaqItem>

                        <FaqItem question="Hvorfor kan jeg ikke oprette eller rette noget?">
                            <p>
                                Fordi din rolle ikke har lov til det endnu. Rettigheder sættes for hver
                                organisation for sig, og har du ikke lov til noget, viser vi slet ikke
                                knappen - i stedet for at lade dig opdage det, når du trykker.
                            </p>
                            <p>
                                Skal du kunne mere, er det jeres administrator, der kan give dig en rolle
                                med de rigtige rettigheder.
                            </p>
                        </FaqItem>

                        <FaqItem question="Hvordan inviterer jeg en ny bruger?">
                            <p>
                                Dashboard → Administration → Invitationer, og så personens email. Det
                                kræver, at du selv har lov til at invitere.
                            </p>
                            <p>
                                Personen skal have en Ponos-konto med netop den email i forvejen - vi
                                sender ikke invitationer ud til en email, der ikke findes i systemet. Har
                                de ingen konto endnu, må de oprette en først, og så kan du invitere dem
                                bagefter.
                            </p>
                        </FaqItem>

                        <FaqItem question="Hvordan forlader eller sletter jeg en organisation?">
                            <p>
                                Begge dele står under "Mine organisationer". Forlader du en, mens du er
                                med i flere, bliver en af de andre automatisk din nye aktive.
                            </p>
                            <p>
                                Er du den eneste administrator, kan du ikke bare gå - så ville der ikke
                                være nogen tilbage til at styre den. Giv en anden administratorrollen
                                først. Og at <strong className="font-medium">slette</strong> en
                                organisation fjerner alt, hvad den indeholder, også for de andre
                                medlemmer. Det kan kun en administrator.
                            </p>
                        </FaqItem>

                        <FaqItem question="Hvordan retter jeg mit navn eller profilbillede?">
                            <p>
                                På{' '}
                                <Link to="/bruger" className="text-primary font-medium hover:underline">
                                    din profil
                                </Link>
                                . Navn, beskrivelse, billede og adgangskode kan du selv rette. Email og
                                rolle kan du ikke - rollen hører til organisationen, og den er det en
                                administrator, der giver dig.
                            </p>
                        </FaqItem>

                        <FaqItem question="Jeg har glemt min adgangskode">
                            <p>
                                Klik{' '}
                                <Link
                                    to="/glemt-adgangskode"
                                    className="text-primary font-medium hover:underline"
                                >
                                    "Glemt din adgangskode?"
                                </Link>{' '}
                                på loginsiden. Du bekræfter kontoen med din email og dit navn og vælger
                                en ny adgangskode med det samme.
                            </p>
                            <p>
                                Driller det, skriver du til{' '}
                                <a
                                    href={`mailto:${CONTACT_EMAIL}`}
                                    className="text-primary font-medium hover:underline"
                                >
                                    {CONTACT_EMAIL}
                                </a>
                                , så hjælper vi dig ind igen.
                            </p>
                        </FaqItem>
                    </div>

                    <div className="mt-10 max-w-3xl">
                        <p className="text-secondary">
                            Fandt du ikke svaret?{' '}
                            <Link to="/kontakt" className="text-primary font-medium hover:underline">
                                Skriv til os
                            </Link>{' '}
                            - fortæl gerne, hvad du var i gang med, og hvad der skete i stedet.
                        </p>
                    </div>
                </div>
            </section>

            <LandingCta />
        </>
    )
}
