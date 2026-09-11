// src/components/landing/LandingCta.tsx
import { Link } from 'react-router-dom'
import { useGetSessionQuery } from '../../store/apis/authApi'

// Afsluttende opfordring, så man ikke skal scrolle op igen. Samme navy som
// footeren der følger lige under, så siden lukker i ét bånd.
//
// Bruges også af de offentlige undersider (/om-os, /kontakt, /hjaelp), som
// modsat forsiden ER tilgængelige for indloggede - og "Opret konto" giver
// ingen mening for en, der allerede har en. Gaten ligger derfor her, ét
// sted, i stedet for som en gentaget betingelse på hver side. Queryen er
// samme cache som App.tsx holder aktiv; ingen ekstra netværkskald.
export function LandingCta() {
    const { data: session } = useGetSessionQuery()

    if (session) {
        return null
    }

    return (
        <section className="bg-primary">
            <div className="max-w-7xl mx-auto px-6 py-16 text-center">
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100">
                    Kom i gang med Ponos
                </h2>
                <p className="mt-3 text-slate-300 max-w-xl mx-auto">
                    Opret en konto, og start din egen organisation eller bliv medlem af en, der
                    allerede findes.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
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
        </section>
    )
}
