// src/pages/public/ContactPage.tsx
import { Mail, MapPin, Send, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHero } from '../../components/public/PageHero'
import { LandingCta } from '../../components/landing/LandingCta'
import { CONTACT_EMAIL, CONTACT_LOCATION } from '../../lib/contact'

// Offentlig side på /kontakt. Bevidst uden formular: der findes ingen
// modtager-tabel og ingen mail-backend, og en formular der lover et svar,
// den ikke kan levere, er værre end en adresse man kan skrive til.
// Oplysningerne kommer fra lib/contact.ts, som footeren også bruger.

const TOPICS = [
    'Hvad Ponos kan, og om det passer til jer',
    'Noget der ikke virker, som det skal',
    'Samarbejde, eller lyst til at prøve det af hos jer',
]

export default function ContactPage() {
    return (
        <>
            <PageHero
                title="Kontakt"
                description="Har du et spørgsmål, er du stødt på noget, der driller, eller vil du bare høre mere? Så skriv endelig."
            />

            <section className="bg-white">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 max-w-4xl">
                        <div>
                            <h2 className="text-xl font-semibold text-primary">Sådan får du fat i os</h2>

                            {/* Samme to ikoner som footerens kontaktkolonne, så det
                                er tydeligt at det er de samme oplysninger. */}
                            <ul className="mt-5 space-y-4">
                                <li className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-secondary">Email</p>
                                        <a
                                            href={`mailto:${CONTACT_EMAIL}`}
                                            className="font-medium text-primary hover:underline"
                                        >
                                            {CONTACT_EMAIL}
                                        </a>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-secondary">Vi holder til i</p>
                                        <p className="font-medium text-primary">{CONTACT_LOCATION}</p>
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
                                Send en mail
                            </a>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-primary">Du må gerne skrive om</h2>

                            <ul className="mt-5 space-y-3">
                                {TOPICS.map((topic) => (
                                    <li key={topic} className="flex items-start gap-3 text-secondary">
                                        <span
                                            aria-hidden="true"
                                            className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2"
                                        />
                                        <span>{topic}</span>
                                    </li>
                                ))}
                            </ul>

                            <p className="mt-5 text-secondary">
                                Vi læser med på hverdage og svarer, så hurtigt vi kan. Skriv gerne,
                                hvilken organisation det handler om, og hvad du var i gang med - så
                                slipper vi for at spørge om det først.
                            </p>
                        </div>
                    </div>

                    {/* De fleste henvendelser om "hvordan gør jeg X" er allerede
                        besvaret - send dem derhen først. Samme accent-boks som
                        forsidens LandingFlow bruger til sin pointe. */}
                    <div className="mt-12 border-l-4 border-accent bg-accent/10 rounded-r-md px-5 py-4 max-w-3xl">
                        <p className="text-primary flex items-start gap-3">
                            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-accent" />
                            <span>
                                Skal du bare bruge at vide, hvordan noget virker? Så står svaret måske
                                allerede på{' '}
                                <Link to="/hjaelp" className="font-medium underline">
                                    Hjælp &amp; support
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
