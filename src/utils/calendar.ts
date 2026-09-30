// src/utils/calendar.ts
//
// Ét sted til lokale kalenderberegninger. Dato-nøglen (YYYY-MM-DD),
// ugestart, kvartalsstart og dag-antal lå før i 3-4 kopier fordelt på
// statistik-hooket, snapshot-utils og opgavepanelerne.
//
// Alt regnes i lokal tid. toISOString() er UTC og giver "i går" mellem
// midnat og 01:00/02:00 i Danmark - brug derfor toDateKey, ikke den.

export const DAY_MS = 24 * 60 * 60 * 1000

export function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Mandagen i den uge `date` ligger i. */
export function startOfWeek(date: Date): Date {
    return addDays(date, -((date.getDay() + 6) % 7))
}

/** Kvartalet (1-4) `date` ligger i. */
export function quarterOf(date: Date): number {
    return Math.floor(date.getMonth() / 3) + 1
}

export function startOfQuarter(date: Date): Date {
    return new Date(date.getFullYear(), (quarterOf(date) - 1) * 3, 1)
}

/** Antal kalenderdage fra start til og med end. */
export function inclusiveDayCount(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
}

/**
 * Sidste dag der er med i en periode, hvis slut er eksklusiv (snapshots
 * og statistik-RPC'en gemmer [start, slut) - slut er dagen efter).
 */
export function lastIncludedDay(exclusiveEnd: string): Date {
    return new Date(Date.parse(exclusiveEnd) - 1)
}

/**
 * Lokal 'YYYY-MM-DD' - samme format som <input type="date"> og
 * URL-parametre, så almindelig strengsammenligning virker.
 */
export function toDateKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
}

/** 'YYYY-MM-DD' -> lokal midnat; null for alt der ikke er en rigtig dato. */
export function parseDateKey(value: string | null | undefined): Date | null {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return null
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    return toDateKey(date) === value ? date : null
}

/** I dag som lokal dato-nøgle, fx til min= på et datofelt. */
export function todayDateKey(): string {
    return toDateKey(new Date())
}
