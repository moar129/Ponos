// src/store/hooks/useOrganisationTheme.ts
import { useEffect } from 'react'
import { useGetMyOrganisationQuery } from '../apis/organisationApi'

const DEFAULT_ACCENT = '#C7975D'

// Justerer en hex-farve lysere/mørkere med en procentdel (-100 til 100).
// Bruges til at udlede en hover-nuance af organisationens farve, samme
// forhold som --color-accent-hover er til --color-accent i index.css.
function shadeHexColor(hex: string, percent: number): string {
    const clean = hex.replace('#', '')
    const num = parseInt(clean, 16)
    const amount = Math.round(2.55 * percent)

    let r = (num >> 16) + amount
    let g = ((num >> 8) & 0x00ff) + amount
    let b = (num & 0x0000ff) + amount

    r = Math.max(Math.min(255, r), 0)
    g = Math.max(Math.min(255, g), 0)
    b = Math.max(Math.min(255, b), 0)

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// Organisationens valgte farve (sat i OrganisationAdminPanel.tsx) bliver
// ellers kun vist som en prik i administrationen - den bruges ingen steder
// i selve UI'et. Denne hook sætter --color-accent (og en afledt
// --color-accent-hover) som CSS-variabler på <html>, så Tailwinds
// bg-accent/text-accent/border-accent-klasser (defineret via var() i
// index.css) automatisk skifter til organisationens farve overalt på
// siden. Falder tilbage til Ponos' egen standardfarve, hvis organisationen
// ikke har valgt en, eller ingen organisation er aktiv.
export function useOrganisationTheme() {
    const { data: organisation } = useGetMyOrganisationQuery()
    const accent = organisation?.color || DEFAULT_ACCENT

    useEffect(() => {
        const root = document.documentElement
        root.style.setProperty('--color-accent', accent)
        root.style.setProperty('--color-accent-hover', shadeHexColor(accent, -12))
    }, [accent])
}