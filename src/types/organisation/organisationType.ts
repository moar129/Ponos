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
