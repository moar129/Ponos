// src/utils/formatDate.ts
//
// Ét sted til dato- og talformatering. Før lå der 14 hardkodede
// 'da-DK'-kald spredt over 11 filer, og formatDate var genopfundet
// lokalt 10 gange - de kunne ikke følge et sprogskift.
//
// Hvor det er muligt bruges dateStyle/timeStyle frem for enkeltfelter:
// Intl sætter så selv de sproglige bindeled (dansk "kl.", tysk "um"),
// som vi ellers selv skulle oversætte.

import i18n from '../i18n/config'
import { DEFAULT_LANGUAGE } from '../i18n/languages'

function currentLocale(): string {
  return i18n.language || DEFAULT_LANGUAGE
}

/** Lang dato, fx "5. marts 2026". */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(currentLocale(), { dateStyle: 'long' })
}

/** Lang dato + klokkeslæt, fx "5. marts 2026 kl. 14.30". */
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(currentLocale(), {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

/** Kort numerisk dato, fx "05.03.2026". */
export function formatNumericDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(currentLocale(), { dateStyle: 'short' })
}

/** Kort numerisk dato + klokkeslæt, fx "05.03.2026 14.30". */
export function formatNumericDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(currentLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** Dag og måned uden år, fx "5. marts". */
export function formatDayMonth(value: string | Date): string {
  return new Date(value).toLocaleDateString(currentLocale(), {
    day: 'numeric',
    month: 'long',
  })
}

/** Forkortet dag og måned, fx "5. mar". Bruges hvor pladsen er trang. */
export function formatShortDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(currentLocale(), {
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Dag/måned + klokkeslæt uden år, fx "05.03 14.30". Bruges til
 * beskeder, hvor året sjældent er interessant.
 * dateStyle kan ikke udtrykke "uden år", så felterne sættes eksplicit.
 */
export function formatDayMonthTime(value: string | Date): string {
  return new Date(value).toLocaleString(currentLocale(), {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Tal med lokalt tusindtalsseparator, fx "20.000". */
export function formatNumber(value: number): string {
  return value.toLocaleString(currentLocale())
}

/** Tal med højst `maxFractionDigits` decimaler, fx "12,5". */
export function formatDecimal(value: number, maxFractionDigits = 1, locale = currentLocale()): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxFractionDigits }).format(value)
}

/** Procent med mellemrum før tegnet, fx "12,5 %". */
export function formatPercent(value: number, maxFractionDigits = 1, locale = currentLocale()): string {
  return `${formatDecimal(value, maxFractionDigits, locale)} %`
}

/** Dag, forkortet måned og år, fx "5. mar. 2026". */
export function formatMediumDate(value: string | Date, locale = currentLocale()): string {
  return new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Dag og måned som tal uden år, fx "5.3.". Til korte periode-etiketter. */
export function formatNumericDayMonth(value: string | Date, locale = currentLocale()): string {
  return new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })
}

/** Kort periode, fx "5. mar – 9. mar". En manglende dato vises som `missing`. */
export function formatShortDateRange(start: string | null, end: string | null, missing = '—'): string {
  return `${start ? formatShortDate(start) : missing} – ${end ? formatShortDate(end) : missing}`
}
