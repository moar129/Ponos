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
