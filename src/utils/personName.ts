// src/utils/personName.ts
//
// Ét sted til at vise en persons navn. Før lå initialer 8 steder med 3
// forskellige regler, og `${first} ${last}`.trim() ~15 steder - nogle
// uden ?? '', så "null null" kunne slippe igennem.

/** "Anna Hansen" - tom streng hvis begge mangler (UI'en viser så sin egen fallback). */
export function formatFullName(firstName?: string | null, lastName?: string | null): string {
  return `${firstName ?? ''} ${lastName ?? ''}`.trim()
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.trim().charAt(0) ?? ''
  const last = lastName?.trim().charAt(0) ?? ''
  const initials = `${first}${last}`.toUpperCase()
  return initials || '?'
}

/** Initialer fra et samlet navn, fx et gruppenavn eller "Anna Hansen" -> "AH". */
export function getInitialsFromName(name?: string | null): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return getInitials(words[0], words.length > 1 ? words[words.length - 1] : undefined)
}

interface SearchablePerson {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  roleName?: string | null
}

/** Personer hvis navn, email eller rolle indeholder søgeteksten (store/små bogstaver ignoreres). */
export function filterPeople<T extends SearchablePerson>(people: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return people
  return people.filter((person) =>
    [formatFullName(person.firstName, person.lastName), person.email, person.roleName]
      .some((value) => (value ?? '').toLowerCase().includes(q)),
  )
}
