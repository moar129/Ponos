import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

// De offentlige undersiders navy titel-bånd (/om-os, /kontakt, /hjaelp).
// Modsat LandingHero har den hverken vandmærke eller CTA-knapper - den
// navngiver kun siden, så den ikke konkurrerer med forsidens hero.
export interface PageHeroProps {
    title: string
    description: string
}

// Et trin i "Kom godt i gang" på /hjaelp. 'step' er det viste tal -
// rækkefølgen er en del af indholdet, ikke bare en liste-styling.
export interface HelpStepProps {
    step: number
    title: string
    description: string
    icon: LucideIcon
}

// En FAQ-post på /hjaelp. Svaret er ReactNode og ikke string, fordi
// flere af svarene indeholder links ind i appen.
export interface FaqItemProps {
    question: string
    children: ReactNode
}
