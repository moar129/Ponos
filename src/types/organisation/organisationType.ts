// Simpel type til de organisations-data vi henter til en dropdown/vælger.
// Indeholder kun det UI'en har brug for - ikke hele organisations-rækken
// (fx ikke created_at, som ikke er relevant her).
export interface Organisation {
    id: string
    name: string
}
