// Brugerens egen profil, som den vises på /bruger.
// activeOrganisationId er brugerens AKTIVE organisation (US-59) - ikke
// nødvendigvis den eneste, brugeren er medlem af, se memberships. Rolle-
// og organisationsnavn hentes med, så UI'en kan vise dem uden et ekstra
// opslag. Begge er null, hvis brugeren ikke har en aktiv organisation /
// ikke har fået tildelt en rolle dér.
export interface Profile {
    id: string
    firstName: string
    lastName: string
    email: string
    description: string | null
    urlPicture: string | null
    activeOrganisationId: string | null
    organisationName: string | null
    roleId: string | null
    roleName: string | null
}

// De felter brugeren selv må ændre. Bevidst uden role_id,
// organisation_id, email og note_admin: rolle/organisation blokeres
// server-side af trigger + RLS, email hører til Supabase Auth, og
// note_admin er administratorens felt.
export interface UpdateProfileInput {
    firstName: string
    lastName: string
    description: string | null
    urlPicture: string | null
}
