// Simpel type til de organisations-data vi henter til en dropdown/vælger.
// Indeholder kun det UI'en har brug for - ikke hele organisations-rækken
// (fx ikke created_at, som ikke er relevant her).
export interface Organisation {
  id: string
  name: string
  color: string | null   // hex, fx '#C7975D' — null = ingen valgt, falder tilbage til standard accent
}

export interface UpdateOrganisationInput {
  name: string
  color?: string | null
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

// Props til DeleteOrganisationControl, flyttet fra OrganisationPage.tsx
// ind i OrganisationAdminPanel.tsx (US-65).
export interface DeleteOrganisationControlProps {
    membership: MyMembership
    onDeleted: (organisationName: string, wasActive: boolean, newActiveOrganisation: Organisation | null) => void
}

// Props til komponenter flyttet fra OrganisationPage.tsx ind i
// OrganisationTab.tsx (US-65).
export interface MembershipRowProps {
    membership: MyMembership
    onLeft: (organisationName: string, wasActive: boolean, newActiveOrganisation: Organisation | null) => void
}

export interface CreateOrganisationSectionProps {
    // US-60: den nyoprettede organisation bliver altid brugerens aktive
    // organisation med det samme (også ved en 2., 3., ...) - kaldes efter
    // succesfuld oprettelse, så den overordnede fane kan vise en besked og
    // hoppe over på "Organisation"-underfanen, hvor den nye (nu aktive)
    // organisation vises.
    onCreated: (organisationName: string) => void
}

// Props til OrganisationPickerComponent - søgbar erstatning for en almindelig
// <select> ved "Anmod om medlemskab" (US-05), så listen forbliver brugbar
// selvom antallet af organisationer vokser.
export interface OrganisationPickerComponentProps {
    organisations: Organisation[]
    isLoading: boolean
    value: string
    onChange: (organisationId: string) => void
}
