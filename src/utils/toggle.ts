// src/utils/toggle.ts
//
// Tilføj/fjern ét element i et valg (checkbokse, udvidede træ-noder).
// Returnerer altid en ny samling, så den kan gå direkte i setState.

export function toggleInArray<T>(items: readonly T[], item: T): T[] {
    return items.includes(item) ? items.filter((existing) => existing !== item) : [...items, item]
}

export function toggleInSet<T>(set: ReadonlySet<T>, item: T): Set<T> {
    const next = new Set(set)
    if (next.has(item)) next.delete(item)
    else next.add(item)
    return next
}
