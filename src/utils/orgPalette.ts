import type { ThemeMode } from '../store/slices/themeSlice'
import type { BarPalette, OrganisationColors, OrgPalette } from '../types/organisation/organisationType'

// Ponos' own defaults (mirrors the @theme values in index.css).
export const DEFAULT_ACCENT = '#C7975D'
export const DEFAULT_BAR_COLOR = '#071B33'
export const DEFAULT_BAR_TEXT_COLOR = '#F1F5F9'

// Accent is used as text/links/icons on the page surface, so it must stand
// out from it. Light: 3:1 (WCAG minimum for UI components/large text), which
// keeps brand colors close to what was picked. Dark: 6:1 (above WCAG AA's
// 4.5:1), since dark accents like black still read as too dim at lower values.
const ACCENT_MIN_CONTRAST_LIGHT = 3
const ACCENT_MIN_CONTRAST_DARK = 6
// Header/footer text sits on its own bar color and must be normal-text readable.
const BAR_TEXT_MIN_CONTRAST = 4.5
// In dark mode, bars lighter than this are dimmed so they don't glare
// against the dark page (slate-900 has a luminance of ~0.01).
const DARK_BAR_MAX_LUMINANCE = 0.07

const SURFACE_LIGHT = '#FFFFFF' // bg-white
const SURFACE_DARK = '#1E293B' // slate-800, the lightest common dark surface (cards)
const NAVY = '#071B33'
const OFF_WHITE = '#F1F5F9'

type Hsl = { h: number; s: number; l: number }

function hexToRgb(hex: string): [number, number, number] {
    const num = parseInt(hex.replace('#', ''), 16)
    return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff]
}

function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c)))
    return `#${((clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).padStart(6, '0').toUpperCase()}`
}

function hexToHsl(hex: string): Hsl {
    const [r, g, b] = hexToRgb(hex).map((c) => c / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    if (max === min) return { h: 0, s: 0, l }

    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h: number
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    return { h: h / 6, s, l }
}

function hslToHex({ h, s, l }: Hsl): string {
    if (s === 0) return rgbToHex(l * 255, l * 255, l * 255)
    const hueToRgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    return rgbToHex(hueToRgb(p, q, h + 1 / 3) * 255, hueToRgb(p, q, h) * 255, hueToRgb(p, q, h - 1 / 3) * 255)
}

// Lightens/darkens a hex color by a percentage (-100 to 100).
function shadeHexColor(hex: string, percent: number): string {
    const amount = Math.round(2.55 * percent)
    const [r, g, b] = hexToRgb(hex)
    return rgbToHex(r + amount, g + amount, b + amount)
}

export function relativeLuminance(hex: string): number {
    const ch = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
    const [r, g, b] = hexToRgb(hex).map((c) => ch(c / 255))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
    const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
}

// Moves the HSL lightness (hue/saturation kept) the least amount needed to
// satisfy `test`. Luminance is monotonic in HSL lightness, so binary search works.
function searchLightness(hex: string, direction: 'lighten' | 'darken', test: (candidate: string) => boolean): string {
    if (test(hex)) return hex
    const hsl = hexToHsl(hex)
    // `near` fails the test, `far` passes it.
    let near = hsl.l
    let far = direction === 'lighten' ? 1 : 0
    for (let i = 0; i < 20; i++) {
        const mid = (near + far) / 2
        if (test(hslToHex({ ...hsl, l: mid }))) far = mid
        else near = mid
    }
    return hslToHex({ ...hsl, l: far })
}

function adjustForContrast(hex: string, surface: string, min: number, direction: 'lighten' | 'darken'): string {
    return searchLightness(hex, direction, (c) => contrastRatio(c, surface) >= min)
}

function capLuminance(hex: string, max: number): string {
    return searchLightness(hex, 'darken', (c) => relativeLuminance(c) <= max)
}

function textPairFor(hex: string) {
    const light = relativeLuminance(hex) > 0.45
    return {
        text: light ? NAVY : OFF_WHITE,
        muted: light ? '#3E5574' : '#CBD5E1',
        border: light ? 'rgba(7,27,51,0.15)' : 'rgba(255,255,255,0.15)',
    }
}

// Text on accent backgrounds (bg-accent): whichever of navy/off-white has
// the higher contrast.
function contrastTextFor(hex: string): string {
    return contrastRatio(hex, NAVY) >= contrastRatio(hex, OFF_WHITE) ? NAVY : OFF_WHITE
}

function buildBar(chosenBg: string, chosenText: string | null | undefined, mode: ThemeMode): BarPalette {
    const bg = mode === 'dark' ? capLuminance(chosenBg, DARK_BAR_MAX_LUMINANCE) : chosenBg
    const auto = textPairFor(bg)
    // The admin's text color is kept only if it's still readable on the
    // (possibly dimmed) bar - otherwise fall back to the automatic pair.
    if (chosenText && contrastRatio(chosenText, bg) >= BAR_TEXT_MIN_CONTRAST) {
        return {
            bg,
            text: chosenText,
            muted: `color-mix(in srgb, ${chosenText} 75%, transparent)`,
            border: auto.border,
        }
    }
    return { bg, ...auto }
}

// Derives the colors to render for one theme mode from the organisation's
// chosen colors. The admin picks one color per field; each mode gets a
// variant with the same hue whose lightness is nudged just enough to stay
// readable (e.g. a navy accent is lightened in dark mode, a yellow one
// darkened in light mode).
export function buildOrgPalette(colors: OrganisationColors | null | undefined, mode: ThemeMode): OrgPalette {
    const chosenAccent = colors?.color || DEFAULT_ACCENT
    const accent = mode === 'dark'
        ? adjustForContrast(chosenAccent, SURFACE_DARK, ACCENT_MIN_CONTRAST_DARK, 'lighten')
        : adjustForContrast(chosenAccent, SURFACE_LIGHT, ACCENT_MIN_CONTRAST_LIGHT, 'darken')

    return {
        accent,
        // Hover moves away from the surface so contrast never drops.
        accentHover: shadeHexColor(accent, mode === 'dark' ? 12 : -12),
        accentText: contrastTextFor(accent),
        header: buildBar(colors?.headerColor || DEFAULT_BAR_COLOR, colors?.headerTextColor, mode),
        footer: buildBar(colors?.footerColor || DEFAULT_BAR_COLOR, colors?.footerTextColor, mode),
    }
}

// CSS custom properties consumed by the Tailwind theme in index.css.
export function paletteToCssVars(p: OrgPalette): Record<string, string> {
    return {
        '--color-accent': p.accent,
        '--color-accent-hover': p.accentHover,
        '--color-accent-text': p.accentText,
        '--color-header-bg': p.header.bg,
        '--color-header-text': p.header.text,
        '--color-header-muted': p.header.muted,
        '--color-header-border': p.header.border,
        '--color-footer-bg': p.footer.bg,
        '--color-footer-text': p.footer.text,
        '--color-footer-muted': p.footer.muted,
        '--color-footer-border': p.footer.border,
    }
}
