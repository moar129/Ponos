// src/components/public/PageHero.tsx
import type { PageHeroProps } from '../../types/public/publicType'

// Titel-båndet på de offentlige undersider. Samme bg-primary som headeren,
// så de to flyder sammen til ét navy bånd - præcis som LandingHero gør.
// Bevidst IKKE samme komponent: her er hverken kompas-vandmærke eller
// CTA-knapper, og højden er lavere (py-14/16 mod hero'ens py-20/28), så en
// underside ikke ser ud som endnu en forside.
export function PageHero({ title, description }: PageHeroProps) {
    return (
        <section className="bg-primary">
            <div className="max-w-7xl mx-auto px-6 py-14 lg:py-16">
                <div className="max-w-3xl">
                    <h1 className="text-3xl sm:text-4xl font-serif font-semibold tracking-wide text-slate-100">
                        {title}
                    </h1>
                    <p className="mt-4 text-base sm:text-lg text-slate-300">{description}</p>
                </div>
            </div>
        </section>
    )
}
