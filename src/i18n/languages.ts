// src/i18n/languages.ts
//
// Registret over understøttede sprog. Dette er DET ENESTE sted et sprog
// tilføjes eller fjernes: tilføj en linje her + en mappe under
// locales/<code>/ med de 14 namespace-filer, så er sproget med i både
// header-vælgeren og profilsidens "Visning"-afsnit.
//
// 14 af EU's 24 officielle sprog. Ti er bevidst udeladt, fordi vi ikke
// kunne levere dem i en kvalitet vi kan stå inde for - og ingen på holdet
// kan læse korrektur på dem:
//   mt maltesisk, ga irsk, et estisk, lv lettisk, lt litauisk
//   bg bulgarsk, el græsk, hr kroatisk, sl slovensk, sk slovakisk
// Et udeladt sprog koster én linje her + en mappe under locales/ at
// tilføje igen - ingen kodeændringer andre steder.
//
// VIGTIGT: sproglisten er dubleret i index.html's pre-hydration-script
// (det kan ikke importere fra src/). Tilføjes et sprog her, skal koden
// også med i SUPPORTED-listen i det script.

export interface Language {
  /** BCP 47 primær-subtag, fx 'da'. Bruges som locale til Intl. */
  code: string
  /** Sprogets eget navn - det brugeren ser i vælgeren. */
  nativeName: string
  /** Engelsk navn, vist dæmpet som hjælp til at finde sit sprog. */
  englishName: string
}

export const LANGUAGES: Language[] = [
  { code: 'cs', nativeName: 'Čeština', englishName: 'Czech' },
  { code: 'da', nativeName: 'Dansk', englishName: 'Danish' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German' },
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish' },
  { code: 'fi', nativeName: 'Suomi', englishName: 'Finnish' },
  { code: 'fr', nativeName: 'Français', englishName: 'French' },
  { code: 'hu', nativeName: 'Magyar', englishName: 'Hungarian' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian' },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch' },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese' },
  { code: 'ro', nativeName: 'Română', englishName: 'Romanian' },
  { code: 'sv', nativeName: 'Svenska', englishName: 'Swedish' },
]

/** Standardsprog når browserens sprog ikke er i registret. */
export const DEFAULT_LANGUAGE = 'da'

export const LANGUAGE_CODES: string[] = LANGUAGES.map((l) => l.code)

export function isSupportedLanguage(code: string): boolean {
  return LANGUAGE_CODES.includes(code)
}

/**
 * Finder et sprog i registret. Bruges af vælgerne til at vise det aktive
 * sprogs navn; falder tilbage til dansk, så kaldere slipper for null-tjek.
 */
export function getLanguage(code: string): Language {
  return (
    LANGUAGES.find((l) => l.code === code) ??
    LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE)!
  )
}

/**
 * Oversætter en browser-sprogkode til en af vores. Håndterer regionale
 * varianter ('de-AT' -> 'de'), som navigator.language ofte leverer.
 * Returnerer null hvis sproget ikke støttes, så kalderen selv bestemmer
 * fallback.
 */
export function matchBrowserLanguage(browserLanguage: string | undefined): string | null {
  if (!browserLanguage) return null
  const primary = browserLanguage.toLowerCase().split('-')[0]
  return isSupportedLanguage(primary) ? primary : null
}
