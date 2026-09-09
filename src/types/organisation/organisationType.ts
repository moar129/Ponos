// Simpel type til de organisations-data vi henter til en dropdown/vælger.
// Indeholder kun det UI'en har brug for - ikke hele organisations-rækken
// (fx ikke created_at, som ikke er relevant her).
export interface Organisation {
    id: string
    name: string
}

// De felter en administrator selv må ændre. Organisations-tabellen har pt.
// kun 'name' - udvides denne type senere, hvis der tilføjes flere
// redigerbare felter til organisations-tabellen.
export interface UpdateOrganisationInput {
    name: string
}

// Felter til at oprette en ny organisation (US-58).
export interface CreateOrganisationInput {
    name: string
}

// Et af brugerens medlemskaber (US-59) - til listen "Mine organisationer"
// og til at vise/vælge hvilken der er aktiv. roleName er null, hvis
// brugeren endnu ikke har fået tildelt en rolle i den organisation.
// isAdmin/memberCount (US-64) styrer "Slet organisation"-knappen og dens
// bekræft-tekst - kun klient-side visning, reel håndhævelse ligger i
// delete_organisation-RPC'en.
export interface MyMembership {
    organisationId: string
    organisationName: string
    roleName: string | null
    isActive: boolean
    isAdmin: boolean
    memberCount: number
}
