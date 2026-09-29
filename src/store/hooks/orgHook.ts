// src/store/hooks/useOrganisationTheme.ts
import { useEffect } from 'react'
import { useGetMyOrganisationQuery } from '../apis/organisationApi'

const DEFAULT_ACCENT = '#C7975D'
const DEFAULT_BAR_COLOR = '#071B33'

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
function relativeLuminance(hex: string): number {
    const clean = hex.replace('#', '')
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255)
    const ch = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

function textPairFor(hex: string) {
    const light = relativeLuminance(hex) > 0.45
    return {
        text: light ? '#071B33' : '#F1F5F9',
        muted: light ? '#3E5574' : '#CBD5E1',
        border: light ? 'rgba(7,27,51,0.15)' : 'rgba(255,255,255,0.15)',
    }
}

// Text on accent backgrounds (bg-accent). Picks whichever of navy/white
// has the higher WCAG contrast, rather than textPairFor's fixed threshold,
// so the default gold keeps its navy text while e.g. a black accent gets white.
function contrastTextFor(hex: string): string {
    const lum = relativeLuminance(hex)
    const contrastNavy = (lum + 0.05) / (relativeLuminance('#071B33') + 0.05)
    const contrastWhite = (relativeLuminance('#F1F5F9') + 0.05) / (lum + 0.05)
    return contrastNavy >= contrastWhite ? '#071B33' : '#F1F5F9'
}

export function useOrganisationTheme() {
    const { data: organisation } = useGetMyOrganisationQuery()
    const accent = organisation?.color || DEFAULT_ACCENT
    const headerColor = organisation?.headerColor || DEFAULT_BAR_COLOR
    const footerColor = organisation?.footerColor || DEFAULT_BAR_COLOR

    useEffect(() => {
        const root = document.documentElement
        root.style.setProperty('--color-accent', accent)
        root.style.setProperty('--color-accent-hover', shadeHexColor(accent, -12))
        root.style.setProperty('--color-accent-text', contrastTextFor(accent))

        const h = textPairFor(headerColor)
        root.style.setProperty('--color-header-bg', headerColor)
        root.style.setProperty('--color-header-text', organisation?.headerTextColor || h.text)
        root.style.setProperty(
            '--color-header-muted',
            organisation?.headerTextColor
                ? `color-mix(in srgb, ${organisation.headerTextColor} 75%, transparent)`
                : h.muted,
        )
        root.style.setProperty('--color-header-border', h.border)

        const f = textPairFor(footerColor)
        root.style.setProperty('--color-footer-bg', footerColor)
        root.style.setProperty('--color-footer-text', organisation?.footerTextColor || f.text)
        root.style.setProperty(
            '--color-footer-muted',
            organisation?.footerTextColor
                ? `color-mix(in srgb, ${organisation.footerTextColor} 75%, transparent)`
                : f.muted,
        )
        root.style.setProperty('--color-footer-border', f.border)
    }, [accent, headerColor, footerColor, organisation?.headerTextColor, organisation?.footerTextColor])
}